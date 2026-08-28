const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://lead_arch:password123@localhost:5433/vibecheck_db';
const pool = new Pool({ connectionString });

async function migrate() {
  try {
    console.log('Adding image_url and rating columns to admins table...');
    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS image_url TEXT;');
    await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS rating NUMERIC(3,1) DEFAULT 4.5;');
    console.log('Successfully updated schema!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
