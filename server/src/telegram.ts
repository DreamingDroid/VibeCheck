import { Request, Response } from 'express';
import { Pool } from 'pg';
import QRCode from 'qrcode';
import { config } from './config';
import { getEventsInNext7Days } from './queries/events';
import { PassDetails, getPassByQrToken } from './queries/passes';
import { searchPublic } from './queries/search';
import { getChatModel } from './rag';
import { HumanMessage } from '@langchain/core/messages';

const TELEGRAM_API = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

/**
 * Helper to generate QR code PNG Buffer from string data
 */
export async function generateQrCodeBuffer(data: string): Promise<Buffer> {
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: 360,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

/**
 * Send a plain text or Markdown message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: 'Markdown' | 'HTML' | 'MarkdownV2';
    reply_markup?: any;
  }
) {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Dev] Text to ${chatId}:\n${text}`);
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode || 'HTML',
        reply_markup: options?.reply_markup
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Telegram API] sendMessage failed:', data);
    }
    return data;
  } catch (err) {
    console.error('[Telegram API] Network error in sendMessage:', err);
    return null;
  }
}

/**
 * Send a photo (such as entry QR Code pass) via Telegram Bot API
 */
export async function sendTelegramPhoto(
  chatId: number | string,
  photoBuffer: Buffer,
  caption: string,
  options?: {
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: any;
  }
) {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Dev] Photo to ${chatId}, Caption: ${caption}`);
    return { ok: true, result: { message_id: Math.floor(Math.random() * 100000) } };
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    formData.append('caption', caption);
    formData.append('parse_mode', options?.parse_mode || 'HTML');

    if (options?.reply_markup) {
      formData.append('reply_markup', JSON.stringify(options.reply_markup));
    }

    const uint8 = new Uint8Array(photoBuffer);
    const blob = new Blob([uint8], { type: 'image/png' });
    formData.append('photo', blob, 'ticket_qr.png');

    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      body: formData
    });

    const data: any = await res.json();
    if (!res.ok) {
      console.error('[Telegram API] sendPhoto failed:', data);
    }
    return data;
  } catch (err) {
    console.error('[Telegram API] Network error in sendPhoto:', err);
    return null;
  }
}

/**
 * Edit a previously sent message caption (e.g. when photo pass is scanned at the door)
 */
export async function editTelegramMessageCaption(
  chatId: number | string,
  messageId: number,
  newCaption: string,
  replyMarkup?: any
) {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Dev] Edit caption #${messageId} for ${chatId}: ${newCaption}`);
    return { ok: true };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/editMessageCaption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: newCaption,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[Telegram API] Network error in editMessageCaption:', err);
    return null;
  }
}

/**
 * Edit a previously sent message text (e.g. when text-based pass is scanned at the door)
 */
export async function editTelegramMessageText(
  chatId: number | string,
  messageId: number,
  newText: string,
  replyMarkup?: any
) {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Dev] Edit message #${messageId} for ${chatId}: ${newText}`);
    return null;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[Telegram API] Network error in editMessageText:', err);
    return null;
  }
}

/**
 * Formats and delivers an official VibeCheck Entry Pass as an image with QR code and details
 */
export async function sendTelegramEventPass(
  pool: Pool,
  chatId: number,
  pass: PassDetails
): Promise<number | null> {
  try {
    const dateFormatted = pass.event_date
      ? new Date(pass.event_date).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Date TBA';

    const cardCaption = `🎫 <b>CONFIRMED ENTRY PASS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ <b>${pass.event_title || 'Exclusive Vibe'}</b>\n\n` +
      `👤 <b>Guest:</b> ${pass.attendee_name || 'VIP Guest'}\n` +
      `📅 <b>Date & Time:</b> ${dateFormatted}\n` +
      `📍 <b>Venue:</b> ${pass.location || 'Vizag'}${pass.city ? `, ${pass.city}` : ''}\n` +
      `🔢 <b>Pass Code:</b> <code>${pass.pass_code}</code>\n` +
      `🟢 <b>Status:</b> Confirmed Entry Pass\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Present this QR code image or Pass Code at the entrance gate for check-in.</i>`;

    const buttonRow: any[] = [];
    if (pass.location) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pass.location}, ${pass.city || 'Vizag'}`)}`;
      buttonRow.push({ text: '📍 Venue Map', url: mapsUrl });
    }
    buttonRow.push({ text: '🌐 View on VibeCheck', url: `${config.WEB_APP_URL}/event/${pass.event_id}` });

    const inlineKeyboard = {
      inline_keyboard: [buttonRow]
    };

    // Generate high-resolution scannable QR code image of the pass code
    const qrBuffer = await generateQrCodeBuffer(pass.pass_code || pass.qr_token);

    const sendRes: any = await sendTelegramPhoto(chatId, qrBuffer, cardCaption, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    });

    if (sendRes && sendRes.ok && sendRes.result?.message_id) {
      const messageId = sendRes.result.message_id;
      // Save message ID to DB for live updates on scan
      await pool.query(
        `UPDATE event_rsvps SET telegram_message_id = $1 WHERE id = $2`,
        [messageId, pass.id]
      );
      return messageId;
    }
    return null;
  } catch (err) {
    console.error('[Telegram] Error sending event pass:', err);
    return null;
  }
}

