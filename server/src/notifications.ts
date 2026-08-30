import { Request, Response } from 'express';
import { Pool } from 'pg';

export async function getPublicNotificationsHandler(req: Request, res: Response, pool: Pool) {
  const { city } = req.query;
  try {
    let queryText = `
      SELECT n.id, n.type, n.target_city, n.target_event_id, n.title, n.message, n.action_text, n.action_href, n.created_at,
             e.title AS event_title
      FROM admin_notifications n
      LEFT JOIN events e ON n.target_event_id = e.id
      WHERE (n.expires_at IS NULL OR n.expires_at > CURRENT_TIMESTAMP)
    `;
    const params: any[] = [];
    if (city && typeof city === 'string') {
      queryText += ` AND (n.type = 'global' OR n.type = 'event' OR n.target_city ILIKE $1 OR n.target_city IS NULL)`;
      params.push(`%${city}%`);
    } else {
      queryText += ` AND (n.type = 'global' OR n.type = 'event' OR n.target_city IS NULL)`;
    }

    queryText += ` ORDER BY n.created_at DESC LIMIT 20`;

    const { rows } = await pool.query(queryText, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching public notifications:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminGetNotificationsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { rows } = await pool.query(`
      SELECT n.*, e.title AS event_title
      FROM admin_notifications n
      LEFT JOIN events e ON n.target_event_id = e.id
      ORDER BY n.created_at DESC
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminCreateNotificationHandler(req: Request, res: Response, pool: Pool) {
  const { type, target_city, target_event_id, title, message, action_text, action_href, expires_in_days } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, error: 'Title and message are required' });
  }

  const notifType = type || 'global';
  const actionText = action_text || (notifType === 'event' ? 'View Event' : 'Explore Vibes');
  const actionHref = action_href || (target_event_id ? `/event/${target_event_id}` : '/dashboard?view=calendar');

  try {
    let expiresAt: string | null = null;
    if (expires_in_days && Number(expires_in_days) > 0) {
      expiresAt = new Date(Date.now() + Number(expires_in_days) * 24 * 60 * 60 * 1000).toISOString();
    }

    const { rows } = await pool.query(
      `INSERT INTO admin_notifications (type, target_city, target_event_id, title, message, action_text, action_href, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [notifType, target_city || null, target_event_id || null, title, message, actionText, actionHref, expiresAt]
    );

    return res.json({ success: true, data: rows[0], message: 'Broadcast notification published successfully' });
  } catch (error) {
    console.error('Error creating admin notification:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function adminDeleteNotificationHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM admin_notifications WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin notification:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
