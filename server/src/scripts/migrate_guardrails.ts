import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

async function runMigration() {
  console.log('[Migration] Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('[Migration] Applying Guardrails & Support Ticket schemas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS moderation_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255),
          submitted_by VARCHAR(255),
          content_payload JSONB NOT NULL,
          fast_filter_passed BOOLEAN DEFAULT true,
          ai_score INTEGER,
          ai_decision VARCHAR(50) NOT NULL,
          flags JSONB DEFAULT '[]'::jsonb,
          ai_reason TEXT,
          admin_override VARCHAR(50),
          admin_override_by VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_mod_logs_entity ON moderation_logs (entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_mod_logs_created ON moderation_logs (created_at DESC);

      DO $$ BEGIN
          CREATE TYPE ticket_status AS ENUM ('open', 'ai_resolved', 'escalated', 'closed');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE ticket_category AS ENUM ('pass_booking', 'event_issue', 'organizer_inquiry', 'bug_report', 'other');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_number VARCHAR(50) UNIQUE NOT NULL,
          user_email VARCHAR(255),
          phone_number VARCHAR(50),
          category ticket_category DEFAULT 'other',
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status ticket_status DEFAULT 'open',
          ai_response TEXT,
          ai_confidence NUMERIC(3,2),
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets (status);
      CREATE INDEX IF NOT EXISTS idx_tickets_email ON support_tickets (user_email);
      CREATE INDEX IF NOT EXISTS idx_tickets_created ON support_tickets (created_at DESC);
    `);
    console.log('[Migration] Successfully created moderation_logs and support_tickets tables!');
  } catch (error) {
    console.error('[Migration] Failed to run migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
