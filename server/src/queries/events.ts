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

export async function searchEventsByVector(pool: Pool, queryEmbedding: number[], city?: string, email?: string) {
  let emailFilter = '';
  const params: any[] = [`[${queryEmbedding.join(',')}]`];
  let paramIdx = 2;

  let visibilityFilter = `AND (visibility = 'public' OR visibility IS NULL)`;
  if (email) {
    visibilityFilter = `AND (visibility = 'public' OR visibility IS NULL OR organizer_email = $${paramIdx} OR EXISTS (SELECT 1 FROM event_invites ei WHERE ei.event_id = events.id AND LOWER(ei.user_email) = LOWER($${paramIdx})))`;
  }

  if (city) {
    params.push(`%${city}%`);
    paramIdx++;
    if (email) {
      params.push(email);
      emailFilter = ` AND NOT EXISTS (SELECT 1 FROM event_ratings er WHERE er.event_id = events.id AND er.user_email = $${paramIdx - 1})`;
    }
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
        visibility,
        1 - (embedding <=> $1::vector) AS similarity,
        CASE WHEN city ILIKE $2 THEN 0 ELSE 1 END AS city_rank
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status = 'filling_fast' OR status IS NULL)
        AND (status != 'ended' OR status IS NULL)
        AND (end_time >= NOW() OR (end_time IS NULL AND date_time >= NOW()))
      ${visibilityFilter}
      ${emailFilter}
      ORDER BY city_rank ASC, embedding <=> $1::vector ASC
      LIMIT 8;
      `,
      params
    );
    return rows;
  } else {
    if (email) {
      params.push(email);
      emailFilter = ` AND NOT EXISTS (SELECT 1 FROM event_ratings er WHERE er.event_id = events.id AND er.user_email = $2)`;
    }
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
        visibility,
        1 - (embedding <=> $1::vector) AS similarity
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status = 'filling_fast' OR status IS NULL)
        AND (status != 'ended' OR status IS NULL)
        AND (end_time >= NOW() OR (end_time IS NULL AND date_time >= NOW()))
      ${visibilityFilter}
      ${emailFilter}
      ORDER BY embedding <=> $1::vector
      LIMIT 8;
      `,
      params
    );
    return rows;
  }
}

export async function getEventsList(pool: Pool, category: any, search: any, city: any, email?: any) {
    const queryParams: any[] = [];
    let paramIndex = 1;

    let userRsvpSelect = `false AS user_rsvped, NULL AS user_rsvp_status, NULL AS user_pass_code`;
    let emailParamIndex = -1;

    if (email) {
      emailParamIndex = paramIndex;
      queryParams.push(typeof email === 'string' ? email.trim().toLowerCase() : email);
      paramIndex++;
      userRsvpSelect = `
        EXISTS(SELECT 1 FROM event_rsvps WHERE event_id = events.id AND LOWER(user_email) = $${emailParamIndex}) AS user_rsvped,
        (SELECT status FROM event_rsvps WHERE event_id = events.id AND LOWER(user_email) = $${emailParamIndex}) AS user_rsvp_status,
        (SELECT pass_code FROM event_rsvps WHERE event_id = events.id AND LOWER(user_email) = $${emailParamIndex}) AS user_pass_code
      `;
    }

    let queryText = `
      SELECT id, title, description, location, city, date_time, end_time, timings, category, organizer_email, google_maps_link, whatsapp_group_link, status, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, average_rating, ratings_count, attendee_guide,
             (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count,
             ${userRsvpSelect}
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status = 'filling_fast' OR status IS NULL)
        AND (status != 'ended' OR status IS NULL)
        AND (end_time >= NOW() OR (end_time IS NULL AND date_time >= NOW()))
    `;

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
    if (email) {
      queryText += ` AND (visibility = 'public' OR visibility IS NULL OR organizer_email = $${emailParamIndex} OR EXISTS (SELECT 1 FROM event_invites ei WHERE ei.event_id = events.id AND LOWER(ei.user_email) = $${emailParamIndex}))`;
      queryText += ` AND NOT EXISTS (SELECT 1 FROM event_ratings er WHERE er.event_id = events.id AND er.user_email = $${emailParamIndex})`;
    } else {
      queryText += ` AND (visibility = 'public' OR visibility IS NULL)`;
    }

    queryText += ` ORDER BY is_featured DESC, date_time ASC LIMIT 50;`;
    const { rows } = await pool.query(queryText, queryParams);
    return rows;
}

