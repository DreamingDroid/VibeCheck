import { Pool } from 'pg';

export interface OrganizerSearchParams {
  q?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface AttendeeSearchParams {
  q?: string;
  platform?: 'all' | 'web' | 'whatsapp' | 'linked';
  city?: string;
  category?: string;
  hasRsvps?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface EventSearchParams {
  q?: string;
  category?: string;
  status?: string;
  city?: string;
  isPaid?: string; // 'all' | 'free' | 'paid'
  timeframe?: string; // 'all' | 'upcoming' | 'past' | 'this_week' | 'this_month'
  organizerEmail?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

// ─────────────────────────────────────────────────────────────
// 1. ORGANIZERS SEARCH
// ─────────────────────────────────────────────────────────────
export async function searchOrganizers(pool: Pool, params: OrganizerSearchParams) {
  const { q, status, sortBy = 'created_at', sortOrder = 'DESC', limit = 50, offset = 0 } = params;

  let whereClauses: string[] = ["LOWER(role::text) = 'organizer'"];
  const values: any[] = [];
  let paramIdx = 1;

  if (q && q.trim()) {
    whereClauses.push(`(
      brand_name ILIKE $${paramIdx} OR
      email ILIKE $${paramIdx} OR
      phone_number ILIKE $${paramIdx} OR
      description ILIKE $${paramIdx}
    )`);
    values.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (status && status !== 'all') {
    whereClauses.push(`status = $${paramIdx}`);
    values.push(status);
    paramIdx++;
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Allowed sort columns
  const allowedSorts: Record<string, string> = {
    created_at: 'a.created_at',
    brand_name: 'a.brand_name',
    email: 'a.email',
    rating: 'a.rating',
    events_count: 'events_count',
    total_rsvps: 'total_rsvps'
  };
  const sortCol = allowedSorts[sortBy] || 'a.created_at';
  const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Count total query
  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM admins a
    ${whereStr}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0]?.total || 0;

  // Data query with stats
  const dataQuery = `
    SELECT 
      a.id,
      a.email,
      a.role,
      a.status,
      a.brand_name,
      a.description,
      a.social_links,
      a.phone_number,
      a.email_verified,
      a.phone_verified,
      a.rejection_reason,
      a.image_url,
      a.rating,
      a.created_at,
      (SELECT COUNT(*)::int FROM events WHERE organizer_email = a.email) as events_count,
      (SELECT COUNT(*)::int FROM events WHERE organizer_email = a.email AND (status = 'approved' OR status = 'housefull' OR status = 'filling_fast')) as approved_events_count,
      (SELECT COUNT(*)::int FROM event_rsvps er JOIN events e ON er.event_id = e.id WHERE e.organizer_email = a.email) as total_rsvps,
      (SELECT COUNT(*)::int FROM organizer_followers WHERE organizer_email = a.email) as followers_count
    FROM admins a
    ${whereStr}
    ORDER BY ${sortCol} ${orderDir} NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const dataValues = [...values, limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  return {
    total,
    data: dataResult.rows,
    limit,
    offset
  };
}

// ─────────────────────────────────────────────────────────────
// 2. ATTENDEES SEARCH (Web Users + WhatsApp Users Unified)
// ─────────────────────────────────────────────────────────────
export async function searchAttendees(pool: Pool, params: AttendeeSearchParams) {
  const { q, platform = 'all', city, category, hasRsvps, sortBy = 'created_at', sortOrder = 'DESC', limit = 50, offset = 0 } = params;

  // We build a unified CTE that merges web_users and users
  let whereClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (q && q.trim()) {
    whereClauses.push(`(
      name ILIKE $${paramIdx} OR
      email ILIKE $${paramIdx} OR
      phone_number ILIKE $${paramIdx} OR
      city ILIKE $${paramIdx} OR
      profession ILIKE $${paramIdx}
    )`);
    values.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (platform && platform !== 'all') {
    whereClauses.push(`platform = $${paramIdx}`);
    values.push(platform);
    paramIdx++;
  }

  if (city && city.trim() && city !== 'all') {
    whereClauses.push(`city ILIKE $${paramIdx}`);
    values.push(`%${city.trim()}%`);
    paramIdx++;
  }

  if (category && category.trim() && category !== 'all') {
    whereClauses.push(`categories @> $${paramIdx}::jsonb`);
    values.push(JSON.stringify([category.trim()]));
    paramIdx++;
  }

  if (hasRsvps === true) {
    whereClauses.push(`rsvp_count > 0`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const allowedSorts: Record<string, string> = {
    created_at: 'created_at',
    name: 'name',
    email: 'email',
    rsvp_count: 'rsvp_count',
    city: 'city'
  };
  const sortCol = allowedSorts[sortBy] || 'created_at';
  const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const baseCte = `
    WITH unified_users AS (
      SELECT 
        COALESCE(w.id, u.id) as id,
        w.email,
        COALESCE(w.phone_number, u.phone_number) as phone_number,
        COALESCE(w.name, u.name, 'Attendee') as name,
        COALESCE(w.city, u.preferences->>'city') as city,
        COALESCE(w.profession, u.preferences->>'profession') as profession,
        COALESCE(w.age_group, u.preferences->>'age_group') as age_group,
        COALESCE(w.categories, u.preferences->'categories', '[]'::jsonb) as categories,
        CASE 
          WHEN w.email IS NOT NULL AND u.phone_number IS NOT NULL THEN 'linked'
          WHEN w.email IS NOT NULL THEN 'web'
          ELSE 'whatsapp'
        END as platform,
        COALESCE(w.created_at, u.created_at) as created_at,
        COALESCE(w.updated_at, u.updated_at) as updated_at,
        (
          SELECT COUNT(*)::int 
          FROM event_rsvps er 
          WHERE (w.email IS NOT NULL AND er.user_email = w.email)
             OR (COALESCE(w.phone_number, u.phone_number) IS NOT NULL AND er.phone_number = COALESCE(w.phone_number, u.phone_number))
        ) as rsvp_count,
        (
          SELECT COUNT(*)::int
          FROM organizer_followers of
          WHERE w.email IS NOT NULL AND of.user_email = w.email
        ) as following_count
      FROM web_users w
      FULL OUTER JOIN users u ON (w.phone_number IS NOT NULL AND w.phone_number = u.phone_number)
    )
  `;

  // Count total
  const countQuery = `
    ${baseCte}
    SELECT COUNT(*)::int as total
    FROM unified_users
    ${whereStr}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0]?.total || 0;

  // Data query
  const dataQuery = `
    ${baseCte}
    SELECT *
    FROM unified_users
    ${whereStr}
    ORDER BY ${sortCol} ${orderDir} NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const dataValues = [...values, limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  return {
    total,
    data: dataResult.rows,
    limit,
    offset
  };
}

// ─────────────────────────────────────────────────────────────
// 3. EVENTS SEARCH
// ─────────────────────────────────────────────────────────────
export async function searchEvents(pool: Pool, params: EventSearchParams) {
  const { q, category, status, city, isPaid, timeframe, organizerEmail, sortBy = 'date_time', sortOrder = 'DESC', limit = 50, offset = 0 } = params;

  let whereClauses: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (q && q.trim()) {
    whereClauses.push(`(
      e.title ILIKE $${paramIdx} OR
      e.description ILIKE $${paramIdx} OR
      e.location ILIKE $${paramIdx} OR
      e.city ILIKE $${paramIdx} OR
      e.organizer_email ILIKE $${paramIdx} OR
      a.brand_name ILIKE $${paramIdx}
    )`);
    values.push(`%${q.trim()}%`);
    paramIdx++;
  }

  if (category && category !== 'All') {
    whereClauses.push(`e.category = $${paramIdx}::event_category`);
    values.push(category);
    paramIdx++;
  }

  if (status && status !== 'all') {
    if (status === 'approved') {
      whereClauses.push(`(e.status = 'approved' OR e.status IS NULL)`);
    } else {
      whereClauses.push(`e.status = $${paramIdx}`);
      values.push(status);
      paramIdx++;
    }
  }

  if (city && city.trim() && city !== 'all') {
    whereClauses.push(`e.city ILIKE $${paramIdx}`);
    values.push(`%${city.trim()}%`);
    paramIdx++;
  }

  if (isPaid === 'free') {
    whereClauses.push(`(e.is_paid = false OR e.is_paid IS NULL)`);
  } else if (isPaid === 'paid') {
    whereClauses.push(`e.is_paid = true`);
  }

  if (organizerEmail && organizerEmail.trim()) {
    whereClauses.push(`e.organizer_email = $${paramIdx}`);
    values.push(organizerEmail.trim());
    paramIdx++;
  }

  if (timeframe === 'upcoming') {
    whereClauses.push(`e.date_time >= NOW()`);
  } else if (timeframe === 'past') {
    whereClauses.push(`e.date_time < NOW()`);
  } else if (timeframe === 'this_week') {
    whereClauses.push(`e.date_time >= NOW() AND e.date_time <= NOW() + INTERVAL '7 days'`);
  } else if (timeframe === 'this_month') {
    whereClauses.push(`e.date_time >= NOW() AND e.date_time <= NOW() + INTERVAL '30 days'`);
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const allowedSorts: Record<string, string> = {
    date_time: 'e.date_time',
    created_at: 'e.created_at',
    title: 'e.title',
    rsvp_count: 'rsvp_count',
    city: 'e.city',
    category: 'e.category'
  };
  const sortCol = allowedSorts[sortBy] || 'e.date_time';
  const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countQuery = `
    SELECT COUNT(*)::int as total
    FROM events e
    LEFT JOIN admins a ON e.organizer_email = a.email
    ${whereStr}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0]?.total || 0;

  const dataQuery = `
    SELECT 
      e.id,
      e.title,
      e.description,
      e.category,
      e.location,
      e.city,
      e.date_time,
      e.end_time,
      e.timings,
      e.external_link,
      e.google_maps_link,
      e.contact_info,
      e.status,
      e.organizer_email,
      a.brand_name as organizer_name,
      a.image_url as organizer_image,
      e.admin_comment,
      e.participant_limit,
      e.is_paid,
      e.image_url,
      e.image_public_id,
      e.created_at,
      e.updated_at,
      (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = e.id) as rsvp_count
    FROM events e
    LEFT JOIN admins a ON e.organizer_email = a.email
    ${whereStr}
    ORDER BY ${sortCol} ${orderDir} NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const dataValues = [...values, limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  return {
    total,
    data: dataResult.rows,
    limit,
    offset
  };
}

// ─────────────────────────────────────────────────────────────
// 4. GLOBAL UNIVERSAL SEARCH (Runs across Organizers, Attendees, Events)
// ─────────────────────────────────────────────────────────────
export async function searchGlobal(pool: Pool, query: string, limitPerEntity: number = 8) {
  const [organizers, attendees, events] = await Promise.all([
    searchOrganizers(pool, { q: query, limit: limitPerEntity, offset: 0 }),
    searchAttendees(pool, { q: query, limit: limitPerEntity, offset: 0 }),
    searchEvents(pool, { q: query, limit: limitPerEntity, offset: 0 })
  ]);

  return {
    query,
    summaryCounts: {
      organizers: organizers.total,
      attendees: attendees.total,
      events: events.total,
      total: organizers.total + attendees.total + events.total
    },
    organizers,
    attendees,
    events
  };
}

// ─────────────────────────────────────────────────────────────
// 5. DEEP INSPECTION DETAILS
// ─────────────────────────────────────────────────────────────

export async function getAttendeeDeepDetails(pool: Pool, email?: string, phone?: string) {
  if (!email && !phone) return null;

  let webUser: any = null;
  let whatsappUser: any = null;

  if (email) {
    const webRes = await pool.query(`SELECT * FROM web_users WHERE email = $1`, [email]);
    webUser = webRes.rows[0] || null;
  }

  const searchPhone = phone || webUser?.phone_number;
  if (searchPhone) {
    const waRes = await pool.query(`SELECT * FROM users WHERE phone_number = $1`, [searchPhone]);
    whatsappUser = waRes.rows[0] || null;
  }

  // Get RSVPs
  const rsvpsQuery = `
    SELECT 
      er.id,
      er.event_id,
      er.status as rsvp_status,
      er.payment_status,
      er.pass_code,
      er.created_at as rsvp_created_at,
      e.title as event_title,
      e.date_time as event_date,
      e.category as event_category,
      e.city as event_city,
      e.location as event_location,
      e.is_paid as event_is_paid,
      e.organizer_email,
      a.brand_name as organizer_name
    FROM event_rsvps er
    JOIN events e ON er.event_id = e.id
    LEFT JOIN admins a ON e.organizer_email = a.email
    WHERE ($1::text IS NOT NULL AND er.user_email = $1)
       OR ($2::text IS NOT NULL AND er.phone_number = $2)
    ORDER BY er.created_at DESC
  `;
  const rsvpsRes = await pool.query(rsvpsQuery, [email || null, searchPhone || null]);

  // Get Followed Organizers
  let followedOrganizers: any[] = [];
  if (email) {
    const folRes = await pool.query(`
      SELECT of.organizer_email, of.created_at as followed_at, a.brand_name, a.image_url, a.rating
      FROM organizer_followers of
      LEFT JOIN admins a ON of.organizer_email = a.email
      WHERE of.user_email = $1
      ORDER BY of.created_at DESC
    `, [email]);
    followedOrganizers = folRes.rows;
  }

  return {
    webUser,
    whatsappUser,
    rsvps: rsvpsRes.rows,
    followedOrganizers
  };
}

export async function getOrganizerDeepDetails(pool: Pool, email: string) {
  if (!email) return null;

  const orgRes = await pool.query(`
    SELECT 
      id, email, role, status, brand_name, description, social_links, 
      phone_number, email_verified, phone_verified, rejection_reason, 
      image_url, rating, created_at
    FROM admins 
    WHERE email = $1
  `, [email]);

  const organizer = orgRes.rows[0];
  if (!organizer) return null;

  // Get events hosted by this organizer
  const eventsRes = await pool.query(`
    SELECT 
      id, title, category, location, city, date_time, status, participant_limit, is_paid, created_at,
      (SELECT COUNT(*)::int FROM event_rsvps WHERE event_id = events.id) as rsvp_count
    FROM events
    WHERE organizer_email = $1
    ORDER BY date_time DESC
  `, [email]);

  // Get followers
  const followersRes = await pool.query(`
    SELECT of.user_email, of.created_at, u.name, u.phone_number, u.city
    FROM organizer_followers of
    LEFT JOIN web_users u ON of.user_email = u.email
    WHERE of.organizer_email = $1
    ORDER BY of.created_at DESC
  `, [email]);

  return {
    organizer,
    events: eventsRes.rows,
    followers: followersRes.rows
  };
}

export async function getEventDeepDetails(pool: Pool, id: string) {
  if (!id) return null;

  const eventRes = await pool.query(`
    SELECT 
      e.*,
      a.brand_name as organizer_name,
      a.phone_number as organizer_phone,
      a.image_url as organizer_image,
      a.rating as organizer_rating
    FROM events e
    LEFT JOIN admins a ON e.organizer_email = a.email
    WHERE e.id = $1
  `, [id]);

  const event = eventRes.rows[0];
  if (!event) return null;

  // Get full RSVP list
  const rsvpsRes = await pool.query(`
    SELECT 
      er.id,
      er.user_email,
      er.phone_number,
      er.status,
      er.payment_status,
      er.pass_code,
      er.created_at,
      COALESCE(u.name, 'Guest') as attendee_name,
      COALESCE(u.city, '') as attendee_city
    FROM event_rsvps er
    LEFT JOIN web_users u ON er.user_email = u.email
    WHERE er.event_id = $1
    ORDER BY er.created_at DESC
  `, [id]);

  return {
    event,
    rsvps: rsvpsRes.rows
  };
}
