import 'web-streams-polyfill/polyfill';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// MUST LOAD DOTENV BEFORE ANY LOCAL IMPORTS
const appEnv = process.env.APP_ENV || 'local';
const envFile = `.env.${appEnv}`;
console.log(`[Server] Loading environment: ${appEnv} (${envFile})`);
const result = dotenv.config({ path: path.join(__dirname, '..', envFile) });
if (result.error) {
  console.log(`[Server] Error loading ${envFile}, falling back to .env:`, result.error.message);
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';
import { handleEventQuery, saveUserPreferences } from './rag';
import { verifyWebhook, handleIncomingMessage } from './whatsapp';
import { getEventsHandler, getSingleEventHandler, rsvpEventHandler, checkRsvpHandler } from './events';
import { getWebUserHandler, saveWebUserHandler } from './webPreferences';
import { organizerCreateEventHandler, organizerGetEventsHandler, organizerGetEventRsvpsHandler, getBroadcastStatsHandler, broadcastMessageHandler, organizerUpdateEventHandler, organizerGeneratePromoHandler, organizerGetEventAnalyticsHandler } from './organizer';
import { getCitiesHandler } from './cities';
import { checkAdminHandler, adminGetEventsHandler, adminCreateEventHandler, adminUpdateEventHandler, adminDeleteEventHandler, adminAnalyticsHandler, adminGetSettingsHandler, adminUpdateSettingsHandler, adminGetEventRsvpsHandler, adminAddOrganizerHandler, adminGetOrganizersHandler, adminGetPendingOrganizersHandler, adminApproveOrganizerHandler, adminRejectOrganizerHandler, adminGetPendingEventsHandler, adminReviewEventHandler, adminGetEventsByStatusHandler, adminAddCityHandler, adminDeleteCityHandler } from './admin';
import { startPushAlertCron, runMatchmakerJob } from './cron';
import { sendVerificationCodeHandler, verifyPhoneNumberHandler } from './verification';
import { followOrganizerHandler, unfollowOrganizerHandler, getUserFollowingHandler, getOrganizerFollowersHandler } from './followers';
import { sendApplyOtpHandler, verifyApplyOtpHandler, submitApplicationHandler } from './organizer-apply';
import { initializeDatabaseSchema } from './queries/init';
import { config } from './config';

console.log('Loaded VERIFY_TOKEN:', config.WHATSAPP_VERIFY_TOKEN);

const app = express();
const port = config.PORT;

app.use(cors());
app.use(express.json());

// Global Request Logger to trace ghost webhooks
app.use((req, res, next) => {
  console.log(`\n--- Incoming ${req.method} ${req.originalUrl} ---`);
  console.log(`User-Agent: ${req.headers['user-agent']}`);
  if (req.method === 'POST' && req.body) {
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr) {
      console.log(`Body:`, bodyStr.substring(0, 500));
    }
  }
  next();
});

const connectionString = config.DATABASE_URL;

console.log('Using DATABASE_URL for API:', connectionString);

const pool = new Pool({
  connectionString,
});

