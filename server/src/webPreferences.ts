import { Request, Response } from 'express';
import { Pool } from 'pg';

export async function getWebUserHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email query param required' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT email, name, categories, phone_number, city FROM web_users WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) {
      return res.json({ success: true, data: { email, categories: [], phone_number: null, city: null } });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching web user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function saveWebUserHandler(req: Request, res: Response, pool: Pool) {
  const { email, name, categories, phone_number, city } = req.body;
  if (!email || !Array.isArray(categories)) {
    return res.status(400).json({ success: false, error: 'email and categories[] required' });
  }
  try {
    // Upsert into web_users (Tier 1)
    await pool.query(
      `INSERT INTO web_users (email, name, categories, phone_number, city)
       VALUES ($1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (email) DO UPDATE
       SET name       = EXCLUDED.name,
           categories = EXCLUDED.categories,
           phone_number = COALESCE(EXCLUDED.phone_number, web_users.phone_number),
           city       = EXCLUDED.city,
           updated_at = CURRENT_TIMESTAMP`,
      [email, name || null, JSON.stringify(categories), phone_number || null, city || null]
    );

    // If phone number given, also upsert into users (Tier 2 — WhatsApp table)
    // Categories and City stored under the same JSONB key so WhatsApp handlers can read them
    if (phone_number) {
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
        [phone_number, name || null, JSON.stringify(categories), city || null]
      );
    }

    return res.json({ success: true, message: 'Preferences saved.' });
  } catch (error) {
    console.error('Error saving web user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
