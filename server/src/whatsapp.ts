import { Request, Response } from 'express';
import { Pool } from 'pg';
import { handleEventQuery, extractAndSavePreferences } from './rag';
import { insertEventRSVP } from './queries/events';
import { getUserByPhone, createUser, updateUserChatHistory } from './queries/users';
import { config } from './config';

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = ['Sports', 'Arts', 'Education', 'Spiritual', 'Music', 'Food', 'Wellness', 'Indie', 'Techno', 'General'];

const CATEGORIES_MENU = CATEGORIES
  .map((cat, i) => `${i + 1}. ${cat}`)
  .join('\n');

// ─── Webhook verification ──────────────────────────────────────────────────────
export function verifyWebhook(req: Request, res: Response) {
  const challenge = req.query['hub.challenge'];
  if (challenge) {
    console.log(`[Webhook] Verified. Challenge: ${challenge}`);
    res.status(200).send(challenge);
  } else {
    res.status(200).send('Webhook awake.');
  }
}

// ─── Main message handler ──────────────────────────────────────────────────────
export async function handleIncomingMessage(req: Request, res: Response, pool: Pool) {
  const body = req.body;
  console.log(`\n\n--- INCOMING WEBHOOK PAYLOAD ---\n`, JSON.stringify(body, null, 2));

  if (!body.object) return res.sendStatus(404);

  const entry = body.entry?.[0]?.changes?.[0]?.value;
  const message = entry?.messages?.[0];

  if (!message) return res.sendStatus(200); // Status update, not a message

  const phoneNumberId = entry.metadata.phone_number_id;
  const from = message.from;

  // ── Handle interactive list_reply (user tapped an event card) ──────────────
  const interactiveId = parseInteractiveReply(message);
  if (interactiveId && interactiveId.startsWith('rsvp_')) {
    res.sendStatus(200);
    const eventId = interactiveId.replace('rsvp_', '');
    try {
      await insertEventRSVP(pool, eventId, from);
      console.log(`[Interactive RSVP] ${from} booked event ${eventId}`);
      await sendWhatsAppMessage(
        phoneNumberId, from,
        `✅ *You're all set!* Your spot has been reserved. We'll see you there! 🎉\n\nReply anytime to discover more events.`
      );
    } catch (err) {
      console.error('[Interactive RSVP] DB error:', err);
    }
    return;
  }

  const msgBody: string = message.text?.body?.trim() ?? '';

  if (!msgBody) return res.sendStatus(200);

  console.log(`[WhatsApp] Message from ${from}: "${msgBody}"`);

  // Respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    // Fetch user record and their chat history
    let chatHistory: any[] = [];
    const user = await getUserByPhone(pool, from);

    let isNewUser = false;
    let userName = entry?.contacts?.[0]?.profile?.name ?? 'Friend';

    if (!user) {
      isNewUser = true;
      await createUser(pool, from, userName);
      console.log(`[Onboarding] Silently created new user: ${userName} (${from})`);
    } else {
      userName = user.name || userName;
      if (Array.isArray(user.chat_history)) {
        chatHistory = user.chat_history;
      }
    }

    // ── NORMAL FLOW: AI Personalization Engine ──
    // (Running asynchronously to avoid injecting extra LLM latency before responding)
    extractAndSavePreferences(pool, from, msgBody).catch(e => console.error(e));

    // Grab specific city constraint if the user synced it via Web Portal
    let syncedCity: string | undefined = undefined;
    if (user && typeof user.preferences === 'object') {
      syncedCity = user.preferences.city;
    }

    // ── NORMAL FLOW: RAG query ─────────────────────────────────────────────
    // Send standard query along with the conversational context slice to RAG
    const ragResult = await handleEventQuery(pool, { 
      query: msgBody, 
      userId: from,
      city: syncedCity,
      history: chatHistory
    });
    
    let finalAnswer = ragResult.answer;
    
    // Append the tip for first-time users
    if (isNewUser) {
      finalAnswer += `\n\n💡 *Tip from Vizag Vibes:* To receive reliable event alerts tied directly to your city and interests, link this number directly on our portal: https://vizagvibes.com/preferences`;
    }

    // Capture current turns into active memory and truncate
    chatHistory.push({ role: 'user', content: msgBody });
    chatHistory.push({ role: 'assistant', content: finalAnswer });
    
    // Sliding memory window: Keep only the most recent 6 interactions (3 turns)
    if (chatHistory.length > 6) {
      chatHistory = chatHistory.slice(chatHistory.length - 6);
    }

    // Save immediate memory to persistence base asynchronously
    updateUserChatHistory(pool, from, chatHistory)
      .catch(e => console.error('[Memory] Error saving immediate context:', e));

    // Send text answer first
    await sendWhatsAppMessage(phoneNumberId, from, finalAnswer);

    // Send interactive event cards if events were returned
    if (ragResult.events && ragResult.events.length > 0) {
      await sendInteractiveEventCards(phoneNumberId, from, ragResult.events.slice(0, 3));
    }

  } catch (error) {
    console.error('[WhatsApp] Error handling message:', error);
  }
}

// ─── Send a plain text WhatsApp message ──────────────────────────────────────
export async function sendWhatsAppMessage(phoneNumberId: string, to: string, text: string) {
  const WHATSAPP_ACCESS_TOKEN = config.WHATSAPP_ACCESS_TOKEN;

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

// ─── Send interactive event cards with RSVP buttons ───────────────────────────
export async function sendInteractiveEventCards(
  phoneNumberId: string,
  to: string,
  events: any[]
) {
  const WHATSAPP_ACCESS_TOKEN = config.WHATSAPP_ACCESS_TOKEN;

  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log(`[Dev Mode] Interactive Cards → ${to}:`, events.map(e => e.title));
    return;
  }

  // Build up to 3 rows for the interactive list — one per event
  const rows = events.slice(0, 3).map((ev: any) => {
    const dateStr = ev.date_time || ev.event_date
      ? new Date(ev.date_time || ev.event_date).toLocaleDateString('en-IN', {
          weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })
      : 'Date TBD';
    return {
      id: `rsvp_${ev.id}`,          // Button ID carries the event UUID
      title: ev.title.substring(0, 24),  // Max 24 chars per Meta spec
      description: `📍 ${(ev.location || 'Vizag').substring(0, 60)} · 📅 ${dateStr}`,
    };
  });

  const interactivePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: {
        type: 'text',
        text: '🎉 Top Events For You',
      },
      body: {
        text: 'Here are the best matches I found. Tap an event to RSVP instantly!',
      },
      footer: {
        text: 'Powered by VibeCheck AI',
      },
      action: {
        button: 'View Events',
        sections: [
          {
            title: 'Recommended Events',
            rows,
          },
        ],
      },
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactivePayload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[WhatsApp] Interactive cards send failed:', errText);
    } else {
      console.log(`[WhatsApp] Interactive event cards sent to ${to}`);
    }
  } catch (error) {
    console.error('[WhatsApp] Network error sending interactive cards:', error);
  }
}

// ─── Handle interactive button replies (user tapped an event row) ─────────────
export function parseInteractiveReply(message: any): string | null {
  if (message?.type === 'interactive' && message?.interactive?.type === 'list_reply') {
    return message.interactive.list_reply?.id ?? null;  // e.g. "rsvp_<uuid>"
  }
  return null;
}
