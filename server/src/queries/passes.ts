import { Pool } from 'pg';
import crypto from 'crypto';

export interface PassDetails {
  id: number;
  event_id: string;
  user_email?: string | null;
  phone_number?: string | null;
  status: string;
  payment_status: string;
  pass_code: string;
  qr_token: string;
  checkin_status: string;
  checked_in_at?: Date | null;
  checked_in_by?: string | null;
  telegram_message_id?: number | null;
  // Join fields
  event_title?: string;
  event_date?: Date | null;
  location?: string;
  city?: string;
  attendee_name?: string;
  telegram_chat_id?: number | null;
}

/**
 * Generate a clean, high-entropy unique pass code and QR token
 */
export function generatePassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'VB-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateQrToken(): string {
  return 'vc_pass_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Ensure an RSVP has a pass_code and qr_token generated
 */
export async function ensurePassForRSVP(
  pool: Pool,
  eventId: string,
  userEmail?: string,
  phoneNumber?: string
): Promise<PassDetails> {
  const qrToken = generateQrToken();
  const passCode = generatePassCode();

  // If pass already exists, retrieve or update missing tokens
  let existingResult;
  if (userEmail) {
    existingResult = await pool.query(
      `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, u.name as attendee_name, u.telegram_chat_id
       FROM event_rsvps r
       JOIN events e ON r.event_id = e.id
       LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
       WHERE r.event_id = $1 AND LOWER(r.user_email) = LOWER($2) LIMIT 1`,
      [eventId, userEmail]
    );
  } else if (phoneNumber) {
    existingResult = await pool.query(
      `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, u.name as attendee_name, u.telegram_chat_id
       FROM event_rsvps r
       JOIN events e ON r.event_id = e.id
       LEFT JOIN web_users u ON r.phone_number = u.phone_number
       WHERE r.event_id = $1 AND r.phone_number = $2 LIMIT 1`,
      [eventId, phoneNumber]
    );
  }

  if (existingResult && existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    if (existing.qr_token && existing.pass_code) {
      return existing;
    }
    // Update missing qr_token / pass_code
    const updated = await pool.query(
      `UPDATE event_rsvps 
       SET qr_token = COALESCE(qr_token, $1), 
           pass_code = COALESCE(pass_code, $2),
           checkin_status = COALESCE(checkin_status, 'issued')
       WHERE id = $3
       RETURNING *`,
      [qrToken, passCode, existing.id]
    );
    return { ...existing, ...updated.rows[0] };
  }

  // Insert new RSVP with pass tokens
  const insertResult = await pool.query(
    `INSERT INTO event_rsvps (event_id, user_email, phone_number, status, pass_code, qr_token, checkin_status)
     VALUES ($1, $2, $3, 'confirmed', $4, $5, 'issued')
     RETURNING *`,
    [eventId, userEmail || null, phoneNumber || null, passCode, qrToken]
  );

  const newPass = insertResult.rows[0];
  const eventData = await pool.query(`SELECT title as event_title, date_time as event_date, location, city FROM events WHERE id = $1`, [eventId]);
  return { ...newPass, ...(eventData.rows[0] || {}) };
}

/**
 * Look up a pass by its QR token
 */
export async function getPassByQrToken(pool: Pool, qrToken: string): Promise<PassDetails | null> {
  const result = await pool.query(
    `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, 
            COALESCE(u.name, 'Vibe Seeker') as attendee_name, u.telegram_chat_id
     FROM event_rsvps r
     JOIN events e ON r.event_id = e.id
     LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
     WHERE r.qr_token = $1 LIMIT 1`,
    [qrToken]
  );
  return result.rows[0] || null;
}

/**
 * Verify pass at gate and perform check-in
 */
export async function verifyAndCheckInPass(
  pool: Pool,
  qrToken: string,
  eventId: string,
  checkedInBy: string = 'Main Gate'
): Promise<{
  success: boolean;
  code: 'VALID' | 'ALREADY_CHECKED_IN' | 'WRONG_EVENT' | 'NOT_FOUND';
  message: string;
  pass?: PassDetails;
}> {
  const pass = await getPassByQrToken(pool, qrToken);

  if (!pass) {
    return {
      success: false,
      code: 'NOT_FOUND',
      message: 'Invalid pass or QR code not recognized.'
    };
  }

  if (pass.event_id !== eventId) {
    return {
      success: false,
      code: 'WRONG_EVENT',
      message: `This pass is for a different event: "${pass.event_title}".`,
      pass
    };
  }

  if (pass.checkin_status === 'checked_in') {
    return {
      success: false,
      code: 'ALREADY_CHECKED_IN',
      message: `Pass already checked in at ${pass.checked_in_at ? new Date(pass.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier'}${pass.checked_in_by ? ` by ${pass.checked_in_by}` : ''}.`,
      pass
    };
  }

  // Mark checked in
  const updateResult = await pool.query(
    `UPDATE event_rsvps
     SET checkin_status = 'checked_in',
         checked_in_at = CURRENT_TIMESTAMP,
         checked_in_by = $1
     WHERE id = $2
     RETURNING *`,
    [checkedInBy, pass.id]
  );

  const updatedPass = { ...pass, ...updateResult.rows[0] };

  return {
    success: true,
    code: 'VALID',
    message: `Entry approved for ${pass.attendee_name || pass.user_email || 'Attendee'}!`,
    pass: updatedPass
  };
}

/**
 * Manual search for attendees (for bouncers when phone battery died)
 */