export async function getEventById(pool: Pool, id: string) {
    const { rows } = await pool.query(
      `SELECT id, title, description, location, city, date_time, end_time, timings, category, organizer_email, google_maps_link, whatsapp_group_link, status, participant_limit, is_paid, is_featured, visibility, contact_info, image_url, image_public_id, average_rating, ratings_count, attendee_guide,
              (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count,
              (SELECT brand_name FROM admins WHERE email = events.organizer_email) as organizer_name,
              COALESCE(
                (SELECT image_url FROM admins WHERE email = events.organizer_email),
                (SELECT image_url FROM web_users WHERE email = events.organizer_email)
              ) as organizer_image,
              (SELECT description FROM admins WHERE email = events.organizer_email) as organizer_description,
              (SELECT rating FROM admins WHERE email = events.organizer_email) as organizer_rating,
              (SELECT social_links FROM admins WHERE email = events.organizer_email) as organizer_social_links,
              (SELECT COUNT(*)::int FROM events e2 WHERE e2.organizer_email = events.organizer_email AND (e2.status = 'approved' OR e2.status = 'housefull' OR e2.status = 'filling_fast' OR e2.status = 'ended')) as organizer_events_count,
              (SELECT COUNT(*)::int FROM organizer_followers WHERE organizer_email = events.organizer_email) as organizer_followers_count
       FROM events WHERE id = $1 AND (status = 'approved' OR status = 'housefull' OR status = 'filling_fast' OR status = 'ended' OR status IS NULL)`,
      [id]
    );
    return rows[0] || null;
}

