import { Pool } from 'pg';
import { runArchiveJob } from '../cron';
import { initializeDatabaseSchema } from '../queries/init';
import { config } from '../config';

async function runTest() {
  console.log('[Test] Connecting to database...');
  const pool = new Pool({
    connectionString: config.DATABASE_URL
  });

  try {
    console.log('[Test] Ensuring DB schema...');
    await initializeDatabaseSchema(pool);

    const email = 'test_attendee@gmail.com';
    const name = 'Test Attendee';
    const telegramUsername = '@vibe_test_user';

    console.log('[Test] Creating mock user...');
    await pool.query(
      `INSERT INTO web_users (email, name, categories, telegram_username) 
       VALUES ($1, $2, '["Music"]'::jsonb, $3)
       ON CONFLICT (email) DO UPDATE SET telegram_username = EXCLUDED.telegram_username`,
      [email, name, telegramUsername]
    );

    console.log('[Test] Creating mock event in the past...');
    // Create a mock event starting and ending in the past
    const eventResult = await pool.query(
      `INSERT INTO events (title, description, category, date_time, end_time, status)
       VALUES ($1, $2, 'Music', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours', 'approved')
       RETURNING id, title`
    , ['Past Live Concert', 'A retrospectively great concert at RK Beach']);
    const event = eventResult.rows[0];
    console.log(`[Test] Created past event: "${event.title}" (ID: ${event.id})`);

    console.log('[Test] Adding RSVP for test user...');
    await pool.query(
      `INSERT INTO event_rsvps (event_id, user_email)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [event.id, email]
    );

    console.log('[Test] Running runArchiveJob()...');
    const log = await runArchiveJob(pool);
    console.log('\n--- ARCHIVE JOB LOG ---');
    console.log(log);
    console.log('-----------------------\n');

    console.log('[Test] Checking if event was archived...');
    const verifyResult = await pool.query(`SELECT status FROM events WHERE id = $1`, [event.id]);
    const finalStatus = verifyResult.rows[0]?.status;
    console.log(`[Test] Event status in DB: "${finalStatus}"`);

    if (finalStatus === 'archived') {
      console.log('[Test] SUCCESS: Event was archived successfully!');
    } else {
      console.error('[Test] FAILURE: Event status was not archived!');
    }

    console.log('[Test] Cleaning up test records...');
    await pool.query(`DELETE FROM feedbacks WHERE event_id = $1`, [event.id]);
    await pool.query(`DELETE FROM event_rsvps WHERE event_id = $1`, [event.id]);
    await pool.query(`DELETE FROM events WHERE id = $1`, [event.id]);
    await pool.query(`DELETE FROM web_users WHERE email = $1`, [email]);
    console.log('[Test] Cleanup done.');

  } catch (error) {
    console.error('[Test] Error running integration test:', error);
  } finally {
    await pool.end();
  }
}

runTest();
