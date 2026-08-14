import cron from 'node-cron';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';
import { getChatModel } from './rag';
import { initSystemSettings, getSystemSetting } from './queries/analytics';
import { getRecentEvents, getArchivedEventsToProcess, archiveEvent, getAdminEventRSVPs } from './queries/events';
import { getUsersWithPreferences } from './queries/users';
import { getUserBlocks } from './queries/blocks';
import { sendTelegramMessage } from './telegram';
import { config } from './config';

const WHATSAPP_PHONE_NUMBER_ID = config.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Proactive Push Alerts — core job logic.
 * Called by the daily cron AND by the /admin/trigger-cron dev route.
 */
export async function runMatchmakerJob(pool: Pool): Promise<string> {
  const log: string[] = [];

  if (!WHATSAPP_PHONE_NUMBER_ID) {
    log.push('[Cron] No WHATSAPP_PHONE_NUMBER_ID set — skipping push alerts.');
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

    log.push(`[Cron] Found ${newEvents.length} new event(s). Checking user preferences...`);

    // Step 2: Get all WhatsApp-linked users with preferences
    const users = await getUsersWithPreferences(pool);

    log.push(`[Cron] ${users.length} user(s) with saved preferences.`);

    const llm = getChatModel();

    // Step 3: For each user, perform semantic matchmaking
    for (const user of users) {
      const firstName = user.name?.split(' ')[0] ?? 'there';
      const userPrefsStr = JSON.stringify(user.preferences || {});

      // Filter events created by blocked organizers for this user
      let userEvents = newEvents;
      if (user.email) {
        const blockedOrganizers = await getUserBlocks(pool, user.email);
        if (blockedOrganizers.length > 0) {
          userEvents = newEvents.filter((ev: any) => !ev.organizer_email || !blockedOrganizers.includes(ev.organizer_email));
        }
      }

      if (userEvents.length === 0) {
        log.push(`[Cron Matchmaker] All events filtered by blocklist for ${user.phone_number}. Skipping.`);
        continue;
      }

      // Compact events payload to minimize tokens for this specific user
      const compactEvents = userEvents.map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        category: ev.category,
        location: ev.location,
        date: new Date(ev.date_time).toLocaleString('en-IN')
      }));

      const systemPrompt = `You are the VibeCheck Proactive Matchmaker AI.
You evaluate if brand new events match a specific user's preferences.
User Preferences: ${userPrefsStr}

New Events array:
${JSON.stringify(compactEvents)}

Task:
1. Do any of these new events strongly align with the user's vibe/categories/city?
2. If YES, craft a 2-3 sentence personalized WhatsApp alert to send to them. Greet them by their name (${firstName}). Focus on why the events fit their specific vibe!
3. If NO (nothing matches strongly), output EXACTLY the phrase: NO_MATCH
Do not output anything else if NO_MATCH. No explanations.`;

      const response = await llm.invoke([['system', systemPrompt]]);
      const aiMessage = (response.content as string).trim();

      if (aiMessage === 'NO_MATCH' || aiMessage.includes('NO_MATCH')) {
        log.push(`[Cron Matchmaker] No match for ${user.phone_number}. Skipping.`);
        continue;
      }

      const message = aiMessage + `\n\n_(Reply with any questions to chat with me!)_`;

      await sendWhatsAppMessage(WHATSAPP_PHONE_NUMBER_ID, user.phone_number, message);
      log.push(`[Cron Matchmaker] AI Alert sent to ${user.phone_number}`);

      // Small delay between calls to avoid rate limits
      await new Promise(r => setTimeout(r, 600));
    }

    log.push('[Cron] Push alert job complete.');
  } catch (error: any) {
    log.push(`[Cron] Error during push alert job: ${error.message}`);
    console.error('[Cron] Error during push alert job:', error);
  }

  return log.join('\n');
}

/**
 * Event Archiving and Feedback Notification Job.
 * Finds all approved/live events in the past, notifies attendees via Telegram, and sets status to 'archived'.
 */
export async function runArchiveJob(pool: Pool): Promise<string> {
  const log: string[] = [];
  try {
    const eventsToArchive = await getArchivedEventsToProcess(pool);
    if (eventsToArchive.length === 0) {
      return '[Archive Cron] No ended events to archive.';
    }

    log.push(`[Archive Cron] Found ${eventsToArchive.length} ended event(s) to process.`);

    for (const event of eventsToArchive) {
      log.push(`[Archive Cron] Processing event "${event.title}" (ID: ${event.id})`);

      // Fetch attendees (RSVPs)
      const attendees = await getAdminEventRSVPs(pool, event.id);
      let notifiedCount = 0;

      for (const attendee of attendees) {
        if (attendee.telegram_username) {
          const feedbackLink = `${config.VIBECHECK_WEB_URL}/event/${event.id}/feedback`;
          const messageText = `Hey ${attendee.name || 'Friend'}! 🌟 Hope you had a great time at <b>${event.title}</b>.\n\nPlease rate your experience and share feedback here:\n${feedbackLink}`;
          
          try {
            await sendTelegramMessage(attendee.telegram_username, messageText);
            notifiedCount++;
          } catch (err: any) {
            console.error(`Failed to send Telegram message to ${attendee.telegram_username}:`, err);
          }
        }
      }

      // Archive the event in DB
      await archiveEvent(pool, event.id);
      log.push(`[Archive Cron] Event "${event.title}" archived. Notified ${notifiedCount} attendee(s) on Telegram.`);
    }

    log.push('[Archive Cron] Archiving job complete.');
  } catch (error: any) {
    log.push(`[Archive Cron] Error during archiving job: ${error.message}`);
    console.error('[Archive Cron] Error during archiving job:', error);
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

  // Run the event archive and feedback notification job every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Running event archiving and feedback notification job...');
    const result = await runArchiveJob(pool);
    console.log(result);
  });

  console.log('[Cron] Daily push alert job scheduled for 9:00 AM IST.');
  console.log('[Cron] Event archiving job scheduled to run every 10 minutes.');
}