export async function checkUserEventAccess(pool: Pool, eventId: string, email?: string) {
    const { rows } = await pool.query(`SELECT id, visibility, organizer_email, status FROM events WHERE id = $1`, [eventId]);
    if (rows.length === 0) return { exists: false, allowed: false, event: null };
    const event = rows[0];

    // If public or visibility is null, everyone has access
    if (!event.visibility || event.visibility === 'public') {
      return { exists: true, allowed: true, event };
    }

    // If invite-only, check authorization
    if (!email) {
      return { exists: true, allowed: false, event, reason: 'unauthenticated' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is the event organizer
    if (event.organizer_email && event.organizer_email.toLowerCase() === cleanEmail) {
      return { exists: true, allowed: true, event, isOrganizer: true };
    }

    // Check if user is SuperAdmin
    const adminCheck = await pool.query(`SELECT role FROM admins WHERE LOWER(email) = $1 AND role = 'SuperAdmin'`, [cleanEmail]);
    if (adminCheck.rows.length > 0) {
      return { exists: true, allowed: true, event, isAdmin: true };
    }

    // Check if user is in event_invites
    const inviteCheck = await pool.query(
      `SELECT id, status FROM event_invites WHERE event_id = $1 AND LOWER(user_email) = $2`,
      [eventId, cleanEmail]
    );
    if (inviteCheck.rows.length > 0) {
      return { exists: true, allowed: true, event, invite: inviteCheck.rows[0] };
    }

    return { exists: true, allowed: false, event, reason: 'not_invited' };
}

export async function addEventInvites(pool: Pool, eventId: string, emails: string[]) {
    if (!emails || emails.length === 0) return [];
    const cleanEmails = [...new Set(emails.map(e => e.trim().toLowerCase()).filter(Boolean))];
    const inserted = [];

    for (const email of cleanEmails) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO event_invites (event_id, user_email, status)
           VALUES ($1, $2, 'invited')
           ON CONFLICT (event_id, user_email) DO UPDATE SET invited_at = CURRENT_TIMESTAMP
           RETURNING id, event_id, user_email, status`,
          [eventId, email]
        );
        if (rows[0]) inserted.push(rows[0]);
      } catch (err) {
        console.error('[DAL] Error inserting event invite for:', email, err);
      }
    }
    return inserted;
}

export async function getEventInvites(pool: Pool, eventId: string) {
    const { rows } = await pool.query(
      `SELECT id, event_id, user_email, phone_number, status, invited_at, claimed_at
       FROM event_invites
       WHERE event_id = $1
       ORDER BY invited_at DESC`,
      [eventId]
    );
    return rows;
}

export async function getUserVipInvites(pool: Pool, email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.description, e.location, e.city, e.date_time, e.end_time, e.category, e.image_url, e.is_paid, e.visibility,
              (SELECT brand_name FROM admins WHERE email = e.organizer_email) as organizer_name,
              ei.status as invite_status, ei.invited_at,
              (SELECT status FROM event_rsvps WHERE event_id = e.id AND LOWER(user_email) = $1) as rsvp_status
       FROM event_invites ei
       JOIN events e ON ei.event_id = e.id
        WHERE LOWER(ei.user_email) = $1
          AND e.visibility = 'invite_only'
          AND (e.status = 'approved' OR e.status = 'housefull' OR e.status = 'filling_fast' OR e.status IS NULL)
          AND (e.status != 'ended' OR e.status IS NULL)
          AND (e.end_time >= NOW() OR (e.end_time IS NULL AND e.date_time >= NOW()))
        ORDER BY e.date_time ASC`,
      [cleanEmail]
    );
    return rows;
}

export async function insertEventRSVPEmail(pool: Pool, eventId: string, email: string, isPaid: boolean = false, phoneNumber?: string) {
    const status = 'pending';
    const paymentStatus = isPaid ? 'unpaid' : 'free';
    const passCode = null;
    const qrToken = 'vc_pass_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { rows } = await pool.query(`
      INSERT INTO event_rsvps (event_id, user_email, phone_number, status, payment_status, pass_code, qr_token, checkin_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'issued')
      ON CONFLICT (event_id, user_email) 
      DO UPDATE SET status = EXCLUDED.status, payment_status = EXCLUDED.payment_status,
                    qr_token = COALESCE(event_rsvps.qr_token, EXCLUDED.qr_token),
                    pass_code = event_rsvps.pass_code
      RETURNING id, event_id, user_email, phone_number, status, payment_status, pass_code, qr_token, checkin_status;
    `, [eventId, email, phoneNumber || null, status, paymentStatus, passCode, qrToken]);

    // Mark invite as claimed if exists
    await pool.query(
      `UPDATE event_invites SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP WHERE event_id = $1 AND LOWER(user_email) = $2`,
      [eventId, email.toLowerCase().trim()]
    ).catch(() => {});

    return rows[0];
}

export async function checkEventRSVPEmail(pool: Pool, eventId: string, email: string) {
    const { rows } = await pool.query(`
      SELECT er.id, er.status, er.payment_status, er.pass_code, er.qr_token, er.checkin_status, e.is_paid 
      FROM event_rsvps er
      JOIN events e ON er.event_id = e.id
      WHERE er.event_id = $1 AND er.user_email = $2
    `, [eventId, email]);
    if (rows.length === 0) {
      return { rsvped: false, status: null, payment_status: null, pass_code: null, qr_token: null, checkin_status: null };
    }
    const rsvp = rows[0];
    return {
      rsvped: true,
      status: rsvp.status || 'pending',
      payment_status: rsvp.payment_status || (rsvp.is_paid ? 'unpaid' : 'free'),
      pass_code: rsvp.pass_code,
      qr_token: rsvp.qr_token,
      checkin_status: rsvp.checkin_status
    };
}

export async function getEventByOrganizer(pool: Pool, eventId: string) {
    const { rows } = await pool.query(`SELECT title, organizer_email FROM events WHERE id = $1`, [eventId]);
    return rows[0] || null;
}

export async function createOrganizerEvent(pool: Pool, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, whatsapp_group_link, contact_info, organizer_email, participant_limit, is_paid, visibility, image_url, image_public_id, attendee_guide, attendeeGuide } = data;
    const validVisibility = visibility === 'invite_only' ? 'invite_only' : 'public';
    const validCategories = ['Sports', 'Arts', 'Education', 'Spiritual', 'Music', 'Food', 'Wellness', 'Indie', 'Techno', 'General'];
    const safeCategory = category && validCategories.includes(category) ? category : 'General';
    const safeLimit = participant_limit !== undefined && participant_limit !== null && participant_limit !== '' ? parseInt(participant_limit, 10) : (data.participantLimit !== undefined && data.participantLimit !== null && data.participantLimit !== '' ? parseInt(data.participantLimit, 10) : null);
    const safeIsPaid = Boolean(is_paid ?? data.isPaid ?? false);
    const safeGuide = attendee_guide || attendeeGuide || {};

    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, whatsapp_group_link, contact_info, status, organizer_email, participant_limit, is_paid, visibility, image_url, image_public_id, attendee_guide)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, $15, $16::event_visibility, $17, $18, $19)
       RETURNING id, title, status, visibility, image_url, image_public_id, whatsapp_group_link, attendee_guide`,
      [title, description, safeCategory, location || null, city || null, date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, whatsapp_group_link || null, contact_info || null, organizer_email, isNaN(safeLimit as number) ? null : safeLimit, safeIsPaid, validVisibility, image_url || null, image_public_id || null, JSON.stringify(safeGuide)]
    );
    return rows[0];
}

