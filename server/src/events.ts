import { Request, Response } from 'express';
import { Pool } from 'pg';

export async function getEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { category, search, city } = req.query;
    
    let queryText = `
      SELECT id, title, description, location, city, date_time, category 
      FROM events
      WHERE (status = 'approved' OR status IS NULL)
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'All') {
      // Must cast the parameter to the specific enum type for Postgres
      queryText += ` AND category = $${paramIndex}::event_category`;
      queryParams.push(category);
      paramIndex++;
    }

    if (city) {
      queryText += ` AND city = $${paramIndex}`;
      queryParams.push(city);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY date_time ASC LIMIT 50;`;

    const result = await pool.query(queryText, queryParams);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getSingleEventHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, title, description, location, city, date_time, category 
       FROM events WHERE id = $1 AND (status = 'approved' OR status IS NULL)`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching single event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function rsvpEventHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    await pool.query(`
      INSERT INTO event_rsvps (event_id, user_email)
      VALUES ($1, $2)
      ON CONFLICT (event_id, user_email) DO NOTHING;
    `, [id, email]);

    return res.json({ success: true, message: 'RSVP confirmed' });
  } catch (error) {
    console.error('Error handling RSVP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function checkRsvpHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.json({ success: true, rsvped: false });
    }

    const { rows } = await pool.query(`
      SELECT 1 FROM event_rsvps WHERE event_id = $1 AND user_email = $2
    `, [id, email]);

    return res.json({ success: true, rsvped: rows.length > 0 });
  } catch (error) {
    console.error('Error checking RSVP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
