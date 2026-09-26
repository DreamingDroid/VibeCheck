import { Pool } from 'pg';
import { config } from './config';
import { getChatModel } from './rag';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// ── 1. Deterministic Fast-Filter Rules ─────────────────────────────────────────

// ── 1. Deterministic Fast-Filter Rules ─────────────────────────────────────────

// Comprehensive list of profanities, slurs, swear words, and derogatory terms across English, Telugu, Hindi, Tamil, Kannada, and regional transliterations
const BLOCKED_WORDS = [
  // English & Global Slurs
  'fuck', 'fck', 'f*ck', 'fuk', 'fucking', 'shit', 'sh*t', 'bitch', 'b*tch', 'bastard', 'asshole',
  'dick', 'pussy', 'cock', 'cunt', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard',

  // Telugu (Romanized / Transliterated Slang & Swear Words)
  'dengu', 'dengutha', 'denguthara', 'dengey', 'dengichuko', 'dengaleka', 'dengudu',
  'lanja', 'lanjakodaka', 'lanjakoduku', 'lanjamunda', 'lanjakompa', 'lanjodka',
  'munda', 'mundamopi', 'mundampey', 'vedhava',
  'modda', 'moddalo', 'moddara', 'moddagudu', 'moddalo vibe',
  'puku', 'pooku', 'pukulo', 'pukulodi', 'erripuku', 'erripooku', 'erripappa', 'yerripuku',
  'gudha', 'guddha', 'gudhalo', 'guddhala', 'gudhabalaga',
  'bevarsi', 'bevarse', 'bolli', 'bongu', 'dhonga',

  // Telugu (Native Script)
  'దెంగు', 'దెంగుతా', 'దెంగుతారు', 'దెంగేయ్', 'లంజ', 'లంజకొడుకా', 'లంజకొడుకు', 'లంజముండ',
  'ముండ', 'ముండమోపి', 'మొడ్డ', 'మొడ్డలో', 'మొడ్డగుడు', 'పూకు', 'పూకులో', 'ఎర్రిపూకు', 'ఎర్రిపప్ప',
  'గుద్ద', 'గుద్దలో', 'బేవార్స్', 'వెధవ',

  // Hindi / Urdu (Romanized & Transliterated)
  'chutiya', 'chutiye', 'choot', 'chut', 'bhenchod', 'behenchod', 'bc', 'madarchod', 'mc',
  'gandu', 'gaand', 'gaandu', 'gandmasti', 'laude', 'loda', 'lavda', 'lund',
  'bhosadi', 'bhosadike', 'bhosdike', 'bsdk', 'harami', 'kamina', 'kaminey', 'randi', 'kuttiya',

  // Hindi (Devanagari Script)
  'चूतिया', 'चूतिये', 'बहनचोद', 'मादरचोद', 'गांडू', 'गांड', 'लौड़े', 'लवड़ा', 'लंड',
  'भोसड़ी', 'भोसड़ीके', 'हरामी', 'कमीने', 'रांडी', 'कुतिया',

  // Tamil / Kannada / Malayalam
  'thevidiya', 'otha', 'ommala', 'poda panni', 'kena', 'sunni', 'pundai',
  'bolimagane', 'huchanaayi', 'soole', 'katthe', 'kallan',
  'myre', 'myran', 'kunna', 'oombu', 'thendi', 'pooru'
];

const SCAM_PATTERNS = [
  /\b(earn\s*\$?\d+\s*(per\s*day|daily|weekly|from\s*home))\b/i,
  /\b(crypto\s*giveaway|free\s*bitcoin|double\s*your\s*money|100%\s*guaranteed\s*returns)\b/i,
  /\b(telegram\s*signal|whatsapp\s*leaks|casino\s*hack|betting\s*tips)\b/i,
  /\b(escort\s*service|call\s*girls?|massages?\s*with\s*extra)\b/i
];

export interface FastFilterResult {
  passed: boolean;
  reason?: string;
  flaggedWords: string[];
}

export function runFastFilter(text: string): FastFilterResult {
  if (!text || typeof text !== 'string') {
    return { passed: true, flaggedWords: [] };
  }

  const cleanText = text.toLowerCase();
  const flaggedWords: string[] = [];

  // 1. Check blocked words (handles both word boundaries and embedded substrings)
  for (const word of BLOCKED_WORDS) {
    const isAscii = /^[\x00-\x7F]*$/.test(word);
    const regex = isAscii ? new RegExp(`\\b${word}\\b`, 'i') : new RegExp(word, 'i');
    if (regex.test(cleanText)) {
      flaggedWords.push(word);
    }
  }

  // 2. Check scam / illicit patterns
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(cleanText)) {
      flaggedWords.push('suspicious_promotional_pattern');
    }
  }

  if (flaggedWords.length > 0) {
    return {
      passed: false,
      reason: `Content contains prohibited terms or regional profanity: ${flaggedWords.join(', ')}`,
      flaggedWords,
    };
  }

  return { passed: true, flaggedWords: [] };
}