export async function getEventsByOrganizerEmail(pool: Pool, email: string) {
    const { rows } = await pool.query(
      `SELECT id, title, category, location, city, date_time, end_time, timings, description,
              external_link, google_maps_link, whatsapp_group_link, contact_info, status, admin_comment, participant_limit, is_paid, visibility, image_url, image_public_id, average_rating, ratings_count, attendee_guide, created_at,
              (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count,
              (SELECT COUNT(*)::int FROM event_invites WHERE event_id = events.id) AS invite_count
       FROM events WHERE organizer_email = $1 ORDER BY created_at DESC`,
      [email]
    );
    return rows;
}

export async function getOrganizerEventRSVPs(pool: Pool, eventId: string) {
    const { rows } = await pool.query(
      `SELECT er.id, er.user_email, er.status, er.payment_status, er.pass_code, er.created_at, 
              COALESCE(u.name, 'Anonymous Guest') as name
       FROM event_rsvps er 
       LEFT JOIN web_users u ON er.user_email = u.email 
       WHERE er.event_id = $1 
       ORDER BY er.created_at DESC`,
      [eventId]
    );
    return rows;
}

export async function issueOrganizerEventPass(pool: Pool, eventId: string, rsvpId: string | number) {
    const passCode = `VB-${Math.floor(100000 + Math.random() * 900000)}`;
    const qrToken = 'vc_pass_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { rows } = await pool.query(
      `UPDATE event_rsvps 
       SET status = 'confirmed', 
           payment_status = CASE WHEN payment_status = 'free' THEN 'free' ELSE 'paid' END, 
           pass_code = COALESCE(pass_code, $1),
           qr_token = COALESCE(qr_token, $2)
       WHERE event_id = $3 AND id = $4 
       RETURNING *`,
      [passCode, qrToken, eventId, rsvpId]
    );
    if (!rows[0]) return null;

    const fullPassResult = await pool.query(
      `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, e.google_maps_link,
              COALESCE(u.name, 'VIP Guest') as attendee_name, u.telegram_chat_id
       FROM event_rsvps r
       JOIN events e ON r.event_id = e.id
       LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
       WHERE r.id = $1 LIMIT 1`,
      [rows[0].id]
    );
    return fullPassResult.rows[0] || rows[0];
}

export async function issueBulkOrganizerEventPasses(pool: Pool, eventId: string, rsvpIds?: (string | number)[]) {
    let targetRsvpsQuery = `SELECT id, user_email, pass_code, qr_token FROM event_rsvps WHERE event_id = $1 AND status = 'pending'`;
    const params: any[] = [eventId];
    if (rsvpIds && rsvpIds.length > 0) {
      targetRsvpsQuery += ` AND id = ANY($2::int[])`;
      params.push(rsvpIds.map(id => Number(id)));
    }

    const { rows: pendingList } = await pool.query(targetRsvpsQuery, params);
    if (pendingList.length === 0) return [];

    const issuedPasses = [];
    for (const rsvp of pendingList) {
      const passCode = rsvp.pass_code || `VB-${Math.floor(100000 + Math.random() * 900000)}`;
      const qrToken = rsvp.qr_token || ('vc_pass_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
      const { rows } = await pool.query(
        `UPDATE event_rsvps 
         SET status = 'confirmed',
             payment_status = CASE WHEN payment_status = 'free' THEN 'free' ELSE 'paid' END,
             pass_code = $1,
             qr_token = $2
         WHERE id = $3
         RETURNING *`,
        [passCode, qrToken, rsvp.id]
      );
      if (rows[0]) {
        const fullPass = await pool.query(
          `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, e.google_maps_link,
                  COALESCE(u.name, 'VIP Guest') as attendee_name, u.telegram_chat_id
           FROM event_rsvps r
           JOIN events e ON r.event_id = e.id
           LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
           WHERE r.id = $1 LIMIT 1`,
          [rows[0].id]
        );
        issuedPasses.push(fullPass.rows[0] || rows[0]);
      }
    }
    return issuedPasses;
}

export async function cancelOrganizerEventRSVP(pool: Pool, eventId: string, rsvpId: string | number) {
    const { rows } = await pool.query(
      `UPDATE event_rsvps 
       SET status = 'cancelled' 
       WHERE event_id = $1 AND id = $2 
       RETURNING *`,
      [eventId, rsvpId]
    );
    return rows[0] || null;
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
      `SELECT u.phone_number, u.telegram_chat_id, u.email, u.name
       FROM event_rsvps er
       JOIN web_users u ON er.user_email = u.email
       WHERE er.event_id = $1 AND (u.telegram_chat_id IS NOT NULL OR (u.phone_number IS NOT NULL AND u.phone_number != ''))`,
      [eventId]
    );
    return rows;
}

