const { Pool } = require('pg');
const dotenv = require('dotenv');
const appEnv = process.env.APP_ENV || 'local';
const envFile = `.env.${appEnv}`;
const result = dotenv.config({ path: path.join(__dirname, envFile) });
if (result.error) {
  dotenv.config({ path: path.join(__dirname, '.env') });
}
const pool = new Pool();
pool.query('SELECT * FROM admins').then(res => {
  console.log(res.rows);
  process.exit(0);
}).catch(err => { console.log(err); process.exit(1); });
