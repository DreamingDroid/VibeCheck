import cron from 'node-cron';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';
import { getChatModel } from './rag';

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL DEFAULT 'null'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      INSERT INTO system_settings (key, value)
      VALUES ('cron_enabled', 'false'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `);

    // Step 0: Check if Cron is enabled in settings
    const { rows: settings } = await pool.query(`SELECT value FROM system_settings WHERE key = 'cron_enabled'`);
    const rawValue = settings[0]?.value;
    const isEnabled = rawValue === true || rawValue === 'true';

    if (!isEnabled) {
      log.push('[Cron] Push alerts are disabled in admin settings. Skipping.');
      return log.join('\n');
    }

    // Step 1: Get events added in the last 48 hours
    const { rows: newEvents } = await pool.query(`
      SELECT id, title, category, location, date_time, description
      FROM events
      WHERE created_at >= NOW() - INTERVAL '48 hours'
      ORDER BY created_at DESC
    `);

    if (newEvents.length === 0) {
      log.push('[Cron] No new events in the last 48 hours. Skipping.');
      return log.join('\n');
    }

    log.push(`[Cron] Found ${newEvents.length} new event(s). Checking user preferences...`);

    // Step 2: Get all WhatsApp-linked users with preferences
    const { rows: users } = await pool.query(`
      SELECT phone_number, name, preferences
      FROM users
      WHERE preferences->'categories' IS NOT NULL
        AND jsonb_array_length(preferences->'categories') > 0
    `);

    log.push(`[Cron] ${users.length} user(s) with saved preferences.`);

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
      const userPrefsStr = JSON.stringify(user.preferences || {});

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

  console.log('[Cron] Daily push alert job scheduled for 9:00 AM IST.');
}
