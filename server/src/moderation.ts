import { Pool } from 'pg';
import { config } from './config';
import { getChatModel } from './rag';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// ── 1. Deterministic Fast-Filter Rules ─────────────────────────────────────────

// Common profanities, slurs, and explicit swear words (English and transliterations)
const BLOCKED_WORDS = [
  'fuck', 'fck', 'f*ck', 'shit', 'sh*t', 'bitch', 'b*tch', 'bastard', 'asshole',
  'dick', 'pussy', 'cock', 'cunt', 'slut', 'whore', 'nigger', 'nigga', 'faggot',
  'chutiya', 'bhenchod', 'madarchod', 'gandu', 'laude', 'harami', 'kamina',
  'dengu', 'lanja', 'munda', 'modda', 'puku', 'erripappa'
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

  // 1. Check blocked words (word boundary or leetspeak match)
  for (const word of BLOCKED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
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
      reason: `Content contains prohibited terms or suspicious patterns: ${flaggedWords.join(', ')}`,
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
Your job is to scrutinize user and organizer submissions (event listings, organizer applications, support requests).

Scrutiny Criteria:
1. Safety & Language: Zero tolerance for hate speech, harassment, vulgarity, explicit sexual content, or dangerous illegal activities.
2. Anti-Scam: Detect Ponzi schemes, MLM, fake giveaways, predatory services, or misleading ticket sales.
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

// ── 4. Audit Logger Helper ──────────────────────────────────────────────────

export async function logModerationResult(
  pool: Pool,
  params: {
    entity_type: string;
    entity_id?: string;
    submitted_by?: string;
    content_payload: Record<string, any>;
    result: ModerationResult;
  }
) {
  try {
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
        params.result.fast_filter_passed,
        params.result.quality_score,
        params.result.decision,
        JSON.stringify(params.result.flags),
        params.result.reason,
      ]
    );
  } catch (err) {
    console.error('[Moderation] Failed to record moderation log:', err);
  }
}
