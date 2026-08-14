import { Pool } from 'pg';

export async function blockOrganizer(pool: Pool, userEmail: string, organizerEmail: string) {
    await pool.query(
        `INSERT INTO organizer_blocks (user_email, organizer_email) 
         VALUES ($1, $2)
         ON CONFLICT (user_email, organizer_email) DO NOTHING`,
        [userEmail, organizerEmail]
    );
    // Unfollow organizer automatically when blocked
    await pool.query(
        `DELETE FROM organizer_followers 
         WHERE user_email = $1 AND organizer_email = $2`,
        [userEmail, organizerEmail]
    );
}

export async function unblockOrganizer(pool: Pool, userEmail: string, organizerEmail: string) {
    await pool.query(
        `DELETE FROM organizer_blocks 
         WHERE user_email = $1 AND organizer_email = $2`,
        [userEmail, organizerEmail]
    );
}

export async function getUserBlocks(pool: Pool, userEmail: string) {
    const { rows } = await pool.query(
        `SELECT organizer_email 
         FROM organizer_blocks 
         WHERE user_email = $1`,
        [userEmail]
    );
    return rows.map(r => r.organizer_email);
}