export async function getRecentEvents(pool: Pool, hours: number) {
    const { rows } = await pool.query(`
      SELECT id, title, category, location, date_time, description, visibility
      FROM events
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
    `);
    return rows;
}

export async function getAllEvents(pool: Pool) {
    const { rows } = await pool.query(
      `SELECT id, title, category, location, city, date_time, description, external_link, google_maps_link, whatsapp_group_link, contact_info, status, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide
       FROM events ORDER BY is_featured DESC, date_time ASC`
    );
    return rows;
}

export async function createEvent(pool: Pool, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, whatsapp_group_link, contact_info, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide, attendeeGuide } = data;
    const validVisibility = visibility === 'invite_only' ? 'invite_only' : 'public';
    const safeGuide = attendee_guide || attendeeGuide || {};
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, whatsapp_group_link, contact_info, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide)
       VALUES ($1, $2, $3::event_category, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::event_visibility, $17, $18, $19)
       RETURNING id, title, category, is_featured, visibility, image_url, image_public_id, whatsapp_group_link, attendee_guide`,
      [title, description, category, location || null, city || null, date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, whatsapp_group_link || null, contact_info || null, participant_limit || null, is_paid || false, is_featured || false, validVisibility, image_url || null, image_public_id || null, JSON.stringify(safeGuide)]
    );
    return rows[0];
}

export async function updateEvent(pool: Pool, id: string, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, whatsapp_group_link, contact_info, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide, attendeeGuide } = data;
    const validVisibility = visibility === 'invite_only' ? 'invite_only' : 'public';
    const safeGuide = attendee_guide !== undefined ? attendee_guide : (attendeeGuide !== undefined ? attendeeGuide : null);
    await pool.query(
      `UPDATE events SET title=$1, description=$2, category=$3::event_category, location=$4, city=$5,
       date_time=$6, end_time=$7, timings=$8, external_link=$9, google_maps_link=$10, whatsapp_group_link=$11, contact_info=$12,
       participant_limit=$13, is_paid=$14, is_featured=$15, visibility=$16::event_visibility, image_url=$17, image_public_id=$18,
       attendee_guide=COALESCE($19::jsonb, attendee_guide), updated_at=CURRENT_TIMESTAMP
       WHERE id=$20`,
      [title, description, category, location, city || null, date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, whatsapp_group_link || null, contact_info || null, participant_limit || null, is_paid || false, is_featured || false, validVisibility, image_url || null, image_public_id || null, safeGuide ? JSON.stringify(safeGuide) : null, id]
    );
}

export async function deleteEvent(pool: Pool, id: string) {
    const { rows } = await pool.query(`DELETE FROM events WHERE id = $1 RETURNING image_public_id`, [id]);
    return rows[0];
}

export async function getPendingEvents(pool: Pool) {
    const { rows } = await pool.query(
      `SELECT id, title, description, category, location, city, date_time, organizer_email, admin_comment, status, google_maps_link, whatsapp_group_link, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide
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
          `SELECT id, title, description, category, location, city, date_time, organizer_email, admin_comment, status, updated_at, google_maps_link, whatsapp_group_link, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide
           FROM events WHERE ${statusCondition} AND updated_at >= NOW() - INTERVAL '${days} days'
           ORDER BY updated_at DESC`,
          [status]
        );
        return rows;
    }
    const { rows } = await pool.query(
      `SELECT id, title, description, category, location, city, date_time, organizer_email, admin_comment, status, updated_at, google_maps_link, whatsapp_group_link, participant_limit, is_paid, is_featured, visibility, image_url, image_public_id, attendee_guide
       FROM events WHERE ${statusCondition} ORDER BY updated_at DESC`,
      [status]
    );
    return rows;
}

