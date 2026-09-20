import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  ensurePassForRSVP,
  getPassByQrToken,
  verifyAndCheckInPass,
  searchAttendeesForEvent,
  manualCheckInById,
  getEventAttendanceStats,
  verifyStaffScannerPin,
  createOrGetScannerPin
} from './queries/passes';
import { editTelegramMessageText, editTelegramMessageCaption, sendTelegramEventPass } from './telegram';
import { config } from './config';

/**
 * Verify pass QR code scanned at the door
 * POST /api/passes/verify
 */
export async function verifyPassHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { qr_token, event_id, staff_pin, gate_name } = req.body;

    if (!qr_token || !event_id) {
      return res.status(400).json({ success: false, error: 'qr_token and event_id are required' });
    }

    // Authorization: Check staff PIN if provided, or verify organizer session
    let checkerIdentity = gate_name || 'Main Gate';
    if (staff_pin) {
      const pinValid = await verifyStaffScannerPin(pool, event_id, staff_pin);
      if (!pinValid.valid) {
        return res.status(403).json({ success: false, error: 'Invalid or expired Gate Scanner PIN' });
      }
      checkerIdentity = pinValid.gate_name || checkerIdentity;
    }

    const checkinResult = await verifyAndCheckInPass(pool, qr_token, event_id, checkerIdentity);

    if (!checkinResult.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        WRONG_EVENT: 400,
        ALREADY_CHECKED_IN: 409
      };
      return res.status(statusMap[checkinResult.code] || 400).json({
        success: false,
        code: checkinResult.code,
        message: checkinResult.message,
        pass: checkinResult.pass
      });
    }

    const pass = checkinResult.pass!;

    // Live update Telegram pass message if user received pass via Telegram
    if (pass.telegram_chat_id && pass.telegram_message_id) {
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

      const updatedText = `🎫 <b>ENTRY PASS</b>\n\n` +
        `<blockquote>\n` +
        `<b>⚡ ${pass.event_title || 'Exclusive Vibe'}</b>\n` +
        `👤 <b>Guest:</b> ${pass.attendee_name || 'VIP Guest'}\n` +
        `📅 <b>When:</b> ${dateFormatted}\n` +
        `📍 <b>Where:</b> ${pass.location || 'Vizag'}${pass.city ? `, ${pass.city}` : ''}\n` +
        `</blockquote>\n\n` +
        `🔢 <b>Pass Code:</b> <code>${pass.pass_code}</code>\n` +
        `🏷️ <b>Status:</b> ✅ <b>CHECKED-IN</b> at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} (${checkerIdentity})\n\n` +
        `<i>Enjoy the vibe! 🎉</i>`;

      const buttonRow: any[] = [];
      if (pass.location) {
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pass.location}, ${pass.city || 'Vizag'}`)}`;
        buttonRow.push({ text: '📍 Open in Google Maps', url: mapsUrl });
      }
      buttonRow.push({ text: '🌐 View on VibeCheck', url: `${config.WEB_APP_URL}/event/${pass.event_id}` });

      const inlineKeyboard = {
        inline_keyboard: [buttonRow]
      };

      // Update caption if photo message was sent, otherwise update text
      editTelegramMessageCaption(pass.telegram_chat_id, pass.telegram_message_id, updatedText, inlineKeyboard)
        .then((res: any) => {
          if (!res || !res.ok) {
            return editTelegramMessageText(pass.telegram_chat_id!, pass.telegram_message_id!, updatedText, inlineKeyboard);
          }
        })
        .catch(err => {
          console.error('[Passes] Error updating live Telegram status:', err);
        });
    }

    return res.json({
      success: true,
      message: checkinResult.message,
      attendee: {
        name: pass.attendee_name || 'VIP Guest',
        email: pass.user_email,
        pass_code: pass.pass_code,
        checked_in_at: pass.checked_in_at,
        checked_in_by: checkerIdentity
      }
    });

  } catch (error) {
    console.error('[verifyPassHandler] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during pass verification' });
  }
}

/**
 * Search attendees for manual lookup at the gate
 * GET /api/passes/attendees
 */
