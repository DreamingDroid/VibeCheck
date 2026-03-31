const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: 'c:/Users/trivi/vibecheck_ws/VibeCheck/server/.env' });
const pool = new Pool();
pool.query('SELECT * FROM admins').then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(err => { console.log(err); process.exit(1); });
