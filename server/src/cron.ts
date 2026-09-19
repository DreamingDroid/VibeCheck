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
 * Schedules the daily cron job.
 * Runs daily at 9:00 AM IST (3:30 AM UTC).
 */
export function startPushAlertCron(pool: Pool) {
  // "30 3 * * *" = 3:30 AM UTC = 9:00 AM IST
  cron.schedule('30 3 * * *', async () => {
    console.log('[Cron] Running daily push alert job...');
    const result = await runMatchmakerJob(pool);
    console.log(result);
  });

  // Expired event image cleanup at 2:00 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] Running daily expired event image cleanup job...');
    const result = await runExpiredEventCleanupJob(pool);
    console.log(result);
  });

  console.log('[Cron] Daily push alert job scheduled for 9:00 AM IST.');
  console.log('[Cron] Daily expired event cleanup job scheduled for 2:00 AM UTC.');
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
