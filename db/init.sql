-- ============================================================
-- VibeCheck — Complete Database Schema
-- Run this on a fresh database to set up the full schema.
-- ============================================================

-- Ensure the pgvector extension is available (required for AI embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- DROP existing objects (safe re-run order: dependents first)
-- ============================================================
DROP TABLE IF EXISTS organizer_followers CASCADE;
DROP TABLE IF EXISTS event_rsvps CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS web_users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TYPE IF EXISTS event_category CASCADE;
DROP TYPE IF EXISTS admin_role CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE event_category AS ENUM (
    'Sports',
    'Arts',
    'Education',
    'Spiritual',
    'Music',
    'Food',
    'Wellness',
    'Indie',
    'Techno',
    'General'
);

-- SuperAdmin: full platform control
-- Editor: can manage events
-- organizer: event organizer role
CREATE TYPE admin_role AS ENUM ('SuperAdmin', 'Editor', 'organizer');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. WhatsApp Users (Tier 2)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferences JSONB DEFAULT '{}'::jsonb,
    chat_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Web Users (Tier 1 — Google-authenticated)
CREATE TABLE IF NOT EXISTS web_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    categories JSONB DEFAULT '[]'::jsonb,       -- toggled interest categories
    phone_number VARCHAR(255) UNIQUE,            -- optional: links to users table for WhatsApp
    city VARCHAR(100),                           -- user's city for geo-filtering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Admins & Organizers
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
    image_url TEXT,
    rating NUMERIC(3,1) DEFAULT 4.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. System Settings (admin-controlled feature flags)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default system settings
INSERT INTO system_settings (key, value)
VALUES ('cron_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category event_category NOT NULL DEFAULT 'General',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    city VARCHAR(100),                           -- explicit city for global/multi-city support
    age_group int4range,                         -- PostgreSQL range type [min, max]
    external_link TEXT,
    google_maps_link TEXT,
    contact_info VARCHAR(255),
    embedding vector(1024),                      -- 1024 dims for mxbai-embed-large (Ollama)
    status VARCHAR(20) DEFAULT 'approved',       -- approved | pending | rejected
    organizer_email TEXT,                        -- links event to its organizer
    admin_comment TEXT,                          -- admin feedback on rejection/review
    participant_limit INTEGER,                   -- max number of allowed participants
    is_paid BOOLEAN DEFAULT false,               -- whether event is free or paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast cosine similarity search on event embeddings
CREATE INDEX ON events USING hnsw (embedding vector_cosine_ops);

-- 6. Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
    id SERIAL PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_email TEXT,                             -- NULL if RSVP came from WhatsApp
    phone_number TEXT,                           -- NULL if RSVP came from web
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_email)
);

-- 7. Cities (multi-city support)
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default cities
INSERT INTO cities (name) VALUES ('Vizag'), ('Bangalore'), ('London')
ON CONFLICT (name) DO NOTHING;

-- 8. Organizer Followers (CRM)
CREATE TABLE IF NOT EXISTS organizer_followers (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES web_users(email) ON DELETE CASCADE,
    organizer_email VARCHAR(255) REFERENCES admins(email) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, organizer_email)
);

-- 9. Broadcasts
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,                   -- general_update | event_reminder | emergency_alert | agenda_shift | event_rescheduled | event_cancellation
    scope VARCHAR(50) NOT NULL,                  -- global | city | event | category
    target_city VARCHAR(100),
    target_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    target_category VARCHAR(100),
    sender_email VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) DEFAULT 'admin',     -- admin | organizer
    recipient_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. User In-App Notifications
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

CREATE INDEX IF NOT EXISTS idx_user_notifications_email_created ON user_notifications (user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications (user_email, is_read);

