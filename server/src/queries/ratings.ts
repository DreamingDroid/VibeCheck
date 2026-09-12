import { Pool } from 'pg';

export interface SubmitRatingInput {
  eventId: string;
  userEmail: string;
  eventRating: number;
  organizerRating: number;
}

export interface RatingResult {
  id: string;
  event_id: string;
  organizer_email: string;
  user_email: string;
  event_rating: number;
  organizer_rating: number;
  created_at: string;
  updated_at: string;
  event_average_rating: number | null;
  event_ratings_count: number;
  organizer_average_rating: number | null;
}

/**
 * Submit or update event & organizer star ratings from an attendee
 */
export async function submitEventAndOrganizerRating(
  pool: Pool,
  input: SubmitRatingInput
): Promise<RatingResult> {
  const { eventId, userEmail, eventRating, organizerRating } = input;

  // Validate rating bounds
  if (eventRating < 1 || eventRating > 5 || organizerRating < 1 || organizerRating > 5) {
    throw new Error('Ratings must be between 1 and 5 stars');
  }

  // 1. Fetch event and organizer email
  const { rows: eventRows } = await pool.query<{ organizer_email: string; title: string }>(
    `SELECT organizer_email, title FROM events WHERE id = $1`,
    [eventId]
  );

  if (!eventRows.length) {
    throw new Error('Event not found');
  }

  const organizerEmail = eventRows[0].organizer_email;
  if (!organizerEmail) {
    throw new Error('Event does not have an associated organizer');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 2. Upsert rating record
    const { rows: ratingRows } = await client.query(
      `INSERT INTO event_ratings (event_id, organizer_email, user_email, event_rating, organizer_rating, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (event_id, user_email)
       DO UPDATE SET
         event_rating = EXCLUDED.event_rating,
         organizer_rating = EXCLUDED.organizer_rating,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [eventId, organizerEmail, userEmail, eventRating, organizerRating]
    );

    const ratingRecord = ratingRows[0];

    // 3. Recalculate event average rating & ratings count
    const { rows: eventStatRows } = await client.query<{ average_rating: string | null; ratings_count: number }>(
      `UPDATE events
       SET average_rating = (SELECT ROUND(AVG(event_rating), 1) FROM event_ratings WHERE event_id = $1),
           ratings_count = (SELECT COUNT(*)::int FROM event_ratings WHERE event_id = $1)
       WHERE id = $1
       RETURNING average_rating, ratings_count`,
      [eventId]
    );

    // 4. Recalculate organizer average rating
    const { rows: adminStatRows } = await client.query<{ rating: string | null }>(
      `UPDATE admins
       SET rating = (SELECT ROUND(AVG(organizer_rating), 1) FROM event_ratings WHERE organizer_email = $1)
       WHERE email = $1
       RETURNING rating`,
      [organizerEmail]
    );

    await client.query('COMMIT');

    const eventAverageRating = eventStatRows[0]?.average_rating ? Number(eventStatRows[0].average_rating) : null;
    const eventRatingsCount = eventStatRows[0]?.ratings_count ?? 0;
    const organizerAverageRating = adminStatRows[0]?.rating ? Number(adminStatRows[0].rating) : null;

    return {
      id: ratingRecord.id,
      event_id: ratingRecord.event_id,
      organizer_email: ratingRecord.organizer_email,
      user_email: ratingRecord.user_email,
      event_rating: Number(ratingRecord.event_rating),
      organizer_rating: Number(ratingRecord.organizer_rating),
      created_at: ratingRecord.created_at,
      updated_at: ratingRecord.updated_at,
      event_average_rating: eventAverageRating,
      event_ratings_count: eventRatingsCount,
      organizer_average_rating: organizerAverageRating,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get rating summary for an event, including the user's specific rating if provided
 */
export async function getEventRatingSummary(
  pool: Pool,
  eventId: string,
  userEmail?: string
) {
  const { rows: eventRows } = await pool.query(
    `SELECT e.id, e.average_rating, e.ratings_count, e.organizer_email,
            a.rating as organizer_rating, a.brand_name as organizer_name
     FROM events e
     LEFT JOIN admins a ON e.organizer_email = a.email
     WHERE e.id = $1`,
    [eventId]
  );

  if (!eventRows.length) {
    return null;
  }

  const eventData = eventRows[0];
  let userRating = null;

  if (userEmail) {
    const { rows: userRatingRows } = await pool.query(
      `SELECT event_rating, organizer_rating, created_at, updated_at
       FROM event_ratings
       WHERE event_id = $1 AND user_email = $2`,
      [eventId, userEmail]
    );
    if (userRatingRows.length > 0) {
      userRating = {
        event_rating: Number(userRatingRows[0].event_rating),
        organizer_rating: Number(userRatingRows[0].organizer_rating),
        created_at: userRatingRows[0].created_at,
        updated_at: userRatingRows[0].updated_at,
      };
    }
  }

  return {
    eventId: eventData.id,
    averageRating: eventData.average_rating ? Number(eventData.average_rating) : null,
    ratingsCount: Number(eventData.ratings_count) || 0,
    organizerEmail: eventData.organizer_email,
    organizerRating: eventData.organizer_rating ? Number(eventData.organizer_rating) : null,
    organizerName: eventData.organizer_name,
    userRating,
  };
}

/**
 * Get ratings summary for an organizer
 */
export async function getOrganizerRatingSummary(
  pool: Pool,
  organizerEmail: string
) {
  const { rows: adminRows } = await pool.query(
    `SELECT email, brand_name, rating,
            (SELECT COUNT(*)::int FROM event_ratings WHERE organizer_email = $1) as total_ratings_count
     FROM admins
     WHERE email = $1`,
    [organizerEmail]
  );

  if (!adminRows.length) {
    return null;
  }

  return {
    organizerEmail: adminRows[0].email,
    brandName: adminRows[0].brand_name,
    rating: adminRows[0].rating ? Number(adminRows[0].rating) : 4.5,
    totalRatingsCount: Number(adminRows[0].total_ratings_count) || 0,
  };
}
