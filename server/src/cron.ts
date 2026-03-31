import cron from 'node-cron';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

/**
 * Proactive Push Alerts
 * Runs daily at 9:00 AM IST (3:30 AM UTC).
 * Finds events added in the last 48 hours and notifies users whose preferences match.
 */
export function startPushAlertCron(pool: Pool) {
  // "30 3 * * *" = 3:30 AM UTC = 9:00 AM IST
  cron.schedule('30 3 * * *', async () => {
    console.log('[Cron] Running daily push alert job...');

    if (!WHATSAPP_PHONE_NUMBER_ID) {
      console.log('[Cron] No WHATSAPP_PHONE_NUMBER_ID set — skipping push alerts.');
      return;
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
        console.log('[Cron] Push alerts are disabled in admin settings. Skipping.');
        return;
      }
      // Step 1: Get events added in the last 48 hours
      const { rows: newEvents } = await pool.query(`
        SELECT id, title, category, location, date_time, description
        FROM events
        WHERE created_at >= NOW() - INTERVAL '48 hours'
        ORDER BY created_at DESC
      `);

      if (newEvents.length === 0) {
        console.log('[Cron] No new events in the last 48 hours. Skipping.');
        return;
      }

      console.log(`[Cron] Found ${newEvents.length} new event(s). Checking user preferences...`);

      // Step 2: Get all WhatsApp-linked users with categories preferences
      const { rows: users } = await pool.query(`
        SELECT phone_number, name, preferences
        FROM users
        WHERE preferences->'categories' IS NOT NULL
          AND jsonb_array_length(preferences->'categories') > 0
      `);

      console.log(`[Cron] ${users.length} user(s) with saved preferences.`);

      // Step 3: For each user, find matching new events and notify
      for (const user of users) {
        const userCategories: string[] = user.preferences?.categories ?? [];
        const matchingEvents = newEvents.filter(ev => userCategories.includes(ev.category));

        if (matchingEvents.length === 0) continue;

        const firstName = user.name?.split(' ')[0] ?? 'there';
        const eventList = matchingEvents
          .slice(0, 3) // Max 3 events per alert
          .map(ev => {
            const date = new Date(ev.date_time).toLocaleDateString('en-IN', {
              weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            return `🎉 *${ev.title}*\n📅 ${date}\n📍 ${ev.location ?? 'Vizag'}\n_${ev.description.slice(0, 80)}..._`;
          })
          .join('\n\n');

        const message =
          `Hey ${firstName}! 👋 New events just dropped in Vizag that match your vibe:\n\n` +
          `${eventList}\n\n` +
          `Reply with any questions or _"show me more ${userCategories[0]} events"_ to explore!`;

        await sendWhatsAppMessage(WHATSAPP_PHONE_NUMBER_ID, user.phone_number, message);
        console.log(`[Cron] Alert sent to ${user.phone_number}`);

        // Small delay between messages to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }

      console.log('[Cron] Push alert job complete.');
    } catch (error) {
      console.error('[Cron] Error during push alert job:', error);
    }
  });

  console.log('[Cron] Daily push alert job scheduled for 9:00 AM IST.');
}
