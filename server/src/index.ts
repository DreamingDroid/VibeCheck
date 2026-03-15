import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { registerType } from 'pgvector/pg';

// Initialize environment variables — resolve path relative to this file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const port = process.env.PORT || 3000;

// Middleware configurations
app.use(cors());
app.use(express.json());

// Database Connection with direct PostgreSQL URL fallback for local Docker testing
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://lead_arch:password123@localhost:5432/vibecheck_db',
});

// Verify connection and register the pgvector type parsers for Pg interface
pool.on('connect', async (client) => {
  try {
     await registerType(client);
  } catch (err) {
    console.error('Failed to configure pgvector types on connect:', err);
  }
});

// Simple health endpoints ensuring DB connectivity
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: (error as Error).message
    });
  }
});

// Starting up the Application Service
app.listen(port, () => {
    console.log(`[server]: VibeCheck API is running at http://localhost:${port}`);
});
