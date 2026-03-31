const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
const pool = new Pool();
pool.query('SELECT * FROM admins').then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(err => { console.log(err); process.exit(1); });