export async function searchAttendeesForEvent(
  pool: Pool,
  eventId: string,
  searchQuery: string
): Promise<PassDetails[]> {
  const q = `%${searchQuery.trim().toLowerCase()}%`;
  const result = await pool.query(
    `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, 
            COALESCE(u.name, 'Vibe Seeker') as attendee_name
     FROM event_rsvps r
     JOIN events e ON r.event_id = e.id
     LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
     WHERE r.event_id = $1
       AND (
         LOWER(r.user_email) LIKE $2 OR 
         r.phone_number LIKE $2 OR 
         LOWER(r.pass_code) LIKE $2 OR 
         LOWER(COALESCE(u.name, '')) LIKE $2
       )
     ORDER BY r.checkin_status ASC, r.created_at DESC
     LIMIT 20`,
    [eventId, q]
  );
  return result.rows;
}

/**
 * Manual check-in by RSVP ID
 */
export async function manualCheckInById(
  pool: Pool,
  rsvpId: number,
  eventId: string,
  checkedInBy: string = 'Staff Manual'
): Promise<{ success: boolean; message: string; pass?: PassDetails }> {
  const result = await pool.query(
    `SELECT r.*, e.title as event_title, e.date_time as event_date, e.location, e.city, 
            COALESCE(u.name, 'Vibe Seeker') as attendee_name, u.telegram_chat_id
     FROM event_rsvps r
     JOIN events e ON r.event_id = e.id
     LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
     WHERE r.id = $1 AND r.event_id = $2 LIMIT 1`,
    [rsvpId, eventId]
  );

  if (result.rows.length === 0) {
    return { success: false, message: 'Attendee record not found for this event.' };
  }

  const pass = result.rows[0];
  if (pass.checkin_status === 'checked_in') {
    return {
      success: false,
      message: `Already checked in at ${new Date(pass.checked_in_at).toLocaleTimeString('en-IN')}`,
      pass
    };
  }

  const update = await pool.query(
    `UPDATE event_rsvps
     SET checkin_status = 'checked_in',
         checked_in_at = CURRENT_TIMESTAMP,
         checked_in_by = $1
     WHERE id = $2
     RETURNING *`,
    [checkedInBy, rsvpId]
  );

  return {
    success: true,
    message: `Manually checked in ${pass.attendee_name || pass.user_email}!`,
    pass: { ...pass, ...update.rows[0] }
  };
}

/**
 * Live Attendance Stats for an Event
 */
export async function getEventAttendanceStats(
  pool: Pool,
  eventId: string
): Promise<{
  total_rsvps: number;
  checked_in_count: number;
  unclaimed_count: number;
  percentage: number;
  recent_checkins: Array<{
    name: string;
    email?: string;
    pass_code: string;
    checked_in_at: Date;
    checked_in_by: string;
  }>;
}> {
  const counts = await pool.query(
    `SELECT 
       COUNT(*)::int as total_rsvps,
       COUNT(*) FILTER (WHERE checkin_status = 'checked_in')::int as checked_in_count,
       COUNT(*) FILTER (WHERE checkin_status != 'checked_in' OR checkin_status IS NULL)::int as unclaimed_count
     FROM event_rsvps
     WHERE event_id = $1 AND status != 'cancelled'`,
    [eventId]
  );

  const recents = await pool.query(
    `SELECT 
       COALESCE(u.name, r.user_email, 'Attendee') as name,
       r.user_email as email,
       r.pass_code,
       r.checked_in_at,
       r.checked_in_by
     FROM event_rsvps r
     LEFT JOIN web_users u ON LOWER(r.user_email) = LOWER(u.email)
     WHERE r.event_id = $1 AND r.checkin_status = 'checked_in'
     ORDER BY r.checked_in_at DESC
     LIMIT 10`,
    [eventId]
  );

  const { total_rsvps, checked_in_count, unclaimed_count } = counts.rows[0];
  const percentage = total_rsvps > 0 ? Math.round((checked_in_count / total_rsvps) * 100) : 0;

  return {
    total_rsvps: Number(total_rsvps || 0),
    checked_in_count: Number(checked_in_count || 0),
    unclaimed_count: Number(unclaimed_count || 0),
    percentage,
    recent_checkins: recents.rows
  };
}

/**
 * Bouncer Staff PIN Verification & Generation
 */
export async function verifyStaffScannerPin(
  pool: Pool,
  eventId: string,
  pinCode: string
): Promise<{ valid: boolean; gate_name?: string }> {
  const result = await pool.query(
    `SELECT gate_name FROM event_scanner_pins
     WHERE event_id = $1 AND pin_code = $2 AND is_active = true
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     LIMIT 1`,
    [eventId, pinCode.trim()]
  );

  if (result.rows.length > 0) {
    return { valid: true, gate_name: result.rows[0].gate_name };
  }
  return { valid: false };
}

export async function createOrGetScannerPin(
  pool: Pool,
  eventId: string,
  createdBy: string,
  gateName: string = 'Main Gate'
): Promise<{ pin_code: string; gate_name: string; expires_at: Date }> {
  // Check for active PIN
  const existing = await pool.query(
    `SELECT pin_code, gate_name, expires_at FROM event_scanner_pins
     WHERE event_id = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
     ORDER BY created_at DESC LIMIT 1`,
    [eventId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // Generate 4-digit PIN
  const pinCode = Math.floor(1000 + Math.random() * 9000).toString();
  // Valid for 72 hours from generation
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const result = await pool.query(
    `INSERT INTO event_scanner_pins (event_id, pin_code, gate_name, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING pin_code, gate_name, expires_at`,
    [eventId, pinCode, gateName, createdBy, expiresAt]
  );

  return result.rows[0];
}