export async function searchAttendeesHandler(req: Request, res: Response, pool: Pool) {
  try {
    const eventId = req.query.event_id as string;
    const query = (req.query.q as string) || '';
    const staffPin = req.query.staff_pin as string;

    if (!eventId) {
      return res.status(400).json({ success: false, error: 'event_id is required' });
    }

    if (staffPin) {
      const pinValid = await verifyStaffScannerPin(pool, eventId, staffPin);
      if (!pinValid.valid) {
        return res.status(403).json({ success: false, error: 'Invalid Gate Scanner PIN' });
      }
    }

    const attendees = await searchAttendeesForEvent(pool, eventId, query);
    return res.json({ success: true, attendees });
  } catch (error) {
    console.error('[searchAttendeesHandler] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Manual check-in override for an attendee
 * POST /api/passes/manual-checkin
 */
export async function manualCheckInHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rsvp_id, event_id, staff_pin, gate_name } = req.body;

    if (!rsvp_id || !event_id) {
      return res.status(400).json({ success: false, error: 'rsvp_id and event_id are required' });
    }

    let checkerIdentity = gate_name || 'Staff Manual';
    if (staff_pin) {
      const pinValid = await verifyStaffScannerPin(pool, event_id, staff_pin);
      if (!pinValid.valid) {
        return res.status(403).json({ success: false, error: 'Invalid Gate Scanner PIN' });
      }
      checkerIdentity = pinValid.gate_name ? `${pinValid.gate_name} (Manual)` : checkerIdentity;
    }

    const result = await manualCheckInById(pool, Number(rsvp_id), event_id, checkerIdentity);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message, pass: result.pass });
    }

    return res.json({ success: true, message: result.message, pass: result.pass });
  } catch (error) {
    console.error('[manualCheckInHandler] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Get live attendance stats for organizer
 * GET /api/organizer/events/:id/attendance
 */
export async function getAttendanceStatsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const eventId = String(req.params.id);
    const staffPin = req.query.staff_pin as string;

    if (staffPin) {
      const pinValid = await verifyStaffScannerPin(pool, eventId, staffPin);
      if (!pinValid.valid) {
        return res.status(403).json({ success: false, error: 'Invalid Gate Scanner PIN' });
      }
    }

    const stats = await getEventAttendanceStats(pool, eventId);
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('[getAttendanceStatsHandler] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Create or get bouncer scanner PIN
 * POST /api/organizer/events/:id/scanner-pin
 */
export async function createScannerPinHandler(req: Request, res: Response, pool: Pool) {
  try {
    const eventId = String(req.params.id);
    const { organizer_email, gate_name } = req.body;

    if (!organizer_email) {
      return res.status(400).json({ success: false, error: 'organizer_email is required' });
    }

    const pinData = await createOrGetScannerPin(pool, eventId, organizer_email, gate_name || 'Main Gate');

    return res.json({
      success: true,
      pin_code: pinData.pin_code,
      gate_name: pinData.gate_name,
      expires_at: pinData.expires_at,
      scanner_url: `${config.WEB_APP_URL}/scanner/${eventId}?pin=${pinData.pin_code}`
    });
  } catch (error) {
    console.error('[createScannerPinHandler] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Generate Telegram Deep Link for an RSVP Pass
 * POST /api/passes/telegram-link
 */
export async function getTelegramPassLinkHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { event_id, user_email, phone_number } = req.body;

    if (!event_id || (!user_email && !phone_number)) {
      return res.status(400).json({ success: false, error: 'event_id and user_email/phone_number are required' });
    }

    const pass = await ensurePassForRSVP(pool, event_id, user_email, phone_number);

    let sentDirectly = false;
    if (pass.telegram_chat_id) {
      const messageId = await sendTelegramEventPass(pool, pass.telegram_chat_id, pass);
      if (messageId) {
        sentDirectly = true;
      }
    }

    const botUsername = config.TELEGRAM_BOT_USERNAME || 'VibeCheckSpaceBot';
    const deepLink = `https://t.me/${botUsername}?start=pass_${pass.qr_token}`;

    return res.json({
      success: true,
      pass_code: pass.pass_code,
      qr_token: pass.qr_token,
      deep_link: deepLink,
      sent_directly: sentDirectly
    });
  } catch (error) {
    console.error('[getTelegramPassLinkHandler] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
