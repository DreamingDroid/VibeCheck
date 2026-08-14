import { Pool } from 'pg';

export async function getWebUserByEmail(pool: Pool, email: string) {
  const { rows } = await pool.query(
    `SELECT email, name, categories, phone_number, city, telegram_username FROM web_users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

export async function upsertWebUser(pool: Pool, email: string, name: string | null, categories: any[], phone_number: string | null, city: string | null, telegram_username: string | null) {
  await pool.query(
    `INSERT INTO web_users (email, name, categories, phone_number, city, telegram_username)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE
     SET name       = EXCLUDED.name,
         categories = EXCLUDED.categories,
         phone_number = COALESCE(EXCLUDED.phone_number, web_users.phone_number),
         city       = EXCLUDED.city,
         telegram_username = EXCLUDED.telegram_username,
         updated_at = CURRENT_TIMESTAMP`,
    [email, name, JSON.stringify(categories), phone_number, city, telegram_username]
  );
}

export async function upsertUserPreferencesFromWeb(pool: Pool, phone_number: string, name: string | null, categories: any[], city: string | null) {
  await pool.query(
    `INSERT INTO users (phone_number, name, preferences)
     VALUES ($1, $2, jsonb_build_object('categories', $3::jsonb, 'city', $4::text))
     ON CONFLICT (phone_number) DO UPDATE
     SET name = EXCLUDED.name,
         preferences = jsonb_set(
           jsonb_set(
             COALESCE(users.preferences, '{}'::jsonb),
             '{categories}', $3::jsonb
           ),
           '{city}', to_jsonb($4::text)
         ),
         updated_at = CURRENT_TIMESTAMP`,
    [phone_number, name, JSON.stringify(categories), city]
  );
}

export async function getUserByPhone(pool: Pool, phone: string) {
  const { rows } = await pool.query(
    `SELECT phone_number, name, preferences, chat_history FROM users WHERE phone_number = $1`,
    [phone]
  );
  return rows[0] || null;
}

export async function createUser(pool: Pool, phone: string, name: string) {
  await pool.query(
    `INSERT INTO users (phone_number, name, preferences, chat_history)
     VALUES ($1, $2, '{}'::jsonb, '[]'::jsonb)`,
    [phone, name]
  );
}

export async function updateUserChatHistory(pool: Pool, phone: string, chatHistory: any[]) {
  await pool.query(
    `UPDATE users SET chat_history = $1::jsonb WHERE phone_number = $2`, 
    [JSON.stringify(chatHistory), phone]
  );
}

export async function updateUserInteractionHistory(pool: Pool, phone: string, history: any[]) {
  await pool.query(
    `UPDATE users SET preferences = jsonb_set(
        COALESCE(preferences, '{}'::jsonb),
        '{interaction_history}',
        $1::jsonb
    ) WHERE phone_number = $2`,
    [JSON.stringify(history), phone]
  );
}

export async function getUsersWithPreferences(pool: Pool) {
  const { rows } = await pool.query(`
    SELECT u.phone_number, u.name, u.preferences, w.email
    FROM users u
    LEFT JOIN web_users w ON u.phone_number = w.phone_number
    WHERE u.preferences->'categories' IS NOT NULL
      AND jsonb_array_length(u.preferences->'categories') > 0
  `);
  return rows;
}

export async function linkUserPhoneNumber(pool: Pool, email: string, phone: string) {
  const phoneFormatted = phone; 
  await pool.query(`UPDATE web_users SET phone_number = $1 WHERE email = $2`, [phoneFormatted, email]);

  const webUserResult = await pool.query('SELECT categories, name FROM web_users WHERE email = $1', [email]);
  const categories = webUserResult.rows[0]?.categories || [];
  const name = webUserResult.rows[0]?.name || 'Friend';

  await pool.query(
    `INSERT INTO users (phone_number, name, preferences)
     VALUES ($1, $2, jsonb_build_object('categories', $3::jsonb))
     ON CONFLICT (phone_number) DO UPDATE
     SET preferences = jsonb_set(
           COALESCE(users.preferences, '{}'::jsonb),
           '{categories}',
           $3::jsonb
         ),
         updated_at = CURRENT_TIMESTAMP`,
    [phoneFormatted, name, JSON.stringify(categories)]
  );
}
