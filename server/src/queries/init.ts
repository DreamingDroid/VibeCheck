import { Pool } from 'pg';

export async function initializeDatabaseSchema(pool: Pool) {
  // 1. Ensure the pgvector extension is available
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`).catch((err) => {
    console.error('Failed to create vector extension:', err.message);
  });

  // 2. Create Enums
  await pool.query(`
    CREATE TYPE event_category AS ENUM (
      'Sports', 'Arts', 'Education', 'Spiritual', 'Music', 'Food', 'Wellness', 'Indie', 'Techno', 'General'
    );
  `).catch(() => {}); // Ignore if already exists

  await pool.query(`
    CREATE TYPE admin_role AS ENUM ('SuperAdmin', 'Editor', 'organizer');
  `).catch(() => {}); // Ignore if already exists

  // 3. Create Users table (WhatsApp Users / Tier 2)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      preferences JSONB DEFAULT '{}'::jsonb,
      chat_history JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Create Web Users table (Google-authenticated / Tier 1)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS web_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      categories JSONB DEFAULT '[]'::jsonb,
      phone_number VARCHAR(255) UNIQUE,
      city VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Create Admins & Organizers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      role admin_role DEFAULT 'Editor',
      status VARCHAR(50) DEFAULT 'pending_approval',
      brand_name VARCHAR(255),
      description TEXT,
      social_links JSONB,
      phone_number VARCHAR(255) UNIQUE,
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false,
      rejection_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Create System Settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT 'null'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default system settings
  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('cron_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `);

  // 7. Create Events table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category event_category NOT NULL DEFAULT 'General',
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      date_time TIMESTAMP WITH TIME ZONE,
      location VARCHAR(255),
      city VARCHAR(100),
      age_group int4range,
      external_link TEXT,
      google_maps_link TEXT,
      contact_info VARCHAR(255),
      embedding vector(1024),
      status VARCHAR(20) DEFAULT 'approved',
      organizer_email TEXT,
      admin_comment TEXT,
      participant_limit INTEGER,
      is_paid BOOLEAN DEFAULT false,
      image_url VARCHAR(1000),
      image_public_id VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index on event embeddings
  await pool.query(`
    CREATE INDEX IF NOT EXISTS events_embedding_hnsw_idx ON events USING hnsw (embedding vector_cosine_ops);
  `).catch((err) => {
    console.error('Failed to create hnsw index:', err.message);
  });

  // 8. Create Event RSVPs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id SERIAL PRIMARY KEY,
      event_id UUID REFERENCES events(id) ON DELETE CASCADE,
      user_email TEXT,
      phone_number TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_email)
    );
  `);

  // 9. Create Cities table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Create Organizer Followers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizer_followers (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) REFERENCES web_users(email) ON DELETE CASCADE,
      organizer_email VARCHAR(255) REFERENCES admins(email) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      unique(user_email, organizer_email)
    );
  `);

  // 10b. Create Organizer CRM Notes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizer_crm_notes (
      id SERIAL PRIMARY KEY,
      organizer_email VARCHAR(255) REFERENCES admins(email) ON DELETE CASCADE,
      contact_email VARCHAR(255) NOT NULL,
      notes TEXT DEFAULT '',
      tags VARCHAR(100)[] DEFAULT '{}'::VARCHAR(100)[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organizer_email, contact_email)
    );
  `);

  // 11. Create News Articles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS news_articles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(100) DEFAULT 'General',
      author VARCHAR(255) DEFAULT 'VibeCheck Editorial',
      image_url TEXT,
      image_public_id VARCHAR(255),
      city VARCHAR(100) DEFAULT 'Vizag',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Schema Migration Safeguards ───────────────────────────────────────────
  // These keep backward compatibility with older database builds. Since this is a
  // fresh schema, they will mostly act as no-ops.
  await pool.query(`ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'organizer'`).catch(() => {});
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_approval'`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255)`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS social_links JSONB`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_number VARCHAR(255)`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved'`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_email TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
  await pool.query(`ALTER TABLE event_rsvps ADD COLUMN IF NOT EXISTS phone_number TEXT`);
  await pool.query(`ALTER TABLE event_rsvps ALTER COLUMN user_email DROP NOT NULL`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS admin_comment TEXT`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS participant_limit INTEGER`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE web_users ADD COLUMN IF NOT EXISTS is_editor BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Vizag'`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000)`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255)`);
  await pool.query(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255)`);


  // Migration safeguard for organizer_crm_notes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizer_crm_notes (
      id SERIAL PRIMARY KEY,
      organizer_email VARCHAR(255) REFERENCES admins(email) ON DELETE CASCADE,
      contact_email VARCHAR(255) NOT NULL,
      notes TEXT DEFAULT '',
      tags VARCHAR(100)[] DEFAULT '{}'::VARCHAR(100)[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organizer_email, contact_email)
    );
  `).catch(() => {});

  // 12. Create Broadcasts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      scope VARCHAR(50) NOT NULL,
      target_city VARCHAR(100),
      target_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
      target_category VARCHAR(100),
      sender_email VARCHAR(255) NOT NULL,
      sender_role VARCHAR(50) DEFAULT 'admin',
      recipient_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((err) => {
    console.error('Failed to create broadcasts table:', err.message);
  });

  // 13. Create User In-App Notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
      user_email VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      is_read BOOLEAN DEFAULT false,
      link TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((err) => {
    console.error('Failed to create user_notifications table:', err.message);
  });

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_email_created ON user_notifications (user_email, created_at DESC);
  `).catch(() => {});
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications (user_email, is_read);
  `).catch(() => {});

  // 14. Create FCM Tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      token TEXT UNIQUE NOT NULL,
      device_info TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((err) => {
    console.error('Failed to create fcm_tokens table:', err.message);
  });
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_fcm_tokens_email ON fcm_tokens (user_email);
  `).catch(() => {});

  // Seed default cities if empty
  const { rows: cityRows } = await pool.query('SELECT COUNT(*) FROM cities');
  if (parseInt(cityRows[0].count) === 0) {
    const initialCities = ['Vizag', 'Bangalore', 'London'];
    for (const city of initialCities) {
      await pool.query('INSERT INTO cities (name) VALUES ($1) ON CONFLICT DO NOTHING', [city]);
    }
    console.log('Seeded initial cities');
  }
}