/**
 * Answer Telegram callback query (removes loading spinner on tapped inline button)
 */
export async function answerTelegramCallbackQuery(callbackQueryId: string, text?: string) {
  if (!config.TELEGRAM_BOT_TOKEN) return null;
  try {
    const res = await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text
      })
    });
    return await res.json();
  } catch (err) {
    console.error('[Telegram API] Error in answerCallbackQuery:', err);
    return null;
  }
}

/**
 * Sends the active 7-day events list with rich interactive RSVP buttons
 */
export async function sendUpcomingEventsList(pool: Pool, chatId: number | string, city: string = 'Vizag') {
  const activeEvents = await getEventsInNext7Days(pool, city);

  if (!activeEvents || activeEvents.length === 0) {
    await sendTelegramMessage(
      chatId,
      `⚡ <b>Upcoming Events in ${city}</b>\n\nNo events scheduled in the next 7 days right now.\n\n🗓️ Check the full calendar at: <a href="${config.WEB_APP_URL}/dashboard?view=calendar">${config.WEB_APP_URL}/dashboard?view=calendar</a>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗓️ Browse Full VibeCalendar', url: `${config.WEB_APP_URL}/dashboard?view=calendar` }]
          ]
        }
      }
    );
    return;
  }

  let msg = `⚡ <b>ACTIVE VIBES IN ${city.toUpperCase()} (NEXT 7 DAYS)</b> ⚡\n\n`;
  const buttons: any[] = [];

  activeEvents.slice(0, 5).forEach((ev: any, idx: number) => {
    const dateFormatted = new Date(ev.date_time).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    msg += `<b>${idx + 1}. ${ev.title}</b>\n` +
           `📅 ${dateFormatted}\n` +
           `📍 ${ev.location || city}\n` +
           `🏷️ ${ev.category}\n\n`;

    buttons.push([
      { text: `🎟️ RSVP: ${ev.title.substring(0, 24)}`, url: `${config.WEB_APP_URL}/event/${ev.id}` }
    ]);
  });

  buttons.push([
    { text: '🗓️ View Full VibeCalendar', url: `${config.WEB_APP_URL}/dashboard?view=calendar` },
    { text: '🎟️ My Passes', callback_data: 'cmd_passes' }
  ]);

  await sendTelegramMessage(chatId, msg, {
    reply_markup: { inline_keyboard: buttons }
  });
}

/**
 * Sends active entry passes for user
 */
export async function sendUserPassesList(pool: Pool, chatId: number | string) {
  const passesResult = await pool.query(
    `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, u.name as attendee_name
     FROM event_rsvps r
     JOIN events e ON r.event_id = e.id
     JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
     WHERE u.telegram_chat_id = $1 AND e.date_time >= CURRENT_DATE - INTERVAL '1 day'
     ORDER BY e.date_time ASC`,
    [chatId]
  );

  if (passesResult.rows.length === 0) {
    await sendTelegramMessage(
      chatId,
      `🎟️ <b>No active passes found for your Telegram account.</b>\n\n` +
      `To claim your pass, RSVP for an event on <a href="${config.WEB_APP_URL}">VibeCheck</a>!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚡ Discover Events', callback_data: 'cmd_events' }],
            [{ text: '🌐 Open VibeCheck App', url: config.WEB_APP_URL }]
          ]
        }
      }
    );
    return;
  }

  await sendTelegramMessage(chatId, `🎟️ <b>You have ${passesResult.rows.length} active pass(es):</b>`);
  for (const p of passesResult.rows) {
    await sendTelegramEventPass(pool, Number(chatId), p);
  }
}

/**
 * Smart Natural Language & Filtered Search for Telegram Bot
 */
