import { Request, Response } from 'express';
import { Pool } from 'pg';
import QRCode from 'qrcode';
import { config } from './config';
import { getEventsInNext7Days } from './queries/events';
import { PassDetails, getPassByQrToken } from './queries/passes';

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
 * Edit a previously sent message caption (e.g. when pass is scanned at the door)
 */
export async function editTelegramMessageCaption(
  chatId: number | string,
  messageId: number,
  newCaption: string,
  replyMarkup?: any
) {
  if (!config.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Dev] Edit message #${messageId} for ${chatId}: ${newCaption}`);
    return null;
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
 * Formats and delivers an official VibeCheck VIP / Event Entry Pass
 */
export async function sendTelegramEventPass(
  pool: Pool,
  chatId: number,
  pass: PassDetails
): Promise<number | null> {
  try {
    const qrBuffer = await generateQrCodeBuffer(pass.qr_token);

    const dateFormatted = pass.event_date
      ? new Date(pass.event_date).toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Date TBA';

    const caption = `🎟️ <b>VIBECHECK OFFICIAL PASS</b>\n\n` +
      `⚡ <b>${pass.event_title || 'Exclusive Vibe'}</b>\n` +
      `👤 <b>Attendee:</b> ${pass.attendee_name || 'VIP Guest'}\n` +
      `📅 <b>When:</b> ${dateFormatted}\n` +
      `📍 <b>Venue:</b> ${pass.location || 'Vizag'}\n` +
      `🔢 <b>Pass Code:</b> <code>${pass.pass_code}</code>\n` +
      `🏷️ <b>Status:</b> ${pass.checkin_status === 'checked_in' ? '✅ CHECKED-IN' : '🟢 VALID ENTRY'}\n\n` +
      `<i>Show this QR code at the door for instant entry!</i>`;

    const inlineKeyboard: any = {
      inline_keyboard: [
        [
          { text: '🌐 View on VibeCheck Web', url: `${config.WEB_APP_URL}/event/${pass.event_id}` }
        ]
      ]
    };

    const sendRes: any = await sendTelegramPhoto(chatId, qrBuffer, caption, {
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
 * Telegram Webhook Handler (Express route)
 */
export async function handleTelegramWebhook(req: Request, res: Response, pool: Pool) {
  // Always return 200 OK fast to Telegram
  res.status(200).json({ ok: true });

  const update = req.body;
  if (!update || !update.message) return;

  const message = update.message;
  const chatId = message.chat?.id;
  const text: string = message.text?.trim() || '';
  const username = message.from?.username || message.from?.first_name || '';

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
          // Link telegram_chat_id to user if email exists
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
            `🎉 <b>Welcome to VibeCheck, ${message.from?.first_name || 'Friend'}!</b>\n\nYour account has been linked and your pass is ready below:`
          );

          await sendTelegramEventPass(pool, chatId, pass);
          return;
        }
      }

      // Case B: General start or dashboard link
      await sendTelegramMessage(
        chatId,
        `👋 <b>Welcome to VibeCheck Vizag!</b> 🌊⚡\n\n` +
        `I am your official VibeCheck companion. Here's what you can do:\n\n` +
        `• <b>/events</b> — Explore upcoming curated events & vibes\n` +
        `• <b>/passes</b> — View your active tickets & VIP invites\n` +
        `• <b>/help</b> — Need assistance or contact organizer\n\n` +
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

    // 2. Handle /events command
    if (text === '/events' || text.toLowerCase().includes('events') || text.toLowerCase().includes('vibecheck')) {
      const activeEvents = await getEventsInNext7Days(pool, 'Vizag');

      if (!activeEvents || activeEvents.length === 0) {
        await sendTelegramMessage(
          chatId,
          `⚡ <b>Upcoming Events in Vizag</b>\n\nNo events scheduled in the next 7 days right now.\n\n🗓️ Check the full calendar at: ${config.WEB_APP_URL}/dashboard?view=calendar`
        );
        return;
      }

      let msg = `⚡ <b>ACTIVE VIBES IN VIZAG (NEXT 7 DAYS)</b> ⚡\n\n`;
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
               `📍 ${ev.location || 'Vizag'}\n` +
               `🏷️ ${ev.category}\n\n`;

        buttons.push([
          { text: `🎟️ RSVP: ${ev.title.substring(0, 20)}`, url: `${config.WEB_APP_URL}/event/${ev.id}` }
        ]);
      });

      buttons.push([
        { text: '🗓️ View Full VibeCalendar', url: `${config.WEB_APP_URL}/dashboard?view=calendar` }
      ]);

      await sendTelegramMessage(chatId, msg, {
        reply_markup: { inline_keyboard: buttons }
      });
      return;
    }

    // 3. Handle /passes command
    if (text === '/passes' || text.toLowerCase().includes('pass') || text.toLowerCase().includes('ticket')) {
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
          `To link your passes, make sure to claim or RSVP for an event on <a href="${config.WEB_APP_URL}">VibeCheck</a>!`
        );
        return;
      }

      await sendTelegramMessage(chatId, `🎟️ <b>You have ${passesResult.rows.length} active pass(es):</b>`);
      for (const p of passesResult.rows) {
        await sendTelegramEventPass(pool, chatId, p);
      }
      return;
    }

    // 4. Handle /help or fallback
    await sendTelegramMessage(
      chatId,
      `Hey ${message.from?.first_name || 'there'}! 👋\n\n` +
      `Send <b>/events</b> to see what's happening in Vizag this week, or <b>/passes</b> to access your entry QR codes.\n\n` +
      `Need help? Reach out on our web platform: <a href="${config.WEB_APP_URL}">${config.WEB_APP_URL}</a>`
    );

  } catch (error) {
    console.error('[Telegram Webhook] Error processing message:', error);
  }
}
