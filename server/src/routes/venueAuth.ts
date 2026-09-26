import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import { sendVenueAuthorizationEmail, sendAuthorizationConfirmationReceipt } from '../services/venueAuthEmail';

export function createVenueAuthRouter(pool: Pool): Router {
  const router = Router();

// Helper to format date in IST
function formatIST(date: Date | string): string {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'short'
  });
}

/**
 * GET /api/venue-auth/details?token=...
 * Returns sanitized event and organizer details for the public verification portal
 */
router.get('/details', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const eventResult = await pool.query(
      `SELECT e.id, e.title, e.description, e.category, e.date_time, e.end_time, e.timings,
              e.location, e.city, e.participant_limit, e.is_paid, e.ticket_price,
              e.venue_official_email, e.venue_official_phone, e.venue_section_hall,
              e.venue_verification_status, e.venue_auth_token_expires_at, e.organizer_email,
              a.brand_name as organizer_brand, a.phone_number as organizer_phone
       FROM events e
       LEFT JOIN admins a ON a.email = e.organizer_email
       WHERE e.venue_auth_token = $1`,
      [token]
    );

    if (eventResult.rows.length === 0) {
      res.status(404).json({ error: 'Invalid or already used verification link' });
      return;
    }

    const event = eventResult.rows[0];

    // Check expiry
    const expiresAt = new Date(event.venue_auth_token_expires_at);
    const isExpired = expiresAt < new Date();

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        category: event.category,
        dateTime: event.date_time,
        endTime: event.end_time,
        timings: event.timings,
        location: event.location,
        city: event.city,
        sectionHall: event.venue_section_hall || 'Main Premises',
        participantLimit: event.participant_limit,
        isPaid: event.is_paid,
        ticketPrice: event.ticket_price,
        venueEmail: event.venue_official_email,
        verificationStatus: event.venue_verification_status,
        expiresAt: event.venue_auth_token_expires_at,
        isExpired
      },
      organizer: {
        brandName: event.organizer_brand || 'Independent Organizer',
        email: event.organizer_email,
        phone: event.organizer_phone || 'Verified via VibeCheck'
      }
    });
  } catch (err: any) {
    console.error('[VenueAuth] Error fetching details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/venue-auth/confirm
 * Authorizes the event and records immutable legal proof
 */
router.post('/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, signerName, signerRole, termsAccepted } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    if (!termsAccepted) {
      res.status(400).json({ error: 'You must accept the legal authorization declaration terms' });
      return;
    }

    // Fetch event and organizer
    const eventResult = await pool.query(
      `SELECT e.*, a.brand_name as organizer_brand, a.phone_number as organizer_phone
       FROM events e
       LEFT JOIN admins a ON a.email = e.organizer_email
       WHERE e.venue_auth_token = $1`,
      [token]
    );

    if (eventResult.rows.length === 0) {
      res.status(404).json({ error: 'Invalid or already used verification token' });
      return;
    }

    const event = eventResult.rows[0];

    // Check expiry
    if (new Date(event.venue_auth_token_expires_at) < new Date()) {
      res.status(400).json({ error: 'This verification link has expired (48-hour limit reached). Please request the organizer to resend.' });
      return;
    }

    const signerIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const signerUserAgent = req.headers['user-agent'] || 'unknown';
    const auditRef = `VC-AUTH-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Insert into immutable audit log
    await pool.query(
      `INSERT INTO venue_authorization_logs (
        event_id, audit_reference_id, venue_name, venue_official_email,
        signer_ip_address, signer_user_agent, organizer_brand_name, organizer_legal_name,
        organizer_email, organizer_phone, event_title, event_date_time,
        event_end_time, participant_limit, is_paid, ticket_price, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'authorized')`,
      [
        event.id,
        auditRef,
        event.location || 'Venue',
        event.venue_official_email || 'venue@vibecheck.in',
        signerIp,
        signerUserAgent,
        event.organizer_brand || event.organizer_email,
        signerName ? `${signerName} (${signerRole || 'Manager'})` : 'Authorized Representative',
        event.organizer_email,
        event.organizer_phone || event.contact_info || 'N/A',
        event.title,
        event.date_time,
        event.end_time || null,
        event.participant_limit || 0,
        event.is_paid || false,
        event.ticket_price || 0.00
      ]
    );

    // 2. Update event: Mark verified, approve event, unlock payment details, invalidate token
    await pool.query(
      `UPDATE events 
       SET venue_verification_status = 'verified',
           status = 'approved',
           payment_details_locked = false,
           venue_auth_token = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [event.id]
    );

    // 3. Dispatch legal confirmation receipt in background
    sendAuthorizationConfirmationReceipt({
      auditReferenceId: auditRef,
      venueName: event.location || 'Venue',
      venueEmail: event.venue_official_email,
      organizerEmail: event.organizer_email,
      organizerName: event.organizer_brand || event.organizer_email,
      eventTitle: event.title,
      eventDateIST: formatIST(event.date_time),
      signedAtIST: formatIST(new Date())
    }).catch(err => console.error('[VenueAuth] Confirmation receipt error:', err));

    res.json({
      success: true,
      message: 'Venue authorization successfully confirmed and recorded',
      auditReferenceId: auditRef
    });
  } catch (err: any) {
    console.error('[VenueAuth] Error confirming authorization:', err);
    res.status(500).json({ error: 'Failed to record authorization' });
  }
});