export async function handleTelegramSmartSearch(
  pool: Pool,
  chatId: number | string,
  userText: string,
  defaultCity: string = 'Vizag'
) {
  let query = userText.trim();
  let timeframe = 'upcoming';
  let city = defaultCity;

  const lower = userText.toLowerCase();

  let startDate: string | undefined;
  let endDate: string | undefined;

  const monthMap: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sept: 8, sep: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };

  const monthRegex = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/i;
  const monthMatch = lower.match(monthRegex);

  // 1. Timeframe & Month extraction
  if (monthMatch) {
    const monthKey = monthMatch[1].toLowerCase();
    const targetMonth = monthMap[monthKey];
    if (targetMonth !== undefined) {
      const now = new Date();
      let year = now.getFullYear();
      if (targetMonth < now.getMonth()) {
        year += 1;
      }
      startDate = new Date(Date.UTC(year, targetMonth, 1, 0, 0, 0)).toISOString();
      const lastDay = new Date(year, targetMonth + 1, 0).getDate();
      endDate = new Date(Date.UTC(year, targetMonth, lastDay, 23, 59, 59, 999)).toISOString();
      timeframe = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
    }
  } else if (lower.includes('next weekend')) {
    timeframe = 'next_weekend';
  } else if (lower.includes('this weekend') || lower.includes('weekend') || lower.includes('saturday') || lower.includes('sunday')) {
    timeframe = 'this_weekend';
  } else if (lower.includes('today') || lower.includes('tonight')) {
    timeframe = 'today';
  } else if (lower.includes('tomorrow')) {
    timeframe = 'tomorrow';
  } else if (lower.includes('this week') || lower.includes('next 7 days')) {
    timeframe = 'this_week';
  } else if (lower.includes('this month')) {
    timeframe = 'this_month';
  }

  // 2. Clean query extraction
  let cleanQuery = lower
    .replace(/\b(events?|vibes?|parties|party|shows?|happening|any|show me|find|get|looking for|tell me about|what are the|is there|are there|in vizag|in hyderabad|in bangalore|in chennai|in mumbai|in delhi|in goa|in pune|next weekend|this weekend|today|tomorrow|tonight|this week|this month|next week|next month|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec|in|on|at|during|for|the|a|an|please|are|there|is|some)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try fast LLM parsing if available and prompt is multi-word
  if (userText.split(' ').length > 2) {
    try {
      const model = getChatModel();
      if (model) {
        const prompt = `You are a search query parser for an events platform called VibeCheck.
Current date: ${new Date().toISOString().split('T')[0]}.
Extract search intent from user input: "${userText}"
Return valid JSON ONLY with keys:
- "query": search keyword without dates/months/prepositions (e.g., "trekking", "techno", "standup", "comedy", or empty string if general)
- "timeframe": one of ["today", "tomorrow", "this_weekend", "next_weekend", "this_week", "this_month", "upcoming"]
- "startDate": ISO 8601 start timestamp if specific month/date range requested, else null
- "endDate": ISO 8601 end timestamp if specific month/date range requested, else null
- "city": city name if specified or null
JSON:`;
        const response = await Promise.race([
          model.invoke([new HumanMessage(prompt)]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1800))
        ]) as any;

        const content = typeof response?.content === 'string' ? response.content : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.query !== undefined && typeof parsed.query === 'string') cleanQuery = parsed.query.trim();
          if (parsed.timeframe && typeof parsed.timeframe === 'string') timeframe = parsed.timeframe;
          if (parsed.startDate && typeof parsed.startDate === 'string') startDate = parsed.startDate;
          if (parsed.endDate && typeof parsed.endDate === 'string') endDate = parsed.endDate;
          if (parsed.city && typeof parsed.city === 'string') city = parsed.city;
        }
      }
    } catch (_) {
      // Fall back to regex extracted parameters
    }
  }

  // 3. Database Search Query
  const searchResults = await searchPublic(pool, {
    q: cleanQuery || undefined,
    city: city,
    timeframe: (startDate && endDate) ? undefined : timeframe,
    startDate,
    endDate,
    limitEvents: 4,
    limitOrganizers: 2,
  });

  const { events, organizers } = searchResults;
  const hasEvents = events && events.length > 0;
  const hasOrganizers = organizers && organizers.length > 0;

  if (!hasEvents && !hasOrganizers) {
    const timeframeLabel = timeframe !== 'upcoming' ? ` (${timeframe.replace(/_/g, ' ')})` : '';
    await sendTelegramMessage(
      chatId,
      `🔍 <b>No matching vibes found for "${cleanQuery || userText}"${timeframeLabel} in ${city}.</b>\n\n` +
      `💡 <i>Try searching for other vibes like <b>Trekking</b>, <b>Live Music</b>, <b>Standup</b>, or <b>Techno</b>!</i>\n\n` +
      `🗓️ Browse the full live calendar: <a href="${config.WEB_APP_URL}/dashboard">${config.WEB_APP_URL}/dashboard</a>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗓️ Browse Full VibeCalendar', url: `${config.WEB_APP_URL}/dashboard?view=calendar` }],
            [{ text: '⚡ Discover All Events', callback_data: 'cmd_events' }]
          ]
        }
      }
    );
    return;
  }

  const timeframeTitle = timeframe !== 'upcoming' ? ` • ${timeframe.replace(/_/g, ' ').toUpperCase()}` : '';
  const searchTitle = cleanQuery ? `Matching "${cleanQuery.toUpperCase()}"` : `Active Vibes`;

  let msg = `⚡ <b>${searchTitle}${timeframeTitle} in ${city.toUpperCase()}</b> ⚡\n\n`;
  const buttons: any[] = [];

  // Add event cards
  if (hasEvents) {
    events.slice(0, 3).forEach((ev: any, idx: number) => {
      const dateFormatted = ev.date_time
        ? new Date(ev.date_time).toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Date TBA';

      const priceTag = ev.is_paid ? '🎟️ Paid Pass' : '🟢 Free Entry';
      const organizerTag = ev.organizer_name ? ` (by ${ev.organizer_name})` : '';

      msg += `<b>${idx + 1}. ${ev.title}</b>${organizerTag}\n` +
             `📅 ${dateFormatted}\n` +
             `📍 ${ev.location || city}\n` +
             `🏷️ ${ev.category} • ${priceTag}\n\n`;

      buttons.push([
        { text: `🎟️ RSVP: ${ev.title.substring(0, 26)}`, url: `${config.WEB_APP_URL}/event/${ev.id}` }
      ]);
    });
  }

  // Add organizer highlight
  if (hasOrganizers) {
    const topOrg = organizers[0];
    msg += `🎭 <b>Featured Organiser: ${topOrg.brand_name}</b> (⭐ ${Number(topOrg.rating || 4.8).toFixed(1)}/5)\n` +
           `${topOrg.description ? `<i>"${topOrg.description.substring(0, 90)}..."</i>\n\n` : '\n'}`;

    buttons.push([
      { text: `🎭 Organiser Profile: ${topOrg.brand_name.substring(0, 22)}`, url: `${config.WEB_APP_URL}/organizer/${encodeURIComponent(topOrg.slug || topOrg.email)}` }
    ]);
  }

  // Smart Deep Link with prefilled filters
  const queryParam = cleanQuery ? `&q=${encodeURIComponent(cleanQuery)}` : '';
  const timeframeQueryParam = timeframe !== 'upcoming' ? `&timeframe=${encodeURIComponent(timeframe)}` : '';
  const cityParam = `&city=${encodeURIComponent(city)}`;
  const filteredDashboardUrl = `${config.WEB_APP_URL}/dashboard?search=true${queryParam}${timeframeQueryParam}${cityParam}`;

  buttons.unshift([
    { text: '🌐 View on VibeCheckSpace', url: filteredDashboardUrl }
  ]);

  await sendTelegramMessage(chatId, msg, {
    reply_markup: { inline_keyboard: buttons }
  });
}

/**
 * Telegram Webhook Handler (Express route)
 */
export async function handleTelegramWebhook(req: Request, res: Response, pool: Pool) {
  // Always return 200 OK fast to Telegram
  res.status(200).json({ ok: true });

  const update = req.body;
  if (!update) return;

  // ── Handle Callback Query (user clicked inline keyboard button) ───────────
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbChatId = cb.message?.chat?.id;
    const data = cb.data;

    await answerTelegramCallbackQuery(cb.id);

    if (cbChatId) {
      if (data === 'cmd_events') {
        await sendUpcomingEventsList(pool, cbChatId);
      } else if (data === 'cmd_passes') {
        await sendUserPassesList(pool, cbChatId);
      }
    }
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = message.chat?.id;
  const text: string = message.text?.trim() || '';
  const username = message.from?.username || message.from?.first_name || '';
  const firstName = message.from?.first_name || 'Friend';

  if (!chatId || !text) return;

  try {
    // 1. Handle /start command (including deep link payloads)
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const payload = parts[1]?.trim();

      // Case A: Deep linked to a specific pass: e.g. /start pass_vc_pass_xxxxx
      if (payload && payload.startsWith('pass_')) {
        const qrToken = payload.replace('pass_', '');
        const pass = await getPassByQrToken(pool, qrToken);

        if (pass) {
          if (pass.user_email) {
            await pool.query(
              `UPDATE web_users 
               SET telegram_chat_id = $1, telegram_username = $2, telegram_linked_at = CURRENT_TIMESTAMP
               WHERE LOWER(email) = LOWER($3)`,
              [chatId, username, pass.user_email]
            );
          }

          await sendTelegramMessage(
            chatId,
            `🎉 <b>Welcome to VibeCheck, ${firstName}!</b>\n\nYour account has been linked and your pass is ready below:`
          );

          await sendTelegramEventPass(pool, chatId, pass);
          return;
        }
      }

      // Case B: Deep linked via "PING VIBECHECK" button (logged in user): /start user_<email>
      if (payload && payload.startsWith('user_')) {
        const userEmail = decodeURIComponent(payload.replace('user_', ''));
        if (userEmail) {
          await pool.query(
            `UPDATE web_users 
             SET telegram_chat_id = $1, telegram_username = $2, telegram_linked_at = CURRENT_TIMESTAMP
             WHERE LOWER(email) = LOWER($3)`,
            [chatId, username, userEmail]
          );
        }

        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to VibeCheck Space, ${firstName}!</b> 🌊⚡\n\n` +
          `✅ <b>Alerts Activated:</b> You're all set! You'll now receive curated event drops, exclusive passes, and matchmaker alerts directly here on Telegram. Stay tuned!\n\n` +
          `👇 <i>Here are the active vibes happening in the next 7 days:</i>`
        );

        await sendUpcomingEventsList(pool, chatId);
        return;
      }

      // Case C: Deep linked via "PING VIBECHECK" button (guest / direct ping): /start ping_vibecheck
      if (payload === 'ping_vibecheck' || payload === 'dashboard') {
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to VibeCheck Space, ${firstName}!</b> 🌊⚡\n\n` +
          `✅ <b>Stay Tuned:</b> You're now connected to VibeCheck Vizag! You'll receive curated alerts and exclusive updates right here on Telegram.\n\n` +
          `👇 <i>Here are the active vibes happening in the next 7 days:</i>`
        );

        await sendUpcomingEventsList(pool, chatId);
        return;
      }

      // Case D: General /start greeting
      await sendTelegramMessage(
        chatId,
        `👋 <b>Welcome to VibeCheck Vizag!</b> 🌊⚡\n\n` +
        `I am your official VibeCheck companion. You can ask me anything about events, or use:\n\n` +
        `• <b>"trekking this weekend"</b> — Find specific events or organisers\n` +
        `• <b>/events</b> — Explore all upcoming vibes\n` +
        `• <b>/passes</b> — View your active tickets & QR passes\n` +
        `• <b>/help</b> — Need assistance\n\n` +
        `🗓️ Browse full calendar on web: <a href="${config.WEB_APP_URL}">${config.WEB_APP_URL}</a>`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚡ Discover Events', callback_data: 'cmd_events' },
                { text: '🎟️ My Passes', callback_data: 'cmd_passes' }
              ],
              [
                { text: '🌐 Open VibeCheck App', url: config.WEB_APP_URL }
              ]
            ]
          }
        }
      );
      return;
    }

    const lowerText = text.toLowerCase();

    // 2. Handle /passes command or strictly passes query
    if (text === '/passes' || lowerText === 'passes' || lowerText === 'my passes' || lowerText === 'tickets') {
      await sendUserPassesList(pool, chatId);
      return;
    }

    // 3. Handle /events or generic vibecheck prompt
    if (text === '/events' || lowerText === 'events' || lowerText === 'vibecheck') {
      await sendUpcomingEventsList(pool, chatId);
      return;
    }

    // 4. Handle /help command
    if (text === '/help' || lowerText === 'help') {
      await sendTelegramMessage(
        chatId,
        `Hey ${firstName}! 👋\n\n` +
        `You can search naturally by sending messages like:\n` +
        `• <i>"Are there any trekking events this weekend?"</i>\n` +
        `• <i>"Show me techno parties tomorrow"</i>\n` +
        `• <i>"Standup comedy in Vizag"</i>\n\n` +
        `Or use commands: <b>/events</b> for 7-day schedule, <b>/passes</b> for tickets.\n\n` +
        `Need support? <a href="${config.WEB_APP_URL}">${config.WEB_APP_URL}</a>`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⚡ Discover Events', callback_data: 'cmd_events' },
                { text: '🎟️ My Passes', callback_data: 'cmd_passes' }
              ],
              [
                { text: '🌐 Open VibeCheck App', url: config.WEB_APP_URL }
              ]
            ]
          }
        }
      );
      return;
    }

    // 5. Natural Language & Smart Search for all free-form text
    await handleTelegramSmartSearch(pool, chatId, text, 'Vizag');

  } catch (error) {
    console.error('[Telegram Webhook] Error processing message:', error);
  }
}

