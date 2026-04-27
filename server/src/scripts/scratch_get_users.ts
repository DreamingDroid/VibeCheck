import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../server/.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://lead_arch:password123@localhost:5433/vibecheck_db'
  });

  try {
    await client.connect();
    
    console.log('--- ADMINS & ORGANIZERS ---');
    const admins = await client.query('SELECT id, email, role, status FROM admins');
    console.table(admins.rows);

    console.log('\n--- WEB USERS ---');
    const webUsers = await client.query('SELECT email, name, phone_number, city FROM web_users');
    console.table(webUsers.rows);

    console.log('\n--- WHATSAPP USERS ---');
    const users = await client.query('SELECT phone_number, name FROM users');
    console.table(users.rows);

  } catch (error: any) {
    console.error('Error connecting to the database: ' + error.message);
  } finally {
    await client.end();
  }
}

main();
