import { Pool } from 'pg';

export async function ensureOrganizerRole(pool: Pool) {
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

export async function getAdminByEmail(pool: Pool, email: string) {
  const { rows } = await pool.query('SELECT id, email, role, status, rejection_reason FROM admins WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function addOrganizer(pool: Pool, email: string) {
  await ensureOrganizerRole(pool);
  await pool.query(
    `INSERT INTO admins (email, role) VALUES ($1, 'organizer') 
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role`,
    [email]
  );
}

export async function getOrganizers(pool: Pool) {
  await ensureOrganizerRole(pool);
  const { rows } = await pool.query(
    `SELECT id, email, role, status, brand_name, description, social_links, phone_number, instagram_verified, instagram_handle, instagram_metadata, created_at
     FROM admins
     WHERE LOWER(role::text) = 'organizer' AND status = 'approved'
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function getPendingOrganizers(pool: Pool) {
  await ensureOrganizerRole(pool);
  const { rows } = await pool.query(
    `SELECT id, email, role, status, brand_name, description, social_links, phone_number, instagram_verified, instagram_handle, instagram_metadata, created_at
     FROM admins
     WHERE LOWER(role::text) = 'organizer' AND status = 'pending_approval'
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function updateOrganizerStatus(pool: Pool, id: string, status: string, rejectionReason?: string) {
  const { rowCount, rows } = await pool.query(
    `UPDATE admins 
     SET status = $1, rejection_reason = $2 
     WHERE id = $3 
     RETURNING email`,
    [status, rejectionReason || null, id]
  );
  return rows[0] || null;
}

export async function getAdmins(pool: Pool) {
  const { rows } = await pool.query(
    `SELECT id, email, role, status, created_at
     FROM admins
     WHERE role::text IN ('SuperAdmin', 'Editor')
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function addAdmin(pool: Pool, email: string, role: string) {
  const { rows } = await pool.query(
    `INSERT INTO admins (email, role, status)
     VALUES ($1, $2, 'approved')
     ON CONFLICT (email)
     DO UPDATE SET role = EXCLUDED.role, status = 'approved'
     RETURNING *`,
    [email, role]
  );
  return rows[0];
}

export async function removeAdmin(pool: Pool, id: string) {
  const { rowCount } = await pool.query(
    `DELETE FROM admins
     WHERE id = $1`,
    [id]
  );
  return rowCount > 0;
}

export async function deleteOrganizer(pool: Pool, id: string) {
  const { rows } = await pool.query(
    `DELETE FROM admins
     WHERE id = $1 AND LOWER(role::text) = 'organizer'
     RETURNING id, email, brand_name`,
    [id]
  );
  return rows[0] || null;
}

export async function getPublicOrganizerProfile(pool: Pool, identifier: string) {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

  let whereClause = `
    (
      LOWER(slug) = $1 
      OR LOWER(instagram_handle) = $1 
      OR LOWER(email) = $1 
      OR LOWER(REGEXP_REPLACE(brand_name, '[^a-zA-Z0-9]+', '-', 'g')) = $1
      OR LOWER(brand_name) = $1
  `;
  const params: any[] = [clean];

  if (isUuid) {
    whereClause += ` OR id = $2`;
    params.push(clean);
  }
  whereClause += `) AND (status = 'approved' OR role::text = 'SuperAdmin' OR role::text = 'Editor')`;

  const queryText = `
    SELECT 
      id,
      email,
      COALESCE(brand_name, split_part(email, '@', 1)) as brand_name,
      COALESCE(slug, LOWER(REGEXP_REPLACE(COALESCE(brand_name, split_part(email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
      description,
      social_links,
      phone_number,
      COALESCE(image_url, (SELECT image_url FROM web_users WHERE LOWER(web_users.email) = LOWER(admins.email))) as image_url,
      COALESCE(rating, 4.5)::float as rating,
      instagram_handle,
      instagram_verified,
      created_at,
      (SELECT COUNT(*)::int FROM organizer_followers WHERE LOWER(organizer_email) = LOWER(admins.email)) as followers_count,
      (SELECT COUNT(*)::int FROM events WHERE LOWER(organizer_email) = LOWER(admins.email) AND (status = 'approved' OR status = 'housefull' OR status = 'filling_fast' OR status = 'ended')) as total_events_count,
      (SELECT COUNT(*)::int FROM events WHERE LOWER(organizer_email) = LOWER(admins.email) AND (status = 'approved' OR status = 'housefull' OR status = 'filling_fast') AND (end_time >= NOW() OR (end_time IS NULL AND date_time >= NOW()))) as upcoming_events_count,
      (SELECT city FROM events WHERE LOWER(organizer_email) = LOWER(admins.email) AND city IS NOT NULL ORDER BY date_time DESC LIMIT 1) as primary_city
    FROM admins
    WHERE ${whereClause}
    LIMIT 1
  `;

  const { rows } = await pool.query(queryText, params);
  return rows[0] || null;
}

export async function getPublicOrganizersList(pool: Pool) {
  const { rows } = await pool.query(`
    SELECT 
      id,
      email,
      COALESCE(brand_name, split_part(email, '@', 1)) as brand_name,
      COALESCE(slug, LOWER(REGEXP_REPLACE(COALESCE(brand_name, split_part(email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
      description,
      image_url,
      COALESCE(rating, 4.5)::float as rating,
      instagram_handle,
      instagram_verified,
      (SELECT COUNT(*)::int FROM organizer_followers WHERE LOWER(organizer_email) = LOWER(admins.email)) as followers_count,
      (SELECT COUNT(*)::int FROM events WHERE LOWER(organizer_email) = LOWER(admins.email) AND (status = 'approved' OR status = 'housefull' OR status = 'filling_fast') AND (end_time >= NOW() OR (end_time IS NULL AND date_time >= NOW()))) as upcoming_events_count
    FROM admins
    WHERE status = 'approved' AND LOWER(role::text) = 'organizer'
    ORDER BY followers_count DESC, upcoming_events_count DESC
    LIMIT 50
  `);
  return rows;
}