pool.on('connect', async (client) => {
  try {
    await registerType(client);
  } catch (err) {
    console.error('Failed to register pgvector on connect:', err);
  }
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('[DB] Ensuring database schema...');

    // Core tables used globally
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_rsvps (
        id SERIAL PRIMARY KEY,
        event_id UUID REFERENCES events(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_email)
      );
    `);

    // Bootstrap data schema via DAL
    await initializeDatabaseSchema(client as any);

    console.log('[DB] Database schema is up to date.');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  } finally {
    client.release();
  }
}

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].current_time,
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: (error as Error).message,
    });
  }
});

app.post('/query', async (req, res) => {
  try {
    const result = await handleEventQuery(pool, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling /query:', error);
    res.status(400).json({
      error: (error as Error).message,
    });
  }
});

app.post('/preferences', async (req, res) => {
  try {
    const result = await saveUserPreferences(pool, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling /preferences:', error);
    res.status(400).json({
      error: (error as Error).message,
    });
  }
});

app.get('/webhook', verifyWebhook);
app.post('/webhook', (req, res) => handleIncomingMessage(req, res, pool));

// Serve the Event Discovery data to the Next.js frontend
app.get('/api/events', (req, res) => getEventsHandler(req, res, pool));
app.get('/api/events/:id', (req, res) => getSingleEventHandler(req, res, pool));
app.post('/api/events/:id/rsvp', (req, res) => rsvpEventHandler(req, res, pool));
app.get('/api/events/:id/rsvp/check', (req, res) => checkRsvpHandler(req, res, pool));

// Web User Preferences API (Tier 1 + Tier 2 linking)
app.get('/api/user', (req, res) => getWebUserHandler(req, res, pool));
app.post('/api/user', (req, res) => saveWebUserHandler(req, res, pool));

// Organizer Application & Verification API
app.post('/api/apply/send-otp', sendApplyOtpHandler);
app.post('/api/apply/verify-otp', verifyApplyOtpHandler);
app.post('/api/apply/submit', (req, res) => submitApplicationHandler(req, res, pool));

// Admin API
app.get('/api/admin/check', (req, res) => checkAdminHandler(req, res, pool));
app.get('/api/admin/events', (req, res) => adminGetEventsHandler(req, res, pool));
app.get('/api/admin/events/:id/rsvps', (req, res) => adminGetEventRsvpsHandler(req, res, pool));
app.post('/api/admin/events', (req, res) => adminCreateEventHandler(req, res, pool));
app.put('/api/admin/events/:id', (req, res) => adminUpdateEventHandler(req, res, pool));
app.delete('/api/admin/events/:id', (req, res) => adminDeleteEventHandler(req, res, pool));
app.get('/api/admin/analytics', (req, res) => adminAnalyticsHandler(req, res, pool));
app.get('/api/admin/settings', (req, res) => adminGetSettingsHandler(req, res, pool));
app.post('/api/admin/settings', (req, res) => adminUpdateSettingsHandler(req, res, pool));

app.get('/api/admin/organizers', (req, res) => adminGetOrganizersHandler(req, res, pool));
app.post('/api/admin/organizers', (req, res) => adminAddOrganizerHandler(req, res, pool));
app.get('/api/admin/organizers/pending', (req, res) => adminGetPendingOrganizersHandler(req, res, pool));
app.post('/api/admin/organizers/:id/approve', (req, res) => adminApproveOrganizerHandler(req, res, pool));
app.post('/api/admin/organizers/:id/reject', (req, res) => adminRejectOrganizerHandler(req, res, pool));

app.get('/api/admin/events/pending', (req, res) => adminGetPendingEventsHandler(req, res, pool));
app.get('/api/admin/events/status/:status', (req, res) => adminGetEventsByStatusHandler(req, res, pool));
app.put('/api/admin/events/:id/review', (req, res) => adminReviewEventHandler(req, res, pool));

// Cities API
app.get('/api/cities', (req, res) => getCitiesHandler(req, res, pool));
app.post('/api/admin/cities', (req, res) => adminAddCityHandler(req, res, pool));
app.delete('/api/admin/cities/:id', (req, res) => adminDeleteCityHandler(req, res, pool));

// Organizer API
app.get('/api/organizer/events', (req, res) => organizerGetEventsHandler(req, res, pool));
app.post('/api/organizer/events', (req, res) => organizerCreateEventHandler(req, res, pool));
app.put('/api/organizer/events/:id', (req, res) => organizerUpdateEventHandler(req, res, pool));
app.get('/api/organizer/events/:id/rsvps', (req, res) => organizerGetEventRsvpsHandler(req, res, pool));
app.get('/api/organizer/events/:id/broadcast-stats', (req, res) => getBroadcastStatsHandler(req, res, pool));
app.post('/api/organizer/events/:id/broadcast', (req, res) => broadcastMessageHandler(req, res, pool));
app.get('/api/organizer/events/:id/promo', (req, res) => organizerGeneratePromoHandler(req, res, pool));
app.get('/api/organizer/events/:id/analytics', (req, res) => organizerGetEventAnalyticsHandler(req, res, pool));
app.get('/api/organizer/followers', (req, res) => getOrganizerFollowersHandler(req, res, pool));

// Followers API
app.post('/api/followers', (req, res) => followOrganizerHandler(req, res, pool));
app.delete('/api/followers', (req, res) => unfollowOrganizerHandler(req, res, pool));
app.get('/api/followers/user/:email', (req, res) => getUserFollowingHandler(req, res, pool));

// Verification API
app.post('/api/verify/send-code', (req, res) => sendVerificationCodeHandler(req, res, pool));
app.post('/api/verify/confirm-code', (req, res) => verifyPhoneNumberHandler(req, res, pool));

// ── Dev-only: manually trigger the AI Matchmaker for testing ─────────────────
app.post('/admin/trigger-cron', async (req, res) => {
  try {
    console.log('[Dev] Manually triggering AI Matchmaker Cron...');
    const result = await runMatchmakerJob(pool);
    console.log(result);
    res.json({ success: true, log: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, async () => {
  console.log(`[server]: VibeCheck API is running at http://localhost:${port}`);
  await initializeDatabase();
  startPushAlertCron(pool);
});

