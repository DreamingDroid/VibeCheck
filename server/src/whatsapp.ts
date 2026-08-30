import { Request, Response } from 'express';
import { Pool } from 'pg';
import { handleEventQuery, extractAndSavePreferences } from './rag';
import { insertEventRSVP, getEventById, getEventsInNext7Days } from './queries/events';
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
      const event = await getEventById(pool, eventId);
      if (!event) {
        await sendWhatsAppMessage(phoneNumberId, from, `❌ Sorry, we couldn't find that event.`);
        return;
      }
      if (event.status === 'housefull' || (event.participant_limit && event.rsvp_count >= event.participant_limit)) {
        await sendWhatsAppMessage(
          phoneNumberId, from,
          `😔 Sorry, *${event.title}* is already housefull! We hope to see you at another event soon.`
        );
        return;
      }

      await insertEventRSVP(pool, eventId, from);
      console.log(`[Interactive RSVP] ${from} booked event ${eventId}`);
      await sendWhatsAppMessage(
        phoneNumberId, from,
        `✅ *You're all set!* Your spot has been reserved. We'll see you there! 🎉\n\nReply *VibeCheck* anytime to discover more events.`
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
    const cleanPhone = from.replace(/\D/g, '');
    const tenDigitPhone = cleanPhone.slice(-10);

    // 1. Verify if user has registered on the Website
    const webUserResult = await pool.query(
      `SELECT email, name, city, phone_number FROM web_users 
       WHERE phone_number IS NOT NULL AND (
         phone_number = $1 OR 
         phone_number = $2 OR 
         phone_number = $3 OR 
         phone_number LIKE '%' || $4
       ) LIMIT 1`,
      [from, cleanPhone, `+${cleanPhone}`, tenDigitPhone]
    );

    const registeredUser = webUserResult.rows[0];

    // If user is NOT registered on the website
    if (!registeredUser) {
      console.log(`[WhatsApp] Unregistered number pinged: ${from}`);
      const strangerReply = `I don't talk to strangers! 🕶️\n\nPlease register on VibeCheck Space first to get started:\n${config.WEB_APP_URL}`;
      await sendWhatsAppMessage(phoneNumberId, from, strangerReply);
      return;
    }

    const userName = registeredUser.name || entry?.contacts?.[0]?.profile?.name || 'Friend';
    const userCity = registeredUser.city || undefined;
    const isVibeCheckPing = msgBody.toLowerCase().includes('vibecheck');

    // 2. If user pings 'VibeCheck', send list of active events in the next 7 days
    if (isVibeCheckPing) {
      const activeEvents = await getEventsInNext7Days(pool, userCity);
      const calendarUrl = `${config.WEB_APP_URL}/dashboard?view=calendar`;

      if (!activeEvents || activeEvents.length === 0) {
        const noEventsMsg = `Hey ${userName}! 👋\n\nThere are no upcoming events scheduled in the next 7 days for ${userCity || 'your city'} right now.\n\n🗓️ Check our full VibeCalendar for future updates:\n${calendarUrl}`;
        await sendWhatsAppMessage(phoneNumberId, from, noEventsMsg);
        return;
      }

      let eventsMsg = `⚡ *ACTIVE EVENTS (NEXT 7 DAYS)* ⚡\n\n`;
      activeEvents.forEach((ev: any, idx: number) => {
        const dateFormatted = new Date(ev.date_time).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        eventsMsg += `*${idx + 1}. ${ev.title}*\n📅 ${dateFormatted}\n📍 ${ev.location || 'Vizag'}\n🏷️ ${ev.category}\n\n`;
      });

      eventsMsg += `🗓️ *Explore the complete VibeCalendar:*\n${calendarUrl}\n\n_Tap an event card below to RSVP directly!_`;

      await sendWhatsAppMessage(phoneNumberId, from, eventsMsg);

      // Send interactive RSVP cards for top events
      await sendInteractiveEventCards(phoneNumberId, from, activeEvents.slice(0, 3));
      return;
    }

    // 3. For any other message from registered user, guide them to ping 'VibeCheck' or view calendar
    const promptReply = `Hey ${userName}! 👋\n\nSend *VibeCheck* to get the list of active events happening in the next 7 days.\n\n🗓️ Or browse the interactive VibeCalendar:\n${config.WEB_APP_URL}/dashboard?view=calendar`;
    await sendWhatsAppMessage(phoneNumberId, from, promptReply);

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
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
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[WhatsApp] Send failed with status:', response.status);
    } else {
      console.log(`[WhatsApp] Sent to ${to}`);
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[WhatsApp] Send request timed out after 5 seconds');
    } else {
      console.error('[WhatsApp] Network error:', error);
    }
  }
}

// ─── Send a WhatsApp Template OTP ───────────────────────────────────────────
export async function sendWhatsAppTemplateOTP(phoneNumberId: string, to: string, code: string) {
  console.log('[sendWhatsAppTemplateOTP] Start. to:', to, 'code:', code);
  const WHATSAPP_ACCESS_TOKEN = config.WHATSAPP_ACCESS_TOKEN;

  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log(`[Dev Mode] WhatsApp Template OTP → ${to} [Template: ${config.WHATSAPP_OTP_TEMPLATE_NAME}, Code: ${code}]`);
    return;
  }

  const components: any[] = [
    {
      type: 'body',
      parameters: [
        {
          type: 'text',
          text: code,
        },
        {
          type: 'text',
          text: 'VibeCheck Space',
        },
      ],
    },
  ];

  if (config.WHATSAPP_OTP_TEMPLATE_HAS_BUTTON) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        {
          type: 'text',
          text: code,
        },
      ],
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[sendWhatsAppTemplateOTP] Request timed out. Aborting fetch signal.');
    controller.abort();
  }, 5000);

  try {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: config.WHATSAPP_OTP_TEMPLATE_NAME,
        language: {
          code: config.WHATSAPP_OTP_TEMPLATE_LANGUAGE,
        },
        components,
      },
    };

    console.log('[sendWhatsAppTemplateOTP] Fetching Meta API URL...');
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );

    console.log('[sendWhatsAppTemplateOTP] Fetch response status:', response.status);
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[WhatsApp OTP] Send failed with status:', response.status);
    } else {
      console.log(`[WhatsApp OTP] Template message sent to ${to}`);
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[WhatsApp OTP] Send request timed out after 5 seconds');
    } else {
      console.error('[WhatsApp OTP] Network error:', error);
    }
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
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
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
      console.error('[WhatsApp] Interactive cards send failed with status:', response.status);
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
