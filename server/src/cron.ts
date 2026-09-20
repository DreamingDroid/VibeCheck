import cron from 'node-cron';
import { Pool } from 'pg';
import { sendTelegramMessage } from './telegram';
import { getChatModel } from './rag';
import { initSystemSettings, getSystemSetting } from './queries/analytics';
import { getRecentEvents } from './queries/events';
import { getTelegramSubscribers } from './queries/users';
import { config } from './config';
import { deleteImage } from './cloudinary';

/**
 * Proactive Push Alerts — core job logic on Telegram (Zero Messaging Fees).
 * Called by the daily cron AND by the /admin/trigger-cron dev route.
 */
export async function runMatchmakerJob(pool: Pool): Promise<string> {
  const log: string[] = [];

  if (!config.TELEGRAM_BOT_TOKEN) {
    log.push('[Cron] No TELEGRAM_BOT_TOKEN set — skipping Telegram push alerts.');
    return log.join('\n');
  }

  try {
    await initSystemSettings(pool);

    // Step 0: Check if Cron is enabled in settings
    const rawValue = await getSystemSetting(pool, 'cron_enabled');
    const isEnabled = rawValue === true || rawValue === 'true';

    if (!isEnabled) {
      log.push('[Cron] Push alerts are disabled in admin settings. Skipping.');
      return log.join('\n');
    }

    // Step 1: Get events added in the last 48 hours
    const newEvents = await getRecentEvents(pool, 48);

    if (newEvents.length === 0) {
      log.push('[Cron] No new events in the last 48 hours. Skipping.');
      return log.join('\n');
    }

    log.push(`[Cron] Found ${newEvents.length} new event(s). Checking Telegram subscriber preferences...`);

    // Step 2: Get all Telegram-linked users
    const users = await getTelegramSubscribers(pool);

    if (users.length === 0) {
      log.push('[Cron] No users with linked Telegram accounts found.');
      return log.join('\n');
    }

    log.push(`[Cron] ${users.length} user(s) with linked Telegram accounts.`);

    const llm = getChatModel();

    // Compact events payload to minimize tokens
    const compactEvents = newEvents.map((ev: any) => ({
      id: ev.id,
      title: ev.title,
      category: ev.category,
      location: ev.location,
      date: new Date(ev.date_time).toLocaleString('en-IN')
    }));

    // Step 3: For each user, perform semantic matchmaking
    for (const user of users) {
      const firstName = user.name?.split(' ')[0] ?? 'there';
      const userPrefs = {
        city: user.city || 'Vizag',
        categories: user.categories || []
      };

      const systemPrompt = `You are the VibeCheck Proactive Matchmaker AI.
You evaluate if brand new events match a specific user's preferences and city.
User Preferences: ${JSON.stringify(userPrefs)}

New Events array:
${JSON.stringify(compactEvents)}

Task:
1. Do any of these new events align with the user's categories or city?
2. If YES, craft a 2-3 sentence personalized Telegram alert to send to them. Greet them by their name (${firstName}). Format with clean emojis.
3. If NO (nothing matches), output EXACTLY the phrase: NO_MATCH
Do not output anything else if NO_MATCH. No explanations.`;

      const response = await llm.invoke([['system', systemPrompt]]);
      const aiMessage = (response.content as string).trim();

      if (aiMessage === 'NO_MATCH' || aiMessage.includes('NO_MATCH')) {
        log.push(`[Cron Matchmaker] No match for Telegram user ${user.telegram_chat_id}. Skipping.`);
        continue;
      }

      const formattedText = `⚡ <b>Vibe Alert for ${firstName}!</b>\n\n${aiMessage}\n\n🗓️ <i>Tap below to browse the full calendar:</i>`;

      await sendTelegramMessage(user.telegram_chat_id, formattedText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '⚡ View Vibes on Web', url: `${config.WEB_APP_URL}/dashboard?view=calendar` },
              { text: '🎟️ Check Events in Bot', callback_data: 'cmd_events' }
            ]
          ]
        }
      });

      log.push(`[Cron Matchmaker] AI Alert sent to Telegram chat ${user.telegram_chat_id} (${user.email || user.name})`);

      // Small delay between calls
      await new Promise(r => setTimeout(r, 400));
    }

    log.push('[Cron] Telegram push alert job complete.');
  } catch (error: any) {
    log.push(`[Cron] Error during push alert job: ${error.message}`);
    console.error('[Cron] Error during push alert job:', error);
  }

  return log.join('\n');
}

/**
 * Schedules the daily cron jobs.
 * - AI Matchmaker Push Alerts: 9:00 AM IST (3:30 AM UTC).
 * - Post-Event Feedback Rating Requests: 5:00 PM IST (11:30 AM UTC).
 * - Expired Event Image Cleanup: 2:00 AM UTC.
 */
export function startPushAlertCron(pool: Pool) {
  // "30 3 * * *" = 3:30 AM UTC = 9:00 AM IST
  cron.schedule('30 3 * * *', async () => {
    console.log('[Cron] Running daily push alert job...');
    const result = await runMatchmakerJob(pool);
    console.log(result);
  });

  // "30 11 * * *" = 11:30 AM UTC = 5:00 PM IST
  cron.schedule('30 11 * * *', async () => {
    console.log('[Cron] Running daily post-event feedback rating request job...');
    const result = await runPostEventFeedbackJob(pool);
    console.log(result);
  });

  // Expired event image cleanup at 2:00 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running daily expired event image cleanup job...');
    const result = await runExpiredEventCleanupJob(pool);
    console.log(result);
  });

  console.log('[Cron] Daily push alert job scheduled for 9:00 AM IST.');
  console.log('[Cron] Daily post-event feedback rating request job scheduled for 5:00 PM IST.');
  console.log('[Cron] Daily expired event cleanup job scheduled for 2:00 AM UTC.');
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sends a Telegram message requesting ratings and feedback for events that ended the previous day.
 * Scheduled daily at 5:00 PM IST the following day of the event.
 */
