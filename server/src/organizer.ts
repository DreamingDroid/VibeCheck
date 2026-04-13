import { Request, Response } from 'express';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';

export async function organizerCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, city, date_time, external_link, contact_info, organizer_email } = req.body;
  
  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, city, date_time, external_link, contact_info, status, organizer_email)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, $8, 'pending', $9)
       RETURNING id, title, status`,
      [title, description, category, location || null, city || null, date_time, external_link || null, contact_info || null, organizer_email]
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

// Secure RSVP endpoint for Organizers (No emails returned)
export async function organizerGetEventRsvpsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { email } = req.query;
  
  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    // Basic verification that they are the organizer
    const eventCheck = await pool.query(`SELECT organizer_email FROM events WHERE id = $1`, [id]);
    if (eventCheck.rows.length === 0 || eventCheck.rows[0].organizer_email !== email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const { rows } = await pool.query(
      `SELECT er.created_at, COALESCE(u.name, 'Anonymous Guest') as name 
       FROM event_rsvps er 
       LEFT JOIN web_users u ON er.user_email = u.email 
       WHERE er.event_id = $1 
       ORDER BY er.created_at DESC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Organizer RSVP error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Broadcast stats
export async function getBroadcastStatsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { email } = req.query;

  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const eventCheck = await pool.query(`SELECT organizer_email FROM events WHERE id = $1`, [id]);
    if (eventCheck.rows.length === 0 || eventCheck.rows[0].organizer_email !== email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Determine the cost per message from system_settings or default to 2
    let costPerMessage = 2;
    try {
       const settings = await pool.query(`SELECT value FROM system_settings WHERE key = 'whatsapp_broadcast_rate'`);
       if (settings.rows.length > 0) {
         costPerMessage = Number(settings.rows[0].value) || 2;
       }
    } catch(e) {} // ignore safely

    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT er.user_email) as eligible_count
       FROM event_rsvps er
       JOIN web_users u ON er.user_email = u.email
       WHERE er.event_id = $1 AND u.phone_number IS NOT NULL AND u.phone_number != ''`,
      [id]
    );
    
    const count = parseInt(rows[0].eligible_count, 10) || 0;
    
    res.json({
      success: true,
      eligibleCount: count,
      costPerMessage,
      totalCost: count * costPerMessage
    });
  } catch (error) {
    console.error('Broadcast Stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Perform Broadcast
export async function broadcastMessageHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email, message } = req.body;

  if (!organizer_email || !message) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  try {
    const eventCheck = await pool.query(`SELECT title, organizer_email FROM events WHERE id = $1`, [id]);
    if (eventCheck.rows.length === 0 || eventCheck.rows[0].organizer_email !== organizer_email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const eventTitle = eventCheck.rows[0].title;

    const { rows } = await pool.query(
      `SELECT u.phone_number
       FROM event_rsvps er
       JOIN web_users u ON er.user_email = u.email
       WHERE er.event_id = $1 AND u.phone_number IS NOT NULL AND u.phone_number != ''`,
      [id]
    );

    // Send the message locally by calling sendWhatsAppMessage
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '114670068407425';
    let sentCount = 0;

    for (const r of rows) {
      if (r.phone_number) {
         const finalMsg = `*Update for ${eventTitle}*\n\n${message}\n\n- The Organizer`;
         await sendWhatsAppMessage(phoneNumberId, r.phone_number, finalMsg);
         sentCount++;
      }
    }

    res.json({ success: true, message: `Successfully broadcasted to ${sentCount} attendees.` });
  } catch (error) {
    console.error('Broadcast Exec error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

