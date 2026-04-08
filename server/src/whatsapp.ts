import { Request, Response } from 'express';
import { Pool } from 'pg';
import { handleEventQuery, extractAndSavePreferences } from './rag';

// ─── Category definitions ────────────────────────────────────────────────────
const CATEGORIES = ['Sports', 'Arts', 'Education', 'Spiritual', 'Music', 'Food', 'Wellness', 'Indie', 'Techno', 'General'];

const CATEGORIES_MENU = CATEGORIES
  .map((cat, i) => `${i + 1}. ${cat}`)
  .join('\n');

// ─── Webhook verification ─────────────────────────────────────────────────────
export function verifyWebhook(req: Request, res: Response) {
  const challenge = req.query['hub.challenge'];
  if (challenge) {
    console.log(`[Webhook] Verified. Challenge: ${challenge}`);
    res.status(200).send(challenge);
  } else {
    res.status(200).send('Webhook awake.');
  }
}

// ─── Main message handler ─────────────────────────────────────────────────────
export async function handleIncomingMessage(req: Request, res: Response, pool: Pool) {
  const body = req.body;
  console.log(`\n\n--- INCOMING WEBHOOK PAYLOAD ---\n`, JSON.stringify(body, null, 2));

  if (!body.object) return res.sendStatus(404);

  const entry = body.entry?.[0]?.changes?.[0]?.value;
  const message = entry?.messages?.[0];

  if (!message) return res.sendStatus(200); // Status update, not a message

  const phoneNumberId = entry.metadata.phone_number_id;
  const from = message.from;
  const msgBody: string = message.text?.body?.trim() ?? '';

  if (!msgBody) return res.sendStatus(200);

  console.log(`[WhatsApp] Message from ${from}: "${msgBody}"`);

  // Respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    // Fetch user record
    const { rows } = await pool.query(
      `SELECT phone_number, name, preferences FROM users WHERE phone_number = $1`,
      [from]
    );

    let isNewUser = false;
    // Extract WhatsApp Profile Name from the Meta payload
    let userName = entry?.contacts?.[0]?.profile?.name ?? 'Friend';

    // ── NEW USER: Silent Onboarding ──────────────────────────────────────────
    if (rows.length === 0) {
      isNewUser = true;
      await pool.query(
        `INSERT INTO users (phone_number, name, preferences)
         VALUES ($1, $2, '{}'::jsonb)`,
        [from, userName]
      );
      console.log(`[Onboarding] Silently created new user: ${userName} (${from})`);
    } else {
      // Use their database name if they've explicitly updated it via the web later
      userName = rows[0].name || userName;
    }

    // ── NORMAL FLOW: AI Personalization Engine ──
    await extractAndSavePreferences(pool, from, msgBody);

    // ── NORMAL FLOW: RAG query ─────────────────────────────────────────────
    const ragResult = await handleEventQuery(pool, { query: msgBody, userId: from });
    
    let finalAnswer = ragResult.answer;
    
    // Append the tip for first-time users
    if (isNewUser) {
      finalAnswer += `\n\n💡 *Tip from Vizag Vibes:* To receive regular updates and alerts about new events you love, visit the VibeCheck website to set up your preferences!`;
    }

    await sendWhatsAppMessage(phoneNumberId, from, finalAnswer);

  } catch (error) {
    console.error('[WhatsApp] Error handling message:', error);
  }
}

// ─── Send a plain text WhatsApp message ──────────────────────────────────────
export async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';

  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log(`[Dev Mode] WhatsApp → ${to}:\n${text}\n`);
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      console.error('[WhatsApp] Send failed:', await response.text());
    } else {
      console.log(`[WhatsApp] Sent to ${to}`);
    }
  } catch (error) {
    console.error('[WhatsApp] Network error:', error);
  }
}