export async function runPostEventFeedbackJob(pool: Pool): Promise<string> {
  const log: string[] = [];

  if (!config.TELEGRAM_BOT_TOKEN) {
    log.push('[Cron Feedback] No TELEGRAM_BOT_TOKEN configured — skipping feedback rating requests.');
    return log.join('\n');
  }

  try {
    const { rows } = await pool.query(`
      SELECT 
        r.id as rsvp_id,
        r.event_id,
        r.user_email,
        u.name as user_name,
        u.telegram_chat_id,
        e.title as event_title,
        e.date_time,
        e.end_time,
        e.organizer_email,
        COALESCE(a.brand_name, 'VibeCheck Organizer') as organizer_name
      FROM event_rsvps r
      JOIN events e ON r.event_id = e.id
      JOIN web_users u ON (LOWER(u.email) = LOWER(r.user_email) OR (r.phone_number IS NOT NULL AND u.phone_number = r.phone_number))
      LEFT JOIN admins a ON e.organizer_email = a.email
      WHERE u.telegram_chat_id IS NOT NULL
        AND r.feedback_requested_at IS NULL
        AND (
          DATE(COALESCE(e.end_time, e.date_time) AT TIME ZONE 'Asia/Kolkata') = (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 day'
          OR (
            e.status = 'ended'
            AND COALESCE(e.end_time, e.date_time) < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            AND COALESCE(e.end_time, e.date_time) >= (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata') - INTERVAL '3 days'
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM event_ratings er 
          WHERE er.event_id = e.id AND LOWER(er.user_email) = LOWER(r.user_email)
        )
      ORDER BY e.date_time DESC
    `);

    if (rows.length === 0) {
      log.push('[Cron Feedback] No pending feedback rating requests found for ended events.');
      return log.join('\n');
    }

    log.push(`[Cron Feedback] Found ${rows.length} attendee(s) eligible for feedback rating requests.`);

    let sentCount = 0;
    for (const row of rows) {
      try {
        const eventUrl = `${config.WEB_APP_URL}/event/${row.event_id}`;
        const firstName = row.user_name?.split(' ')[0] || 'there';
        const escapedTitle = escapeHtml(row.event_title);
        const escapedOrg = escapeHtml(row.organizer_name || 'VibeCheck Organizer');

        const messageText = 
          `✨ <b>How was the vibe?</b>\n\n` +
          `Hey ${firstName}! We hope you had a fantastic experience at <a href="${eventUrl}">${escapedTitle}</a> with <b>${escapedOrg}</b>!\n\n` +
          `Could you take 30 seconds to rate the vibe and share your feedback? Your review helps our host and fellow vibe seekers.\n\n` +
          `👉 <a href="${eventUrl}">${escapedTitle}</a>`;

        await sendTelegramMessage(row.telegram_chat_id, messageText, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: `⭐ Rate ${row.event_title}`, url: eventUrl }
              ]
            ]
          }
        });

        // Mark feedback as requested for this RSVP
        await pool.query(
          `UPDATE event_rsvps SET feedback_requested_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.rsvp_id]
        );

        sentCount++;
        log.push(`[Cron Feedback] Sent rating request to Telegram chat ${row.telegram_chat_id} (${row.user_email}) for event "${row.event_title}"`);

        // Small delay between Telegram messages
        await new Promise(r => setTimeout(r, 300));
      } catch (err: any) {
        log.push(`[Cron Feedback] Error sending rating request for RSVP ${row.rsvp_id}: ${err.message}`);
      }
    }

    log.push(`[Cron Feedback] Successfully dispatched ${sentCount} rating feedback request(s).`);
  } catch (error: any) {
    log.push(`[Cron Feedback] Error during feedback request job: ${error.message}`);
    console.error('[Cron Feedback] Error during feedback request job:', error);
  }

  return log.join('\n');
}

export async function runExpiredEventCleanupJob(pool: Pool): Promise<string> {
  const log: string[] = [];
  try {
    const { rows } = await pool.query(`
      SELECT id, image_public_id 
      FROM events 
      WHERE (end_time < NOW() OR (end_time IS NULL AND date_time < NOW()))
      AND image_public_id IS NOT NULL
    `);

    if (rows.length === 0) {
      log.push('[Cron Cleanup] No expired events with images found.');
      return log.join('\n');
    }

    log.push(`[Cron Cleanup] Found ${rows.length} expired event(s) with images.`);

    let cleanedCount = 0;
    for (const event of rows) {
      try {
        const deleted = await deleteImage(event.image_public_id);
        if (deleted) {
          await pool.query(
            'UPDATE events SET image_url = NULL, image_public_id = NULL WHERE id = $1',
            [event.id]
          );
          cleanedCount++;
        }
      } catch (err: any) {
        log.push(`[Cron Cleanup] Error deleting image for event ${event.id}: ${err.message}`);
      }
    }
    
    log.push(`[Cron Cleanup] Successfully cleaned up ${cleanedCount} image(s).`);
  } catch (error: any) {
    log.push(`[Cron Cleanup] Error during cleanup job: ${error.message}`);
    console.error('[Cron Cleanup] Error during cleanup job:', error);
  }
  return log.join('\n');
}
