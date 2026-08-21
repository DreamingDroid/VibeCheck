import { Pool } from 'pg';

export async function initializeDatabaseSchema(pool: Pool) {
  // Ensure admins table exists with roles
  await pool.query(`
    CREATE TYPE admin_role AS ENUM ('SuperAdmin', 'Editor', 'organizer');
  `).catch(() => {}); // Ignore if already exists
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      email VARCHAR(255) PRIMARY KEY,
      role admin_role DEFAULT 'Editor',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'organizer'`).catch(() => {});

  // Append organizer properties to admins table if missing in older schema versions
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_approval'`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255)`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS social_links JSONB`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255)`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);

  // Append new event properties seamlessly
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved'`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_email TEXT`);
  
  // Append missing columns implicitly as they were added in later iterations
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb`);
  
  // New columns for Web Preferences Tier 1 & 2 Syncing
  await pool.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  
  // Update RSVP system to track by phone if they come from WhatsApp, or email if Web
  await pool.query(`ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS phone_number TEXT`);
  await pool.query(`ALTER TABLE event_rsvps ALTER COLUMN user_email DROP NOT NULL`);

  // Ensure cities table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Admin comment for rejection / change request feedback
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_comment TEXT`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS participant_limit INTEGER`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`);

  // Organizer Followers CRM
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizer_followers (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) REFERENCES web_users(email) ON DELETE CASCADE,
      organizer_email VARCHAR(255) REFERENCES admins(email) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_email, organizer_email)
    );
  `);

  // Auto-seed default cities if empty
  const { rows: cityRows } = await pool.query('SELECT COUNT(*) FROM cities');
  if (parseInt(cityRows[0].count) === 0) {
      const initialCities = ['Vizag', 'Bangalore', 'London'];
      for (const city of initialCities) {
          await pool.query('INSERT INTO cities (name) VALUES ($1) ON CONFLICT DO NOTHING', [city]);
      }
      console.log('Seeded initial cities');
  }
}
