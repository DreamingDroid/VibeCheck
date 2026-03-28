import { Request, Response } from 'express';
import { Pool } from 'pg';
import { handleEventQuery } from './rag';

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

    // ── NEW USER: Start onboarding ──────────────────────────────────────────
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO users (phone_number, preferences)
         VALUES ($1, jsonb_build_object('onboarding_step', 'awaiting_name'))`,
        [from]
      );
      await sendWhatsAppMessage(phoneNumberId, from,
        `👋 Hey there! Welcome to *Vizag Vibes* — your go-to guide for events in Visakhapatnam! 🎉\n\nFirst things first, what's your name?`
      );
      return;
    }

    const user = rows[0];
    const prefs = user.preferences ?? {};
    const step: string = prefs.onboarding_step ?? 'complete';

    // ── ONBOARDING: Step 1 — Awaiting name ────────────────────────────────
    if (step === 'awaiting_name') {
      const name = msgBody;
      await pool.query(
        `UPDATE users SET name = $1,
          preferences = jsonb_set(preferences, '{onboarding_step}', '"awaiting_categories"')
         WHERE phone_number = $2`,
        [name, from]
      );
      await sendWhatsAppMessage(phoneNumberId, from,
        `Nice to meet you, *${name}*! 🙌\n\nWhat kind of events are you into? Reply with the *numbers* of your interests (e.g. _1, 3, 5_):\n\n${CATEGORIES_MENU}\n\nYou can pick multiple!`
      );
      return;
    }

    // ── ONBOARDING: Step 2 — Awaiting categories ───────────────────────────
    if (step === 'awaiting_categories') {
      const numbers = msgBody.split(/[\s,]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= CATEGORIES.length);
      const chosen = [...new Set(numbers.map(n => CATEGORIES[n - 1]))];

      if (chosen.length === 0) {
        await sendWhatsAppMessage(phoneNumberId, from,
          `Hmm, I didn't catch that! Please reply with numbers from 1 to ${CATEGORIES.length}.\n\nFor example: _1, 3, 7_\n\n${CATEGORIES_MENU}`
        );
        return;
      }

      await pool.query(
        `UPDATE users SET
          preferences = jsonb_set(
            jsonb_set(preferences, '{categories}', $1::jsonb),
            '{onboarding_step}', '"complete"'
          )
         WHERE phone_number = $2`,
        [JSON.stringify(chosen), from]
      );

      await sendWhatsAppMessage(phoneNumberId, from,
        `Perfect! I've saved your interests: *${chosen.join(', ')}* 🎯\n\nYou're all set! Now just ask me anything — like:\n_"Any music events this weekend?"_ or _"What's happening at Rushikonda?"_\n\n🔔 You'll also get alerts when new ${chosen[0]} events hit Vizag!`
      );
      return;
    }

    // ── NORMAL FLOW: Silently update preferences from message ──────────────
    await updatePreferencesFromMessage(pool, from, msgBody);

    // ── NORMAL FLOW: RAG query ─────────────────────────────────────────────
    const ragResult = await handleEventQuery(pool, { query: msgBody, userId: from });
    await sendWhatsAppMessage(phoneNumberId, from, ragResult.answer);

  } catch (error) {
    console.error('[WhatsApp] Error handling message:', error);
  }
}

// ─── Silently detect category keywords and update user preferences ────────────
async function updatePreferencesFromMessage(pool: Pool, phoneNumber: string, message: string) {
  const lower = message.toLowerCase();
  const mentioned = CATEGORIES.filter(cat => lower.includes(cat.toLowerCase()));
  if (mentioned.length === 0) return;

  try {
    for (const cat of mentioned) {
      await pool.query(
        `UPDATE users SET
          preferences = jsonb_set(
            COALESCE(preferences, '{}'::jsonb),
            '{categories}',
            COALESCE(preferences->'categories', '[]'::jsonb) || $1::jsonb
          )
         WHERE phone_number = $2
           AND NOT (COALESCE(preferences->'categories', '[]'::jsonb) @> $1::jsonb)`,
        [JSON.stringify([cat]), phoneNumber]
      );
    }
    console.log(`[Personalization] Updated categories for ${phoneNumber}: ${mentioned.join(', ')}`);
  } catch (err) {
    console.error('[Personalization] Failed to update preferences:', err);
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