export async function updateEventStatus(pool: Pool, id: string, status: string, comment?: string, is_featured?: boolean) {
    let query = `UPDATE events SET status = $1, admin_comment = $2, updated_at = CURRENT_TIMESTAMP`;
    const params: any[] = [status, comment ?? null];
    if (typeof is_featured === 'boolean') {
        params.push(is_featured);
        query += `, is_featured = $${params.length}`;
    }
    params.push(id);
    query += ` WHERE id = $${params.length}`;
    const { rowCount } = await pool.query(query, params);
    return rowCount;
}

export async function toggleEventFeatured(pool: Pool, id: string, is_featured?: boolean) {
    if (typeof is_featured === 'boolean') {
        const { rows } = await pool.query(
            `UPDATE events SET is_featured = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, is_featured`,
            [is_featured, id]
        );
        return rows[0] || null;
    } else {
        const { rows } = await pool.query(
            `UPDATE events SET is_featured = NOT COALESCE(is_featured, false), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, title, is_featured`,
            [id]
        );
        return rows[0] || null;
    }
}

export async function updateOrganizerEvent(pool: Pool, id: string, organizerEmail: string, data: any) {
    const { title, description, category, location, city, date_time, end_time, timings, external_link, google_maps_link, whatsapp_group_link, contact_info, participant_limit, is_paid, visibility, image_url, image_public_id, attendee_guide, attendeeGuide } = data;
    const validVisibility = visibility === 'invite_only' ? 'invite_only' : 'public';
    const safeGuide = attendee_guide !== undefined ? attendee_guide : (attendeeGuide !== undefined ? attendeeGuide : null);
    const { rowCount } = await pool.query(
      `UPDATE events
       SET title=$1, description=$2, category=$3::event_category, location=$4, city=$5,
           date_time=$6, end_time=$7, timings=$8, external_link=$9, google_maps_link=$10, whatsapp_group_link=$11, contact_info=$12,
           status='pending', admin_comment=NULL, updated_at=CURRENT_TIMESTAMP, participant_limit=$13, is_paid=$14,
           visibility=$15::event_visibility, image_url=$16, image_public_id=$17,
           attendee_guide=COALESCE($18::jsonb, attendee_guide)
       WHERE id=$19 AND organizer_email=$20 AND status='needs_changes'`,
      [title, description, category, location || null, city || null,
       date_time, end_time || null, timings || null, external_link || null, google_maps_link || null, whatsapp_group_link || null, contact_info || null,
       participant_limit || null, is_paid || false, validVisibility, image_url || null, image_public_id || null,
       safeGuide ? JSON.stringify(safeGuide) : null, id, organizerEmail]
    );
    return rowCount;
}

export async function updateEventWhatsAppGroupLink(pool: Pool, id: string, organizerEmail: string, whatsappGroupLink: string | null) {
    const { rows } = await pool.query(
      `UPDATE events
       SET whatsapp_group_link = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organizer_email = $3
       RETURNING id, title, whatsapp_group_link`,
      [whatsappGroupLink || null, id, organizerEmail]
    );
    return rows[0] || null;
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
      SELECT id, title, description, location, city, date_time, category, status, participant_limit, is_paid, whatsapp_group_link,
             (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) AS rsvp_count
      FROM events
      WHERE (status = 'approved' OR status = 'housefull' OR status = 'filling_fast' OR status IS NULL)
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

export async function updateEventStatusByOrganizer(pool: Pool, id: string, organizerEmail: string, newStatus: string) {
    const { rows } = await pool.query(
      `SELECT status FROM events WHERE id = $1 AND organizer_email = $2`,
      [id, organizerEmail]
    );
    if (rows.length === 0) return null;
    const currentStatus = rows[0].status;
    
    // Only allow changes if event is already in an approved-like state
    if (!['approved', 'housefull', 'filling_fast'].includes(currentStatus)) {
        return { success: false, error: 'Event is not in a live status state.' };
    }
    
    await pool.query(
      `UPDATE events SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, id]
    );
    return { success: true, status: newStatus };
}
