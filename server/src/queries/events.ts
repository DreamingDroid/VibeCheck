import { Pool } from 'pg';

export async function insertEventRSVP(pool: Pool, eventId: string, phone: string) {
  try {
    await pool.query(
      `INSERT INTO event_rsvps (event_id, phone_number) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [eventId, phone]
    );
    return true;
  } catch (error) {
    console.error('[DAL] Error inserting event RSVP:', error);
    throw error;
  }
}

export async function searchEventsByVector(pool: Pool, queryEmbedding: number[], city?: string) {
  if (city) {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        location,
        city,
        date_time AS event_date,
        category,
        status,
        participant_limit,
        is_paid,
        1 - (embedding <=> $1::vector) AS similarity,
        CASE WHEN city ILIKE $2 THEN 0 ELSE 1 END AS city_rank
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status IS NULL)
      ORDER BY city_rank ASC, embedding <=> $1::vector ASC
      LIMIT 8;
      `,
      [`[${queryEmbedding.join(',')}]`, `%${city}%`]
    );
    return rows;
  } else {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        location,
        date_time AS event_date,
        category,
        status,
        participant_limit,
        is_paid,
        1 - (embedding <=> $1::vector) AS similarity
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status IS NULL)
      ORDER BY embedding <=> $1::vector
      LIMIT 8;
      `,
      [`[${queryEmbedding.join(',')}]`]
    );
    return rows;
  }
}

export async function getEventsList(pool: Pool, category: any, search: any, city: any) {
    let queryText = `
      SELECT id, title, description, location, city, date_time, category, organizer_email, google_maps_link, status, participant_limit, is_paid, image_url, image_public_id,
             (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status IS NULL)
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'All') {
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
    const { rows } = await pool.query(queryText, queryParams);
    return rows;
}

export async function getEventById(pool: Pool, id: string) {
    const { rows } = await pool.query(
      `SELECT id, title, description, location, city, date_time, end_time, timings, category, organizer_email, google_maps_link, status, participant_limit, is_paid, contact_info, image_url, image_public_id,
              (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count,
              (SELECT brand_name FROM admins WHERE email = events.organizer_email) as organizer_name,
              (SELECT image_url FROM admins WHERE email = events.organizer_email) as organizer_image,
              (SELECT description FROM admins WHERE email = events.organizer_email) as organizer_description,
              (SELECT rating FROM admins WHERE email = events.organizer_email) as organizer_rating,
              (SELECT COUNT(*)::int FROM organizer_followers WHERE organizer_email = events.organizer_email) as organizer_followers_count
       FROM events WHERE id = $1 AND (status = 'approved' OR status = 'housefull' OR status IS NULL)`,
      [id]
    );
    return rows[0] || null;
}

export async function insertEventRSVPEmail(pool: Pool, eventId: string, email: string) {
    await pool.query(`
      INSERT INTO event_rsvps (event_id, user_email)
      VALUES ($1, $2)
      ON CONFLICT (event_id, user_email) DO NOTHING;
    `, [eventId, email]);
}

export async function checkEventRSVPEmail(pool: Pool, eventId: string, email: string) {
    const { rows } = await pool.query(`
      SELECT 1 FROM event_rsvps WHERE event_id = $1 AND user_email = $2
    `, [eventId, email]);
    return rows.length > 0;
}

export async function getEventByOrganizer(pool: Pool, eventId: string) {
    const { rows } = await pool.query(`SELECT title, organizer_email FROM events WHERE id = $1`, [eventId]);
    return rows[0] || null;
}

