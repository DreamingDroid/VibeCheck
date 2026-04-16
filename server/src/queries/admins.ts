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
  const { rows } = await pool.query('SELECT email, role FROM admins WHERE email = $1', [email]);
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
    `SELECT email, role
     FROM admins
     WHERE LOWER(role::text) = 'organizer'
     ORDER BY created_at DESC`
  );
  return rows;
}
