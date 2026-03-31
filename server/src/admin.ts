import { Request, Response } from 'express';
import { Pool } from 'pg';

// Check if an email belongs to an admin
export async function checkAdminHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email required' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT email, role FROM admins WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) {
      return res.json({ success: true, isAdmin: false, isOrganizer: false });
    }
    const role = rows[0].role;
    // Legacy admins might have role = null or just be in the table without a specific label.
    // If they are specifically listed as 'organizer', they are purely an organizer.
    // Otherwise, they are a full admin.
    return res.json({ 
      success: true, 
      isAdmin: role !== 'organizer', 
      isOrganizer: role === 'organizer', 
      role 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Get all events (admin view - no limit)
export async function adminGetEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, category, location, date_time, description, external_link, contact_info
       FROM events ORDER BY date_time ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Create a new event
export async function adminCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, date_time, external_link, contact_info } = req.body;
  if (!title || !description || !category || !date_time) {
    return res.status(400).json({ success: false, error: 'title, description, category, and date_time are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, date_time, external_link, contact_info)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7)
       RETURNING id, title, category`,
      [title, description, category, location || null, date_time, external_link || null, contact_info || null]
    );
    res.json({ success: true, data: rows[0], message: 'Event created successfully.' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Update an event
export async function adminUpdateEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { title, description, category, location, date_time, external_link, contact_info } = req.body;
  try {
    await pool.query(
      `UPDATE events SET title=$1, description=$2, category=$3::event_category, location=$4,
       date_time=$5, external_link=$6, contact_info=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8`,
      [title, description, category, location, date_time, external_link || null, contact_info || null, id]
    );
    res.json({ success: true, message: 'Event updated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Delete an event
export async function adminDeleteEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM events WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Event deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Analytics data
export async function adminAnalyticsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const [eventsByCategory, totalEvents, webUsers, whatsappUsers, topPreferences] = await Promise.all([
      pool.query(`SELECT category, COUNT(*) as count FROM events GROUP BY category ORDER BY count DESC`),
      pool.query(`SELECT COUNT(*) as total FROM events`),
      pool.query(`SELECT COUNT(*) as total FROM web_users`),
      pool.query(`SELECT COUNT(*) as total FROM users`),
      pool.query(`
        SELECT cat.value AS category, COUNT(*) AS count
        FROM web_users, jsonb_array_elements_text(categories) AS cat(value)
        GROUP BY cat.value
        ORDER BY count DESC
        LIMIT 10
      `),
    ]);

    res.json({
      success: true,
      data: {
        eventsByCategory: eventsByCategory.rows,
        totalEvents: parseInt(totalEvents.rows[0].total),
        totalWebUsers: parseInt(webUsers.rows[0].total),
        totalWhatsappUsers: parseInt(whatsappUsers.rows[0].total),
        topPreferences: topPreferences.rows,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Get system settings
export async function adminGetSettingsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rows } = await pool.query(`SELECT key, value FROM system_settings`);
    const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Update system setting
export async function adminUpdateSettingsHandler(req: Request, res: Response, pool: Pool) {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ success: false, error: 'key and value required' });
  try {
    // If the table doesn't exist yet, we catch the error, but we already injected it so it should be fine.
    await pool.query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
      [key, JSON.stringify(value)]
    );
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Get RSVPs for a single event
export async function adminGetEventRsvpsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT er.user_email, er.created_at, u.name 
       FROM event_rsvps er 
       LEFT JOIN web_users u ON er.user_email = u.email 
       WHERE er.event_id = $1 
       ORDER BY er.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('RSVP Admin error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// --- NEW FEATURES For Organizer / Approval Flow ---

export async function adminAddOrganizerHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  try {
    // Requires an 'admins' table or similar that tracks roles. 
    // We already query 'SELECT role FROM admins' so we insert into admins.
    await pool.query(
      `INSERT INTO admins (email, role) VALUES ($1, 'organizer') 
       ON CONFLICT (email) DO UPDATE SET role = 'organizer'`,
      [email]
    );
    res.json({ success: true, message: 'Organizer added successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetOrganizersHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rows } = await pool.query(`SELECT email, role FROM admins WHERE role = 'organizer'`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetPendingEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rows } = await pool.query(`SELECT * FROM events WHERE status = 'pending' ORDER BY date_time ASC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminReviewEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'
  try {
    const { rowCount } = await pool.query(`UPDATE events SET status = $1 WHERE id = $2`, [status, id]);
    if (rowCount === 0) return res.status(404).json({ success: false, error: 'Event not found' });
    res.json({ success: true, message: `Event ${status} successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