export async function createOrganizerEvent(pool: Pool, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, contact_info, organizer_email, participant_limit, is_paid, image_url, image_public_id } = data;
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, contact_info, status, organizer_email, participant_limit, is_paid, image_url, image_public_id)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14, $15, $16)
       RETURNING id, title, status, image_url, image_public_id`,
      [title, description, category, location || null, city || null, date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, contact_info || null, organizer_email, participant_limit || null, is_paid || false, image_url || null, image_public_id || null]
    );
    return rows[0];
}

export async function getEventsByOrganizerEmail(pool: Pool, email: string) {
    const { rows } = await pool.query(
      `SELECT id, title, category, location, city, date_time, end_time, timings, description,
              external_link, google_maps_link, contact_info, status, admin_comment, participant_limit, is_paid, image_url, image_public_id, created_at 
       FROM events WHERE organizer_email = $1 ORDER BY created_at DESC`,
      [email]
    );
    return rows;
}

export async function getOrganizerEventRSVPs(pool: Pool, eventId: string) {
    const { rows } = await pool.query(
      `SELECT er.created_at, COALESCE(u.name, 'Anonymous Guest') as name 
       FROM event_rsvps er 
       LEFT JOIN web_users u ON er.user_email = u.email 
       WHERE er.event_id = $1 
       ORDER BY er.created_at DESC`,
      [eventId]
    );
    return rows;
}

export async function getOrganizerEventAnalytics(pool: Pool, eventId: string) {
    const { rows } = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM event_rsvps 
       WHERE event_id = $1 
       GROUP BY DATE(created_at) 
       ORDER BY DATE(created_at) ASC`,
      [eventId]
    );
    return rows;
}

export async function getOrganizerAverageVelocity(pool: Pool, email: string) {
    const { rows } = await pool.query(
      `WITH EventDailyCounts AS (
         SELECT er.event_id, DATE(er.created_at) as date, COUNT(*) as daily_count
         FROM event_rsvps er
         JOIN events e ON er.event_id = e.id
         WHERE e.organizer_email = $1
         GROUP BY er.event_id, DATE(er.created_at)
       )
       SELECT AVG(daily_count) as avg_velocity
       FROM EventDailyCounts`,
      [email]
    );
    return rows[0]?.avg_velocity || 0;
}

export async function getBroadcastAttendees(pool: Pool, eventId: string) {
    const { rows } = await pool.query(
      `SELECT u.phone_number
       FROM event_rsvps er
       JOIN web_users u ON er.user_email = u.email
       WHERE er.event_id = $1 AND u.phone_number IS NOT NULL AND u.phone_number != ''`,
      [eventId]
    );
    return rows;
}

export async function getRecentEvents(pool: Pool, hours: number) {
    const { rows } = await pool.query(`
      SELECT id, title, category, location, date_time, description
      FROM events
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
    `);
    return rows;
}

export async function getAllEvents(pool: Pool) {
    const { rows } = await pool.query(
      `SELECT id, title, category, location, city, date_time, description, external_link, google_maps_link, contact_info, status, participant_limit, is_paid, image_url, image_public_id
       FROM events ORDER BY date_time ASC`
    );
    return rows;
}

export async function createEvent(pool: Pool, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, contact_info, participant_limit, is_paid, image_url, image_public_id } = data;
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, contact_info, participant_limit, is_paid, image_url, image_public_id)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, title, category, image_url, image_public_id`,
      [title, description, category, location || null, city || null, date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, contact_info || null, participant_limit || null, is_paid || false, image_url || null, image_public_id || null]
    );
    return rows[0];
}

export async function updateEvent(pool: Pool, id: string, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, contact_info, participant_limit, is_paid, image_url, image_public_id } = data;
    await pool.query(
      `UPDATE events SET title=$1, description=$2, category=$3::event_category, location=$4, city=$5,
       date_time=$6, end_time=$7, timings=$8, external_link=$9, google_maps_link=$10, contact_info=$11,
       participant_limit=$12, is_paid=$13, image_url=$14, image_public_id=$15, updated_at=CURRENT_TIMESTAMP
       WHERE id=$16`,
      [title, description, category, location, city || null, date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, contact_info || null, participant_limit || null, is_paid || false, image_url || null, image_public_id || null, id]
    );
}

export async function deleteEvent(pool: Pool, id: string) {
    const { rows } = await pool.query(`DELETE FROM events WHERE id = $1 RETURNING image_public_id`, [id]);
    return rows[0];
}

export async function getPendingEvents(pool: Pool) {
    const { rows } = await pool.query(
      `SELECT id, title, description, category, location, city, date_time, organizer_email, admin_comment, status, google_maps_link, participant_limit, is_paid, image_url, image_public_id
       FROM events WHERE status = 'pending' ORDER BY created_at ASC`
    );
    return rows;
}

export async function getEventsByStatus(pool: Pool, status: string, days?: number) {
    let statusCondition = `status = $1`;
    if (status === 'approved') {
        statusCondition = `(status = $1 OR status IS NULL)`;
    }

    if (days) {
        const { rows } = await pool.query(
          `SELECT id, title, description, category, location, city, date_time, organizer_email, admin_comment, status, updated_at, google_maps_link, participant_limit, is_paid, image_url, image_public_id
           FROM events WHERE ${statusCondition} AND updated_at >= NOW() - INTERVAL '${days} days'
           ORDER BY updated_at DESC`,
          [status]
        );
        return rows;
    }
    const { rows } = await pool.query(
      `SELECT id, title, description, category, location, city, date_time, organizer_email, admin_comment, status, updated_at, google_maps_link, participant_limit, is_paid, image_url, image_public_id
       FROM events WHERE ${statusCondition} ORDER BY updated_at DESC`,
      [status]
    );
    return rows;
}

export async function updateEventStatus(pool: Pool, id: string, status: string, comment?: string) {
    const { rowCount } = await pool.query(
      `UPDATE events SET status = $1, admin_comment = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, comment ?? null, id]
    );
    return rowCount;
}

