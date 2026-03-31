import 'web-streams-polyfill/polyfill';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';
import { handleEventQuery, saveUserPreferences } from './rag';
import { verifyWebhook, handleIncomingMessage } from './whatsapp';
import { getEventsHandler, getSingleEventHandler } from './events';
import { getWebUserHandler, saveWebUserHandler } from './webPreferences';
import {
  checkAdminHandler, adminGetEventsHandler, adminCreateEventHandler,
  adminUpdateEventHandler, adminDeleteEventHandler, adminAnalyticsHandler,
  adminGetSettingsHandler, adminUpdateSettingsHandler
} from './admin';
import { startPushAlertCron } from './cron';

const result = dotenv.config({ path: 'c:/Users/trivi/vibecheck_ws/VibeCheck/server/.env' });
if (result.error) {
  console.log('Error loading .env file:', result.error);
}
console.log('Loaded VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN);

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://lead_arch:password123@localhost:5433/vibecheck_db';

console.log('Using DATABASE_URL for API:', connectionString);

const pool = new Pool({
  connectionString,
});

pool.on('connect', async (client) => {
  try {
    await registerType(client);
  } catch (err) {
    console.error('Failed to configure pgvector types on connect:', err);
  }
});

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

// Web User Preferences API (Tier 1 + Tier 2 linking)
app.get('/api/user', (req, res) => getWebUserHandler(req, res, pool));
app.post('/api/user', (req, res) => saveWebUserHandler(req, res, pool));

// Admin API
app.get('/api/admin/check', (req, res) => checkAdminHandler(req, res, pool));
app.get('/api/admin/events', (req, res) => adminGetEventsHandler(req, res, pool));
app.post('/api/admin/events', (req, res) => adminCreateEventHandler(req, res, pool));
app.put('/api/admin/events/:id', (req, res) => adminUpdateEventHandler(req, res, pool));
app.delete('/api/admin/events/:id', (req, res) => adminDeleteEventHandler(req, res, pool));
app.get('/api/admin/analytics', (req, res) => adminAnalyticsHandler(req, res, pool));
app.get('/api/admin/settings', (req, res) => adminGetSettingsHandler(req, res, pool));
app.post('/api/admin/settings', (req, res) => adminUpdateSettingsHandler(req, res, pool));

app.listen(port, () => {
  console.log(`[server]: VibeCheck API is running at http://localhost:${port}`);
  startPushAlertCron(pool);
});