/**
 * POST /api/venue-auth/reject
 * Records venue rejection / report of unauthorized event
 */
router.post('/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, reason } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const eventResult = await pool.query(
      `SELECT e.*, a.brand_name as organizer_brand, a.phone_number as organizer_phone
       FROM events e
       LEFT JOIN admins a ON a.email = e.organizer_email
       WHERE e.venue_auth_token = $1`,
      [token]
    );

    if (eventResult.rows.length === 0) {
      res.status(404).json({ error: 'Invalid or already used verification token' });
      return;
    }

    const event = eventResult.rows[0];
    const signerIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const signerUserAgent = req.headers['user-agent'] || 'unknown';
    const auditRef = `VC-REJ-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 1. Insert rejection into audit logs
    await pool.query(
      `INSERT INTO venue_authorization_logs (
        event_id, audit_reference_id, venue_name, venue_official_email,
        signer_ip_address, signer_user_agent, organizer_brand_name, organizer_legal_name,
        organizer_email, organizer_phone, event_title, event_date_time,
        event_end_time, participant_limit, is_paid, ticket_price, status, rejection_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'rejected', $17)`,
      [
        event.id,
        auditRef,
        event.location || 'Venue',
        event.venue_official_email || 'venue@vibecheck.in',
        signerIp,
        signerUserAgent,
        event.organizer_brand || event.organizer_email,
        'Venue Representative',
        event.organizer_email,
        event.organizer_phone || event.contact_info || 'N/A',
        event.title,
        event.date_time,
        event.end_time || null,
        event.participant_limit || 0,
        event.is_paid || false,
        event.ticket_price || 0.00,
        reason || 'Venue reported booking is unauthorized or invalid'
      ]
    );

    // 2. Reject and lock event
    await pool.query(
      `UPDATE events 
       SET venue_verification_status = 'rejected',
           status = 'rejected',
           admin_comment = $1,
           payment_details_locked = true,
           venue_auth_token = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [`Venue reported unauthorized: ${reason || 'No valid booking found'}`, event.id]
    );

    res.json({
      success: true,
      message: 'Event booking rejected and organizer flagged'
    });
  } catch (err: any) {
    console.error('[VenueAuth] Error rejecting authorization:', err);
    res.status(500).json({ error: 'Failed to record rejection' });
  }
});

/**
 * POST /api/venue-auth/resend
 * Resends the legal authorization email to the venue
 */
router.post('/resend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId, userEmail } = req.body;

    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required' });
      return;
    }

    const eventResult = await pool.query(
      `SELECT e.*, a.brand_name as organizer_brand, a.phone_number as organizer_phone
       FROM events e
       LEFT JOIN admins a ON a.email = e.organizer_email
       WHERE e.id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const event = eventResult.rows[0];

    // Authorization check: User must be organizer of this event or admin
    if (userEmail && event.organizer_email !== userEmail) {
      const adminCheck = await pool.query(`SELECT role FROM admins WHERE email = $1`, [userEmail]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized to resend verification for this event' });
        return;
      }
    }

    if (!event.venue_official_email) {
      res.status(400).json({ error: 'No venue email is configured for this event' });
      return;
    }

    // Generate fresh token with 48h expiry
    const freshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const auditRef = `VC-AUTH-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await pool.query(
      `UPDATE events 
       SET venue_auth_token = $1,
           venue_auth_token_expires_at = $2,
           venue_verification_status = 'pending_venue_auth',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [freshToken, expiresAt, event.id]
    );

    await sendVenueAuthorizationEmail({
      auditReferenceId: auditRef,
      token: freshToken,
      venueName: event.location || 'Venue',
      venueAddress: event.location || '',
      venueSectionHall: event.venue_section_hall,
      venueOfficialEmail: event.venue_official_email,
      organizerBrandName: event.organizer_brand || event.organizer_email,
      organizerLegalName: event.organizer_brand || 'Verified Organizer',
      organizerPhone: event.organizer_phone || event.contact_info || 'Verified',
      organizerEmail: event.organizer_email,
      eventTitle: event.title,
      eventCategory: event.category,
      eventStartTimeIST: formatIST(event.date_time),
      eventEndTimeIST: event.end_time ? formatIST(event.end_time) : undefined,
      participantLimit: event.participant_limit,
      isPaid: event.is_paid || false,
      ticketPrice: event.ticket_price || 0,
      tokenExpiresAtIST: formatIST(expiresAt)
    });

    res.json({
      success: true,
      message: 'Fresh legal authorization email dispatched to venue manager'
    });
  } catch (err: any) {
    console.error('[VenueAuth] Error resending authorization email:', err);
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

  return router;
}

export default createVenueAuthRouter;

