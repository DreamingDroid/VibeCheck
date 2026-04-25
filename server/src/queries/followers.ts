import { Pool } from 'pg';

export async function followOrganizer(pool: Pool, userEmail: string, organizerEmail: string) {
    const { rows } = await pool.query(
        `INSERT INTO organizer_followers (user_email, organizer_email) 
         VALUES ($1, $2)
         ON CONFLICT (user_email, organizer_email) DO NOTHING
         RETURNING *`,
        [userEmail, organizerEmail]
    );
    return rows[0];
}

export async function unfollowOrganizer(pool: Pool, userEmail: string, organizerEmail: string) {
    await pool.query(
        `DELETE FROM organizer_followers 
         WHERE user_email = $1 AND organizer_email = $2`,
        [userEmail, organizerEmail]
    );
}

export async function getUserFollowing(pool: Pool, userEmail: string) {
    const { rows } = await pool.query(
        `SELECT organizer_email 
         FROM organizer_followers 
         WHERE user_email = $1`,
        [userEmail]
    );
    return rows.map(r => r.organizer_email);
}

export async function getOrganizerFollowers(pool: Pool, organizerEmail: string) {
    const { rows } = await pool.query(
        `SELECT w.name, w.email, w.city, f.created_at as follow_date
         FROM organizer_followers f
         JOIN web_users w ON f.user_email = w.email
         WHERE f.organizer_email = $1
         ORDER BY f.created_at DESC`,
        [organizerEmail]
    );
    return rows;
}
