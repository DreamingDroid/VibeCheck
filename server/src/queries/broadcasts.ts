import { Pool } from 'pg';

export interface BroadcastTargetParams {
  scope: 'global' | 'city' | 'event' | 'category';
  city?: string | null;
  eventId?: string | null;
  category?: string | null;
}

export interface CreateBroadcastInput {
  title: string;
  message: string;
  type: 'general_update' | 'event_reminder' | 'emergency_alert' | 'agenda_shift' | 'event_rescheduled' | 'event_cancellation';
  scope: 'global' | 'city' | 'event' | 'category';
  target_city?: string | null;
  target_event_id?: string | null;
  target_category?: string | null;
  sender_email: string;
  sender_role: 'admin' | 'organizer';
  link?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Get distinct recipient emails according to targeting criteria
 */
export async function getAudienceRecipientEmails(
  pool: Pool,
  params: BroadcastTargetParams
): Promise<string[]> {
  const { scope, city, eventId, category } = params;

  if (scope === 'global') {
    const { rows } = await pool.query<{ email: string }>(
      `SELECT DISTINCT email FROM web_users WHERE email IS NOT NULL AND TRIM(email) != ''`
    );
    return rows.map(r => r.email);
  }

  if (scope === 'city') {
    if (!city) return [];
    const { rows } = await pool.query<{ email: string }>(
      `SELECT DISTINCT email FROM web_users 
       WHERE email IS NOT NULL 
         AND TRIM(email) != '' 
         AND LOWER(TRIM(city)) = LOWER(TRIM($1))`,
      [city]
    );
    return rows.map(r => r.email);
  }

  if (scope === 'event') {
    if (!eventId) return [];
    const { rows } = await pool.query<{ email: string }>(
      `SELECT DISTINCT user_email as email 
       FROM event_rsvps 
       WHERE event_id = $1 
         AND user_email IS NOT NULL 
         AND TRIM(user_email) != ''`,
      [eventId]
    );
    return rows.map(r => r.email);
  }

  if (scope === 'category') {
    if (!category) return [];
    const { rows } = await pool.query<{ email: string }>(
      `SELECT DISTINCT email FROM web_users 
       WHERE email IS NOT NULL 
         AND TRIM(email) != ''
         AND (
           categories @> $1::jsonb 
           OR categories ? $2
           OR categories @> jsonb_build_array($2::text)
         )`,
      [JSON.stringify([category]), category]
    );
    return rows.map(r => r.email);
  }

  return [];
}

/**
 * Estimate audience count for targeting preview
 */
export async function estimateAudienceCount(
  pool: Pool,
  params: BroadcastTargetParams
): Promise<{ total: number }> {
  const emails = await getAudienceRecipientEmails(pool, params);
  return { total: emails.length };
}

/**
 * Create a Broadcast record and insert user notifications for all matching recipients
 */
export async function createBroadcastAndDispatch(
  pool: Pool,
  input: CreateBroadcastInput
) {
  const recipientEmails = await getAudienceRecipientEmails(pool, {
    scope: input.scope,
    city: input.target_city,
    eventId: input.target_event_id,
    category: input.target_category,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into broadcasts
    const insertBroadcastQuery = `
      INSERT INTO broadcasts (
        title, message, type, scope, 
        target_city, target_event_id, target_category, 
        sender_email, sender_role, recipient_count, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      RETURNING *;
    `;

    const broadcastRes = await client.query(insertBroadcastQuery, [
      input.title,
      input.message,
      input.type,
      input.scope,
      input.target_city || null,
      input.target_event_id || null,
      input.target_category || null,
      input.sender_email,
      input.sender_role,
      recipientEmails.length,
      JSON.stringify(input.metadata || {}),
    ]);

    const broadcast = broadcastRes.rows[0];

    // 2. Dispatch in-app notifications in batch
    if (recipientEmails.length > 0) {
      const link = input.link || (input.target_event_id ? `/event/${input.target_event_id}` : '/dashboard');
      
      // Batch insert in chunks of 500
      const chunkSize = 500;
      for (let i = 0; i < recipientEmails.length; i += chunkSize) {
        const chunk = recipientEmails.slice(i, i + chunkSize);
        const valueStrings: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        for (const email of chunk) {
          valueStrings.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}::jsonb)`);
          queryParams.push(
            broadcast.id,
            email,
            input.title,
            input.message,
            input.type,
            link,
            JSON.stringify(input.metadata || {})
          );
          paramIndex += 7;
        }

        const batchInsertQuery = `
          INSERT INTO user_notifications (broadcast_id, user_email, title, message, type, link, metadata)
          VALUES ${valueStrings.join(', ')}
        `;

        await client.query(batchInsertQuery, queryParams);
      }
    }

    await client.query('COMMIT');

    return {
      broadcast,
      recipientCount: recipientEmails.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get broadcast history for Admin view
 */
export async function getBroadcastsHistory(pool: Pool, limit = 50, offset = 0) {
  const { rows } = await pool.query(
    `SELECT b.*, e.title AS event_title 
     FROM broadcasts b
     LEFT JOIN events e ON b.target_event_id = e.id
     ORDER BY b.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Get broadcast history for a specific event / organizer
 */
export async function getOrganizerBroadcastsHistory(pool: Pool, organizerEmail: string, limit = 50) {
  const { rows } = await pool.query(
    `SELECT b.*, e.title AS event_title 
     FROM broadcasts b
     LEFT JOIN events e ON b.target_event_id = e.id
     WHERE b.sender_email = $1
     ORDER BY b.created_at DESC
     LIMIT $2`,
    [organizerEmail, limit]
  );
  return rows;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  pool: Pool,
  userEmail: string,
  filter: 'all' | 'unread' | 'alerts' = 'all',
  limit = 40
) {
  let query = `
    SELECT n.*, b.target_city, b.target_category, b.target_event_id, b.scope
    FROM user_notifications n
    LEFT JOIN broadcasts b ON n.broadcast_id = b.id
    WHERE n.user_email = $1
  `;
  const params: any[] = [userEmail];

  if (filter === 'unread') {
    query += ` AND n.is_read = false`;
  } else if (filter === 'alerts') {
    query += ` AND n.type IN ('emergency_alert', 'event_cancellation', 'event_rescheduled', 'agenda_shift')`;
  }

  query += ` ORDER BY n.created_at DESC LIMIT $2`;
  params.push(limit);

  const { rows } = await pool.query(query, params);
  return rows;
}

/**
 * Get unread notification count
 */
export async function getUserUnreadNotificationCount(pool: Pool, userEmail: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM user_notifications WHERE user_email = $1 AND is_read = false`,
    [userEmail]
  );
  return parseInt(rows[0]?.count || '0', 10);
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(pool: Pool, notificationId: string, userEmail: string) {
  await pool.query(
    `UPDATE user_notifications SET is_read = true WHERE id = $1 AND user_email = $2`,
    [notificationId, userEmail]
  );
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsRead(pool: Pool, userEmail: string) {
  await pool.query(
    `UPDATE user_notifications SET is_read = true WHERE user_email = $1 AND is_read = false`,
    [userEmail]
  );
}

/**
 * Upsert an FCM device token for a user
 */
export async function upsertUserFcmToken(
  pool: Pool,
  userEmail: string,
  token: string,
  deviceInfo?: string
) {
  await pool.query(
    `INSERT INTO fcm_tokens (user_email, token, device_info)
     VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE
     SET user_email = EXCLUDED.user_email,
         device_info = COALESCE(EXCLUDED.device_info, fcm_tokens.device_info),
         updated_at = CURRENT_TIMESTAMP`,
    [userEmail, token, deviceInfo || null]
  );
}

/**
 * Get all active FCM tokens for a user
 */
export async function getUserFcmTokens(pool: Pool, userEmail: string): Promise<string[]> {
  const { rows } = await pool.query<{ token: string }>(
    `SELECT token FROM fcm_tokens WHERE user_email = $1`,
    [userEmail]
  );
  return rows.map(r => r.token);
}

/**
 * Remove an FCM token (e.g. on logout)
 */
export async function deleteUserFcmToken(pool: Pool, token: string) {
  await pool.query(`DELETE FROM fcm_tokens WHERE token = $1`, [token]);
}

