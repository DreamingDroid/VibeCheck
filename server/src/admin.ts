import { Request, Response } from 'express';
import { Pool } from 'pg';

async function ensureSystemSettingsTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT 'null'::jsonb,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('cron_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `);
}

async function ensureOrganizerRole(pool: Pool) {
  const { rows } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM pg_type
      WHERE typname = 'admin_role'
    ) AS exists
  `);

  if (rows[0]?.exists) {
    await pool.query(`ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'organizer'`);
  }
}

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
    const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
    // Legacy admins might have role = null or just be in the table without a specific label.
    // If they are specifically listed as 'organizer', they are purely an organizer.
    // Otherwise, they are a full admin.
    return res.json({ 
      success: true, 
      isAdmin: normalizedRole !== 'organizer', 
      isOrganizer: normalizedRole === 'organizer', 
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
      `SELECT id, title, category, location, city, date_time, description, external_link, contact_info
       FROM events ORDER BY date_time ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Create a new event
export async function adminCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, city, date_time, external_link, contact_info } = req.body;
  if (!title || !description || !category || !date_time) {
    return res.status(400).json({ success: false, error: 'title, description, category, and date_time are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, city, date_time, external_link, contact_info)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, $8)
       RETURNING id, title, category`,
      [title, description, category, location || null, city || null, date_time, external_link || null, contact_info || null]
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
  const { title, description, category, location, city, date_time, external_link, contact_info } = req.body;
  try {
    await pool.query(
      `UPDATE events SET title=$1, description=$2, category=$3::event_category, location=$4, city=$5,
       date_time=$6, external_link=$7, contact_info=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9`,
      [title, description, category, location, city || null, date_time, external_link || null, contact_info || null, id]
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
    await ensureSystemSettingsTable(pool);
    const { rows } = await pool.query(`SELECT key, value FROM system_settings`);
    const settings = rows.reduce<Record<string, unknown>>((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Update system setting
export async function adminUpdateSettingsHandler(req: Request, res: Response, pool: Pool) {
  const { key, value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ success: false, error: 'key and value required' });
  try {
    await ensureSystemSettingsTable(pool);
    await pool.query(
      `INSERT INTO system_settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP`,
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
    await ensureOrganizerRole(pool);
    await pool.query(
      `INSERT INTO admins (email, role) VALUES ($1, 'organizer') 
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role`,
      [email]
    );
    res.json({ success: true, message: 'Organizer added successfully.' });
  } catch (error) {
    console.error('Add organizer error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetOrganizersHandler(req: Request, res: Response, pool: Pool) {
  try {
    await ensureOrganizerRole(pool);
    const { rows } = await pool.query(
      `SELECT email, role
       FROM admins
       WHERE LOWER(role::text) = 'organizer'
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get organizers error:', error);
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

// --- CITY MANAGEMENT ---

export async function adminAddCityHandler(req: Request, res: Response, pool: Pool) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'City name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO cities (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.json({ success: true, data: rows[0], message: 'City added successfully.' });
  } catch (error: any) {
    if (error.code === '23505') {
       return res.status(400).json({ success: false, error: 'City already exists' });
    }
    console.error('Add city error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminDeleteCityHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM cities WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ success: false, error: 'City not found' });
    res.json({ success: true, message: 'City deleted successfully.' });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
