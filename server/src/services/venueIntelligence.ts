import { config } from '../config';
import { Pool } from 'pg';

export interface DiscoveredVenueDetails {
  canonicalName: string;
  address: string;
  website: string | null;
  officialEmail: string | null;
  officialPhone: string | null;
  verificationChannel: 'email_domain_match' | 'admin_phone_required';
  confidenceScore: number;
  rationale: string;
}

/**
 * Expands shortened Google Maps URLs (e.g., maps.app.goo.gl) to effective target URLs
 */
export async function expandGoogleMapsUrl(shortUrl: string): Promise<string> {
  if (!shortUrl || typeof shortUrl !== 'string') return shortUrl;
  if (!shortUrl.includes('goo.gl') && !shortUrl.includes('maps.app.goo.gl')) {
    return shortUrl;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    return response.url || shortUrl;
  } catch (err: any) {
    console.warn('[VenueIntelligence] Failed to expand Google Maps URL:', err.message);
    return shortUrl;
  }
}

/**
 * Autonomously discovers verified venue contact details from Google Maps & Web via Gemini Grounding
 */
export async function discoverVenueIntelligence(
  pool: Pool,
  params: {
    locationName: string;
    city: string;
    googleMapsUrl?: string;
  }
): Promise<DiscoveredVenueDetails> {
  // 1. Expand Google Maps short link if present
  let resolvedUrl = params.googleMapsUrl || '';
  if (resolvedUrl && (resolvedUrl.includes('goo.gl') || resolvedUrl.includes('maps.app.goo.gl'))) {
    resolvedUrl = await expandGoogleMapsUrl(resolvedUrl);
  }

  // 2. Extract Place Name from URL if locationName is empty
  let cleanLocation = (params.locationName || '').trim();
  if (!cleanLocation && resolvedUrl) {
    const match = resolvedUrl.match(/\/place\/([^\/@]+)/i);
    if (match && match[1]) {
      cleanLocation = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
    }
  }

  const cleanCity = (params.city || '').trim();

  // 3. Check existing verified database cache (only if valid search query exists)
  if (cleanLocation && cleanLocation.length >= 3) {
    try {
      const cached = await pool.query(
        `SELECT name, address, official_email, official_phone, google_place_id 
         FROM venues 
         WHERE LOWER(city) = LOWER($1) AND (LOWER(name) = LOWER($2) OR LOWER(address) LIKE LOWER($3))
         LIMIT 1`,
        [cleanCity, cleanLocation, `%${cleanLocation}%`]
      );

      if (cached.rows.length > 0 && cached.rows[0].official_email) {
        const row = cached.rows[0];
        return {
          canonicalName: row.name,
          address: row.address || `${cleanLocation}, ${cleanCity}`,
          website: null,
          officialEmail: row.official_email,
          officialPhone: row.official_phone || null,
          verificationChannel: 'email_domain_match',
          confidenceScore: 95,
          rationale: 'Retrieved from verified VibeCheck Persistent Venue Directory.'
        };
      }
    } catch (err: any) {
      console.warn('[VenueIntelligence] Cache lookup warning:', err.message);
    }
  }

  // 4. Autonomous AI Web Discovery via Gemini with Google Search Grounding
  const apiKey = config.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[VenueIntelligence] No GEMINI_API_KEY configured. Falling back to admin phone queue.');
    return {
      canonicalName: cleanLocation,
      address: `${cleanLocation}, ${cleanCity}`,
      website: null,
      officialEmail: null,
      officialPhone: null,
      verificationChannel: 'admin_phone_required',
      confidenceScore: 30,
      rationale: 'AI discovery unavailable. Routed to Admin Call Queue.'
    };
  }

  const discoveryPrompt = `You are VibeCheck's Autonomous Venue Intelligence Agent.
Find the official contact details, official business email address, and official phone number of the physical venue:
Venue Name / Location: "${cleanLocation}"
City: "${cleanCity}"
${resolvedUrl ? `Google Maps Reference: "${resolvedUrl}"` : ''}

CRITICAL RULES FOR SECURITY:
1. "official_email": Must be the official venue domain email (e.g. info@gadirajupalace.com, reservations@ironhill.in) or verified booking email. If this is a small local cafe/bakery with NO official domain email, return null. Do NOT invent or guess generic emails.
2. "official_phone": Return the primary verified contact or landline/mobile number (e.g. "+91 7799933781").
3. "website": Official website URL if one exists, else null.
4. "address": Full physical address of the establishment.

Respond ONLY with a valid JSON object matching this schema:
{
  "canonical_name": string,
  "address": string,
  "website": string | null,
  "official_email": string | null,
  "official_phone": string | null,
  "confidence_score": number,
  "rationale": string
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: discoveryPrompt }] }],
      tools: [{ google_search: {} }]
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const data: any = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    let officialPhone = parsed.official_phone;
    if (Array.isArray(officialPhone)) {
      officialPhone = officialPhone[0] || null;
    }
    if (typeof officialPhone === 'string') {
      officialPhone = officialPhone.split(',')[0].trim();
    }

    const officialEmail = parsed.official_email ? String(parsed.official_email).trim() : null;
    const hasEmail = Boolean(officialEmail && officialEmail.includes('@') && !officialEmail.endsWith('@example.com'));

    let rawScore = Number(parsed.confidence_score) || (hasEmail ? 95 : 80);
    if (rawScore <= 10 && rawScore > 0) rawScore = rawScore * 10;
    const confidenceScore = Math.min(100, Math.max(10, Math.round(rawScore)));

    const discovered: DiscoveredVenueDetails = {
      canonicalName: parsed.canonical_name || cleanLocation,
      address: parsed.address || `${cleanLocation}, ${cleanCity}`,
      website: parsed.website || null,
      officialEmail: hasEmail ? officialEmail : null,
      officialPhone: officialPhone || null,
      verificationChannel: hasEmail ? 'email_domain_match' : 'admin_phone_required',
      confidenceScore,
      rationale: parsed.rationale || (hasEmail ? 'Verified official domain email discovered.' : 'No domain email found; verified phone routed for manual call authorization.')
    };

    // Auto-cache into venues table for fast subsequent lookups
    pool.query(
      `INSERT INTO venues (name, city, address, official_email, official_phone, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        discovered.canonicalName,
        cleanCity,
        discovered.address,
        discovered.officialEmail,
        discovered.officialPhone,
        Boolean(discovered.officialEmail)
      ]
    ).catch(err => console.warn('[VenueIntelligence] Cache save error:', err.message));

    return discovered;
  } catch (err: any) {
    console.error('[VenueIntelligence] AI Discovery error:', err.message);
    return {
      canonicalName: cleanLocation,
      address: `${cleanLocation}, ${cleanCity}`,
      website: null,
      officialEmail: null,
      officialPhone: null,
      verificationChannel: 'admin_phone_required',
      confidenceScore: 40,
      rationale: `Discovery error (${err.message}). Defaulted to Admin Call Queue.`
    };
  }
}
