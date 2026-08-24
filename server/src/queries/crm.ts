import { Pool } from 'pg';

export interface CrmContact {
  email: string;
  is_follower: boolean;
  is_attendee: boolean;
  name: string | null;
  phone_number: string | null;
  city: string | null;
  rsvp_count: number;
  last_rsvp_date: string | null;
  rsvped_events: string | null;
  notes: string | null;
  tags: string[] | null;
  last_updated: string;
}

export async function getOrganizerCrmContacts(pool: Pool, organizerEmail: string): Promise<CrmContact[]> {
  const query = `
    WITH crm_emails AS (
        SELECT user_email, TRUE as is_follower, FALSE as is_attendee
        FROM organizer_followers
        WHERE organizer_email = $1
        UNION
        SELECT er.user_email, FALSE as is_follower, TRUE as is_attendee
        FROM event_rsvps er
        JOIN events e ON er.event_id = e.id
        WHERE e.organizer_email = $1 AND er.user_email IS NOT NULL
    ),
    crm_emails_combined AS (
        SELECT 
            user_email,
            bool_or(is_follower) as is_follower,
            bool_or(is_attendee) as is_attendee
        FROM crm_emails
        GROUP BY user_email
    ),
    event_rsvp_stats AS (
        SELECT 
            er.user_email,
            COUNT(er.id)::int as rsvp_count,
            MAX(er.created_at) as last_rsvp_date,
            string_agg(e.title, ', ') as rsvped_events
        FROM event_rsvps er
        JOIN events e ON er.event_id = e.id
        WHERE e.organizer_email = $1 AND er.user_email IS NOT NULL
        GROUP BY er.user_email
    )
    SELECT 
        c.user_email as email,
        c.is_follower,
        c.is_attendee,
        u.name,
        u.phone_number,
        u.city,
        COALESCE(s.rsvp_count, 0) as rsvp_count,
        s.last_rsvp_date,
        s.rsvped_events,
        n.notes,
        n.tags,
        COALESCE(n.updated_at, CURRENT_TIMESTAMP) as last_updated
    FROM crm_emails_combined c
    LEFT JOIN web_users u ON c.user_email = u.email
    LEFT JOIN event_rsvp_stats s ON c.user_email = s.user_email
    LEFT JOIN organizer_crm_notes n ON n.organizer_email = $1 AND n.contact_email = c.user_email
    ORDER BY COALESCE(s.last_rsvp_date, '1970-01-01'::timestamp) DESC, c.user_email ASC;
  `;
  const { rows } = await pool.query(query, [organizerEmail]);
  return rows;
}

export async function upsertOrganizerCrmNotes(
  pool: Pool,
  organizerEmail: string,
  contactEmail: string,
  notes: string,
  tags: string[]
): Promise<void> {
  const query = `
    INSERT INTO organizer_crm_notes (organizer_email, contact_email, notes, tags, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (organizer_email, contact_email) DO UPDATE
    SET notes = EXCLUDED.notes,
        tags = EXCLUDED.tags,
        updated_at = CURRENT_TIMESTAMP;
  `;
  await pool.query(query, [organizerEmail, contactEmail, notes, tags]);
}

export async function getPhoneNumbersForEmails(pool: Pool, emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT phone_number FROM web_users WHERE email = ANY($1) AND phone_number IS NOT NULL AND phone_number != ''`,
    [emails]
  );
  return rows.map((r) => r.phone_number);
}
