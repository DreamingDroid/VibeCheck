import { Request, Response } from 'express';
import { Pool } from 'pg';

export async function organizerCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, date_time, external_link, contact_info, organizer_email } = req.body;
  
  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, date_time, external_link, contact_info, status, organizer_email)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, 'pending', $8)
       RETURNING id, title, status`,
      [title, description, category, location || null, date_time, external_link || null, contact_info || null, organizer_email]
    );
    res.json({ success: true, data: rows[0], message: 'Event submitted for approval.' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerGetEventsHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, location, date_time, status, created_at 
       FROM events WHERE organizer_email = $1 ORDER BY date_time DESC`,
      [email]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