// ── 2. AI Scrutiny & Guardrail Types ─────────────────────────────────────────

export type ModerationDecision = 'auto_approve' | 'flag_for_review' | 'auto_reject';

export interface ModerationResult {
  is_safe: boolean;
  profanity_detected: boolean;
  quality_score: number; // 0 to 100
  decision: ModerationDecision;
  reason: string;
  flags: string[];
  fast_filter_passed: boolean;
}

// ── 3. AI Scrutiny Core Logic ───────────────────────────────────────────────

const MODERATION_SYSTEM_PROMPT = `You are the Lead Trust & Safety AI Agent for "VibeCheckSpace", a city-wide social and local events discovery platform.
You are fully multilingual and understand English, Telugu (both native script and Romanized/English transliteration slang like "dengu", "lanja", "modda", "pooku", "erripuk", "gudha"), Hindi/Urdu, Tamil, Kannada, Malayalam, and other regional Indian dialects.

Your job is to scrutinize user and organizer submissions (event listings, organizer applications, support requests).

Scrutiny Criteria:
1. Safety & Language: Absolute zero tolerance for hate speech, vulgarity, swearing, sexual slurs, casteist/religious abuses, or offensive colloquial slang in ANY language or script (English, Telugu, Hindi, etc.).
2. Anti-Scam: Detect Ponzi schemes, MLM, fake giveaways, predatory services, betting links, or misleading ticket sales.
3. Content Quality & Sanity:
   - For Events: Clear title, coherent description, sensible timing and venue, realistic category alignment.
   - For Organizers: Authentic brand identity, clear vision for community gatherings, valid social/web presence.

Output Format:
You MUST respond with pure JSON only without markdown code blocks, conforming to this exact schema:
{
  "is_safe": boolean,
  "profanity_detected": boolean,
  "quality_score": number, // 0 to 100 (>=80: High Quality/Safe, 50-79: Needs Human Review, <50: Poor/Scam/Abusive)
  "decision": "auto_approve" | "flag_for_review" | "auto_reject",
  "reason": "Brief, constructive explanation of the decision",
  "flags": ["list", "of", "detected", "issues"]
}`;

