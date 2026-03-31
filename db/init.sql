-- Ensure the vector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop old tables if they exist to start fresh
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TYPE IF EXISTS event_category CASCADE;
DROP TYPE IF EXISTS admin_role CASCADE;

-- Enum for Event Categories
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

-- Enum for Admin Roles
CREATE TYPE admin_role AS ENUM ('SuperAdmin', 'Editor');

-- 1. Users Table (Tier 2 - WhatsApp-linked users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Web Users Table (Tier 1 - Google-authenticated web users)
CREATE TABLE IF NOT EXISTS web_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    categories JSONB DEFAULT '[]'::jsonb, -- toggled interest categories
    phone_number VARCHAR(255) UNIQUE,     -- optional: links to users table for WhatsApp features
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role admin_role DEFAULT 'Editor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2b. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value)
VALUES ('cron_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category event_category NOT NULL DEFAULT 'General',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    date_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(255),
    age_group int4range, -- PostgreSQL range type for [min, max]
    external_link TEXT,
    contact_info VARCHAR(255),
    embedding vector(1024), -- Assuming 1024 dimensions for mxbai-embed-large (Ollama)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW index on events for fast similarity search using cosine distance
CREATE INDEX ON events USING hnsw (embedding vector_cosine_ops);
