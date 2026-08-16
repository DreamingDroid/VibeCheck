const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables dynamically based on APP_ENV
const appEnv = process.env.APP_ENV || 'local';
const envFile = `.env.${appEnv}`;
const result = dotenv.config({ path: path.join(__dirname, envFile) });
if (result.error) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkUsers() {
  try {
    console.log("==================================================");
    console.log("🔍 QUERYING VIBECHECK USER DATABASE");
    console.log(`📡 Connected to: ${process.env.DATABASE_URL.split('@')[1] || 'Local DB'}`);
    console.log("==================================================\n");

    // 1. Web Users
    const webUsersRes = await pool.query('SELECT id, email, name, phone_number, city, created_at FROM web_users ORDER BY created_at DESC');
    console.log(`🌐 WEB USERS (Google Sign-In) [Total: ${webUsersRes.rowCount}]`);
    if (webUsersRes.rowCount > 0) {
      console.table(webUsersRes.rows.map(r => ({
        ID: r.id.substring(0, 8) + '...',
        Email: r.email,
        Name: r.name || 'N/A',
        Phone: r.phone_number || 'N/A',
        City: r.city || 'N/A',
        Joined: new Date(r.created_at).toLocaleDateString()
      })));
    } else {
      console.log("No web users registered yet.\n");
    }

    // 2. WhatsApp Users
    const waUsersRes = await pool.query('SELECT id, phone_number, name, created_at FROM users ORDER BY created_at DESC');
    console.log(`💬 WHATSAPP USERS [Total: ${waUsersRes.rowCount}]`);
    if (waUsersRes.rowCount > 0) {
      console.table(waUsersRes.rows.map(r => ({
        ID: r.id.substring(0, 8) + '...',
        Phone: r.phone_number,
        Name: r.name || 'N/A',
        Joined: new Date(r.created_at).toLocaleDateString()
      })));
    } else {
      console.log("No WhatsApp users registered yet.\n");
    }

    // 3. Admins / Organizers / Editors
    const columnsRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins'
    `);
    const adminCols = columnsRes.rows.map(r => r.column_name);

    if (adminCols.length > 0) {
      const selectCols = [];
      if (adminCols.includes('id')) selectCols.push('id');
      selectCols.push('email');
      if (adminCols.includes('role')) selectCols.push('role');
      if (adminCols.includes('status')) selectCols.push('status');
      if (adminCols.includes('brand_name')) selectCols.push('brand_name');
      if (adminCols.includes('phone_number')) selectCols.push('phone_number');
      if (adminCols.includes('created_at')) selectCols.push('created_at');

      const queryStr = `SELECT ${selectCols.join(', ')} FROM admins` + (adminCols.includes('created_at') ? ' ORDER BY created_at DESC' : '');
      const adminsRes = await pool.query(queryStr);
      
      console.log(`🔑 ADMINS, EDITORS & ORGANIZERS [Total: ${adminsRes.rowCount}]`);
      if (adminsRes.rowCount > 0) {
        console.table(adminsRes.rows.map(r => ({
          ID: r.id ? (r.id.substring(0, 8) + '...') : 'N/A',
          Email: r.email,
          Role: r.role || 'N/A',
          Status: r.status || 'N/A',
          Brand: r.brand_name || 'N/A',
          Phone: r.phone_number || 'N/A'
        })));
      } else {
        console.log("No admins/organizers registered yet.\n");
      }
    } else {
      console.log("🔑 ADMINS, EDITORS & ORGANIZERS");
      console.log("Table 'admins' does not exist in this database.\n");
    }

  } catch (err) {
    console.error("❌ Error querying database:", err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