export async function evaluateContentWithAI(
  entityType: 'event' | 'organizer' | 'ticket' | 'review',
  payload: Record<string, any>
): Promise<ModerationResult> {
  const combinedText = Object.values(payload)
    .filter(val => typeof val === 'string')
    .join('\n');

  // Layer 1: Run Fast Deterministic Filter
  const fastCheck = runFastFilter(combinedText);
  if (!fastCheck.passed) {
    return {
      is_safe: false,
      profanity_detected: true,
      quality_score: 0,
      decision: 'auto_reject',
      reason: fastCheck.reason || 'Prohibited language or scam pattern detected.',
      flags: fastCheck.flaggedWords,
      fast_filter_passed: false,
    };
  }

  // Layer 2: Contextual AI Scrutiny
  try {
    const chat = getChatModel();
    const userPrompt = `Entity Type: ${entityType}\nSubmission Data:\n${JSON.stringify(payload, null, 2)}`;

    const response = await chat.invoke([
      new SystemMessage(MODERATION_SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ]);

    let rawText = response.content;
    if (typeof rawText !== 'string') {
      rawText = JSON.stringify(rawText);
    }

    // Clean up potential markdown ticks from output
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(rawText);

    let decision: ModerationDecision = 'flag_for_review';
    const score = Math.max(0, Math.min(100, Number(parsed.quality_score) || 50));

    if (!parsed.is_safe || parsed.profanity_detected || score < 50) {
      decision = 'auto_reject';
    } else if (score >= 80) {
      decision = 'auto_approve';
    } else {
      decision = 'flag_for_review';
    }

    return {
      is_safe: Boolean(parsed.is_safe),
      profanity_detected: Boolean(parsed.profanity_detected),
      quality_score: score,
      decision,
      reason: parsed.reason || (decision === 'auto_approve' ? 'Content meets all safety and quality standards.' : 'Requires manual admin verification.'),
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      fast_filter_passed: true,
    };
  } catch (error) {
    console.error('[Moderation] AI evaluation error (falling back to manual review):', error);
    // Graceful fallback to flag for review if AI fails
    return {
      is_safe: true,
      profanity_detected: false,
      quality_score: 70,
      decision: 'flag_for_review',
      reason: 'AI scrutiny service unavailable; queued for manual review.',
      flags: ['ai_timeout_fallback'],
      fast_filter_passed: true,
    };
  }
}

// ── 4. Multimodal Image & Flyer Safety Scrutiny ─────────────────────────────

const IMAGE_MODERATION_PROMPT = `You are the Lead Visual Trust & Safety AI Agent for "VibeCheckSpace" (an events and community discovery platform).
Inspect this uploaded flyer / event poster / user image for community guidelines violations.

Scrutiny Criteria:
1. Nudity & Sexual Content: Zero tolerance for explicit nudity, pornography, exposed private parts, or sexually explicit graphics.
2. Violence & Gore: Zero tolerance for graphic violence, gore, weapons being brandished in a threatening manner, or self-harm.
3. Hate Speech & Symbols: Check for hate group logos, offensive text, or abusive overlays in any language.
4. Dangerous / Illicit: Hard drugs, illegal weapons, or fraudulent promotions.

Output Format (Pure JSON only without markdown formatting):
{
  "is_safe": boolean,
  "nudity_detected": boolean,
  "violence_detected": boolean,
  "hate_symbols_detected": boolean,
  "decision": "auto_approve" | "auto_reject",
  "reason": "Brief, constructive explanation",
  "flags": ["list", "of", "detected", "violations"]
}`;

export interface ImageModerationResult {
  is_safe: boolean;
  decision: 'auto_approve' | 'auto_reject';
  reason: string;
  flags: string[];
}

export async function evaluateImageWithAI(base64OrUrl: string): Promise<ImageModerationResult> {
  if (!base64OrUrl || typeof base64OrUrl !== 'string') {
    return { is_safe: true, decision: 'auto_approve', reason: 'No image payload provided.', flags: [] };
  }

  try {
    const chat = getChatModel();
    const formattedUrl = base64OrUrl.startsWith('data:') || base64OrUrl.startsWith('http')
      ? base64OrUrl
      : `data:image/jpeg;base64,${base64OrUrl}`;

    const response = await chat.invoke([
      new SystemMessage(IMAGE_MODERATION_PROMPT),
      new HumanMessage({
        content: [
          { type: 'text', text: 'Please analyze this uploaded event image against community safety guidelines.' },
          { type: 'image_url', image_url: { url: formattedUrl } },
        ],
      }),
    ]);

    let rawText = response.content;
    if (typeof rawText !== 'string') rawText = JSON.stringify(rawText);
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(rawText);
    const isSafe = Boolean(parsed.is_safe) && !parsed.nudity_detected && !parsed.violence_detected && !parsed.hate_symbols_detected;

    return {
      is_safe: isSafe,
      decision: isSafe ? 'auto_approve' : 'auto_reject',
      reason: parsed.reason || (isSafe ? 'Image meets all community safety guidelines.' : 'Image violates community guidelines.'),
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (err: any) {
    console.error('[Moderation] Image AI evaluation error:', err.message);
    // If vision call fails/times out, allow upload but flag for safety
    return {
      is_safe: true,
      decision: 'auto_approve',
      reason: 'Visual check skipped due to service timeout.',
      flags: ['vision_ai_skipped'],
    };
  }
}

// ── 5. Audit Logger Helper ──────────────────────────────────────────────────

export async function logModerationResult(
  pool: Pool,
  params: {
    entity_type: string;
    entity_id?: string;
    submitted_by?: string;
    content_payload: Record<string, any>;
    result: ModerationResult | ImageModerationResult;
  }
) {
  try {
    const qualityScore = 'quality_score' in params.result ? params.result.quality_score : (params.result.is_safe ? 100 : 0);
    const fastFilterPassed = 'fast_filter_passed' in params.result ? params.result.fast_filter_passed : true;

    await pool.query(
      `INSERT INTO moderation_logs (
        entity_type, entity_id, submitted_by, content_payload,
        fast_filter_passed, ai_score, ai_decision, flags, ai_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.entity_type,
        params.entity_id || null,
        params.submitted_by || null,
        JSON.stringify(params.content_payload),
        fastFilterPassed,
        qualityScore,
        params.result.decision,
        JSON.stringify(params.result.flags),
        params.result.reason,
      ]
    );
  } catch (err) {
    console.error('[Moderation] Failed to record moderation log:', err);
  }
}

// ── 6. Instagram Host Intelligence Evaluator ───────────────────────────────

export interface InstagramHostReport {
  estimated_past_events_count: number;
  primary_vibe_categories: string[];
  audience_engagement_level: 'low' | 'moderate' | 'high' | 'viral';
  host_trust_score: number; // 0 to 100
  summary_insights: string;
  has_hosted_offline_events: boolean;
  monetization_risk_level: 'low' | 'medium' | 'high';
}

const INSTAGRAM_ANALYSIS_PROMPT = `You are VibeCheck's autonomous Trust & Safety Agent assessing an Instagram creator/business account applying to organize offline community events.
You are given the account details and recent post captions/timestamps.

Your task:
1. Estimate the number of past physical/offline events (workshops, parties, treks, meetups, popups, jam sessions) referenced in the captions.
2. Identify primary vibe/event categories (e.g. Techno, Trekking, Art, Board Games, Networking, Music, Fitness).
3. Evaluate overall trust score (0-100) based on authenticity, past event track record, and absence of scam signals.
4. Assess monetization risk level ('low', 'medium', 'high') if this host charges attendees for tickets.
5. Provide a 2-3 sentence summary insight.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "estimated_past_events_count": number,
  "primary_vibe_categories": string[],
  "audience_engagement_level": "low" | "moderate" | "high" | "viral",
  "host_trust_score": number,
  "summary_insights": string,
  "has_hosted_offline_events": boolean,
  "monetization_risk_level": "low" | "medium" | "high"
}`;

export async function generateOrganizerInstagramIntelligence(params: {
  username: string;
  account_name?: string;
  followers_count?: number;
  media_count?: number;
  recent_posts?: Array<{ caption?: string; timestamp?: string; media_type?: string }>;
}): Promise<InstagramHostReport> {
  const postsSummary = (params.recent_posts || [])
    .slice(0, 15)
    .map((p, idx) => `Post ${idx + 1} (${p.timestamp || 'N/A'}, ${p.media_type || 'image'}): ${(p.caption || 'No caption').replace(/\n+/g, ' ').slice(0, 250)}`)
    .join('\n\n');

  try {
    const model = getChatModel();
    const userPrompt = `Instagram Account: @${params.username}
Account Name: ${params.account_name || params.username}
Followers: ${params.followers_count ?? 'Unknown'}
Total Media Count: ${params.media_count ?? 'Unknown'}

Recent Posts (${(params.recent_posts || []).length}):
${postsSummary || 'No recent post captions available via API.'}

Analyze the creator's host experience and return the JSON assessment.`;

    const response = await model.invoke([
      new SystemMessage(INSTAGRAM_ANALYSIS_PROMPT),
      new HumanMessage(userPrompt),
    ]);

    let rawText = response.content;
    if (typeof rawText !== 'string') rawText = JSON.stringify(rawText);
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(rawText);

    return {
      estimated_past_events_count: Math.max(0, Number(parsed.estimated_past_events_count) || 0),
      primary_vibe_categories: Array.isArray(parsed.primary_vibe_categories) ? parsed.primary_vibe_categories : ['Community'],
      audience_engagement_level: ['low', 'moderate', 'high', 'viral'].includes(parsed.audience_engagement_level) ? parsed.audience_engagement_level : 'moderate',
      host_trust_score: Math.min(100, Math.max(0, Number(parsed.host_trust_score) || 75)),
      summary_insights: parsed.summary_insights || `Active creator @${params.username} with verified community presence.`,
      has_hosted_offline_events: Boolean(parsed.has_hosted_offline_events),
      monetization_risk_level: ['low', 'medium', 'high'].includes(parsed.monetization_risk_level) ? parsed.monetization_risk_level : 'low',
    };
  } catch (err: any) {
    console.error('[Moderation] Instagram AI intelligence error:', err.message);
    const hasFollowers = (params.followers_count || 0) >= 1000;
    return {
      estimated_past_events_count: hasFollowers ? 2 : 0,
      primary_vibe_categories: ['Community', 'Social'],
      audience_engagement_level: hasFollowers ? 'moderate' : 'low',
      host_trust_score: hasFollowers ? 80 : 65,
      summary_insights: `Verified Instagram business account @${params.username}. AI deep analysis defaulted.`,
      has_hosted_offline_events: hasFollowers,
      monetization_risk_level: 'low',
    };
  }
}

