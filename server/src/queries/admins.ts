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
  const { rows } = await pool.query('SELECT id, email, role, status FROM admins WHERE email = $1', [email]);
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
    `SELECT id, email, role, status, brand_name, description, social_links, phone_number, created_at
     FROM admins
     WHERE LOWER(role::text) = 'organizer' AND status = 'approved'
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function getPendingOrganizers(pool: Pool) {
  await ensureOrganizerRole(pool);
  const { rows } = await pool.query(
    `SELECT id, email, role, status, brand_name, description, social_links, phone_number, created_at
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
