import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getWebUserByEmail, upsertWebUser, upsertUserPreferencesFromWeb } from './queries/users';

export async function getWebUserHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email query param required' });
  }
  try {
    const user = await getWebUserByEmail(pool, email);
    if (!user) {
      return res.json({ success: true, data: { email, categories: [], phone_number: null, city: null, profession: null, age_group: null } });
    }
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching web user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function saveWebUserHandler(req: Request, res: Response, pool: Pool) {
  const { email, name, categories, phone_number, city, profession, age_group } = req.body;
  if (!email || !Array.isArray(categories)) {
    return res.status(400).json({ success: false, error: 'email and categories[] required' });
  }
  try {
    // Upsert into web_users (Tier 1)
    await upsertWebUser(pool, email, name || null, categories, phone_number || null, city || null, profession || null, age_group || null);

    // If phone number given, also upsert into users (Tier 2 — WhatsApp table)
    if (phone_number) {
      await upsertUserPreferencesFromWeb(pool, phone_number, name || null, categories, city || null, profession || null, age_group || null);
    }

    return res.json({ success: true, message: 'Preferences saved.' });
  } catch (error) {
    console.error('Error saving web user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