export async function updateOrganizerEvent(pool: Pool, id: string, organizerEmail: string, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, contact_info, participant_limit, is_paid, image_url, image_public_id } = data;
    const { rowCount } = await pool.query(
      `UPDATE events
       SET title=$1, description=$2, category=$3::event_category, location=$4, city=$5,
           date_time=$6, end_time=$7, timings=$8, external_link=$9, google_maps_link=$10, contact_info=$11,
           status='pending', admin_comment=NULL, updated_at=CURRENT_TIMESTAMP, participant_limit=$12, is_paid=$13,
           image_url=$14, image_public_id=$15
       WHERE id=$16 AND organizer_email=$17 AND status='needs_changes'`,
      [title, description, category, location || null, city || null,
       date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, contact_info || null,
       participant_limit || null, is_paid || false, image_url || null, image_public_id || null, id, organizerEmail]
    );
    return rowCount;
}

export async function getAdminEventRSVPs(pool: Pool, eventId: string) {
    const { rows } = await pool.query(
      `SELECT er.user_email, er.created_at, u.name 
       FROM event_rsvps er 
       LEFT JOIN web_users u ON er.user_email = u.email 
       WHERE er.event_id = $1 
       ORDER BY er.created_at DESC`,
      [eventId]
    );
    return rows;
}

export async function addCity(pool: Pool, name: string) {
    const { rows } = await pool.query(
      'INSERT INTO cities (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
}

export async function deleteCity(pool: Pool, id: string) {
    const { rowCount } = await pool.query('DELETE FROM cities WHERE id = $1', [id]);
    return rowCount;
}

export async function toggleEventHousefull(pool: Pool, id: string, organizerEmail: string) {
    const { rows } = await pool.query(
      `SELECT status FROM events WHERE id = $1 AND organizer_email = $2`,
      [id, organizerEmail]
    );
    if (rows.length === 0) return null;
    const currentStatus = rows[0].status;
    let newStatus = currentStatus;
    if (currentStatus === 'approved') {
        newStatus = 'housefull';
    } else if (currentStatus === 'housefull') {
        newStatus = 'approved';
    } else {
        return { success: false, error: 'Event is not in approved status.' };
    }
    await pool.query(
      `UPDATE events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, id]
    );
    return { success: true, status: newStatus };
}

export async function getEventsInNext7Days(pool: Pool, city?: string) {
    let queryText = `
      SELECT id, title, description, location, city, date_time, category, status, participant_limit, is_paid,
             (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status IS NULL)
        AND date_time >= NOW() - INTERVAL '6 hours'
        AND date_time <= NOW() + INTERVAL '7 days'
    `;
    const params: any[] = [];
    if (city) {
      queryText += ` AND city ILIKE $1`;
      params.push(`%${city}%`);
    }
    queryText += ` ORDER BY date_time ASC LIMIT 10;`;

    const { rows } = await pool.query(queryText, params);
    return rows;
}

