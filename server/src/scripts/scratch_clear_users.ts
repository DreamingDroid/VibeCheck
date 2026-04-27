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
    
    await client.query('BEGIN');

    console.log('Clearing WhatsApp users...');
    const delUsers = await client.query('DELETE FROM users');
    console.log(`Deleted ${delUsers.rowCount} WhatsApp users.`);

    console.log('Clearing Web users except agent.vibecheck@gmail.com...');
    const delWebUsers = await client.query(`DELETE FROM web_users WHERE email != 'agent.vibecheck@gmail.com'`);
    console.log(`Deleted ${delWebUsers.rowCount} Web users.`);

    console.log('Clearing Admins/Organizers except agent.vibecheck@gmail.com...');
    const delAdmins = await client.query(`DELETE FROM admins WHERE email != 'agent.vibecheck@gmail.com'`);
    console.log(`Deleted ${delAdmins.rowCount} Admins/Organizers.`);

    console.log('Ensuring agent.vibecheck@gmail.com is an approved SuperAdmin...');
    const updateAdmin = await client.query(`
      UPDATE admins 
      SET role = 'SuperAdmin', status = 'approved' 
      WHERE email = 'agent.vibecheck@gmail.com'
    `);
    
    if (updateAdmin.rowCount === 0) {
      console.log('User agent.vibecheck@gmail.com not found in admins table. Inserting...');
      await client.query(`
        INSERT INTO admins (email, role, status) 
        VALUES ('agent.vibecheck@gmail.com', 'SuperAdmin', 'approved')
      `);
    } else {
      console.log('Updated agent.vibecheck@gmail.com successfully.');
    }

    await client.query('COMMIT');
    console.log('Database cleanup completed successfully.');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error executing query: ' + error.message);
  } finally {
    await client.end();
  }
}

main();
