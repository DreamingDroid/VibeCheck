import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getEventsList, getEventById, insertEventRSVPEmail, checkEventRSVPEmail, checkUserEventAccess, getUserVipInvites } from './queries/events';
import { searchPublic } from './queries/search';
import { notifySuperAdmins } from './notifications';
import { logModerationResult } from './moderation';

export async function getEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { category, search, city, email } = req.query;

    const rows = await getEventsList(pool, category, search, city, email);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getSingleEventHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email } = req.query;

    // Check visibility and access control
    const access = await checkUserEventAccess(pool, id as string, typeof email === 'string' ? email : undefined);
    if (!access.exists) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        is_private: true,
        error: 'This is an exclusive invite-only vibe. Access is restricted to invited guests.'
      });
    }

    const event = await getEventById(pool, id as string);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching single event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function rsvpEventHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Access check for invite-only events
    const access = await checkUserEventAccess(pool, id as string, email as string);
    if (!access.exists) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        is_private: true,
        error: 'This is an exclusive invite-only event. Your email is not on the guest list.'
      });
    }

    const event = await getEventById(pool, id as string);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // 1. Age Verification Gate (Guardrail #5)
    const isAdultEvent = event.category === 'Techno' || event.category === 'Nightlife' || event.category === 'Clubbing';
    if (isAdultEvent && req.body.age_confirmed !== true) {
      return res.status(400).json({
        success: false,
        requires_age_declaration: true,
        error: 'Age Verification Required: This event is strictly 21+ with mandatory Government Photo ID check at the gate. Please confirm your age before reserving.'
      });
    }

    // 2. Anti-Hoarding & Sybil Protection (Guardrail #1)
    const cleanEmail = (email as string).trim().toLowerCase();
    const activeRsvpsCheck = await pool.query(
      `SELECT COUNT(*)::int as active_count,
              EXISTS (
                SELECT 1 FROM event_rsvps er2 
                JOIN events e2 ON er2.event_id = e2.id 
                WHERE LOWER(er2.user_email) = $1 
                  AND er2.status = 'confirmed' 
                  AND er2.event_id != $2 
                  AND e2.date_time = $3
              ) as has_conflict
       FROM event_rsvps er 
       JOIN events e ON er.event_id = e.id 
       WHERE LOWER(er.user_email) = $1 
         AND er.status != 'cancelled' 
         AND e.date_time > NOW()`,
      [cleanEmail, id, event.date_time]
    );

    const activeCount = activeRsvpsCheck.rows[0]?.active_count || 0;
    const hasConflict = activeRsvpsCheck.rows[0]?.has_conflict;

    if (activeCount >= 5) {
      return res.status(400).json({
        success: false,
        error: 'RSVP Limit Exceeded: You currently have 5 active upcoming reservations. Please attend or cancel existing passes to reserve more spots.'
      });
    }

    if (hasConflict) {
      return res.status(400).json({
        success: false,
        error: 'Schedule Conflict: You already have a confirmed RSVP for another event happening at this exact same time.'
      });
    }

    // Capacity check: applies to BOTH paid and free events
    if (event.status === 'housefull') {
      return res.status(400).json({ success: false, error: 'This event is housefull' });
    }

    if (event.participant_limit && event.rsvp_count >= event.participant_limit) {
      return res.status(400).json({ success: false, error: 'This event is housefull' });
    }

    const rsvp = await insertEventRSVPEmail(pool, id as string, cleanEmail, !!event.is_paid);

    return res.json({
      success: true,
      message: event.is_paid 
        ? 'Registration received. Pass pending payment.' 
        : 'RSVP received. Pass pending organizer approval.',
      rsvp_status: rsvp.status,
      payment_status: rsvp.payment_status,
      pass_code: rsvp.pass_code
    });
  } catch (error) {
    console.error('Error handling RSVP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function checkRsvpHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.json({ success: true, rsvped: false, rsvp_status: null, payment_status: null, pass_code: null });
    }

    const checkResult = await checkEventRSVPEmail(pool, id as string, email as string);
    return res.json({
      success: true,
      rsvped: checkResult.rsvped,
      rsvp_status: checkResult.status,
      payment_status: checkResult.payment_status,
      pass_code: checkResult.pass_code
    });
  } catch (error) {
    console.error('Error checking RSVP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getUserVipInvitesHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.json({ success: true, data: [] });
    }

    const invites = await getUserVipInvites(pool, email);
    return res.json({
      success: true,
      data: invites
    });
  } catch (error) {
    console.error('Error fetching user VIP invites:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function reportEventHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { reporter_email, reason, details } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reporting reason is required.' });
    }

    const event = await getEventById(pool, id as string);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const cleanEmail = (reporter_email || '').toLowerCase().trim();

    // Prevent duplicate report from same email/ip
    const existing = await pool.query(
      `SELECT id FROM event_reports 
       WHERE event_id = $1 AND ((reporter_email IS NOT NULL AND reporter_email = $2) OR (reporter_ip IS NOT NULL AND reporter_ip = $3))`,
      [id, cleanEmail || null, ip]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Your report has already been logged. Our trust & safety team is investigating.',
      });
    }

    await pool.query(
      `INSERT INTO event_reports (event_id, reporter_email, reporter_ip, reason, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, cleanEmail || null, ip, reason, details || null]
    );

    // Count distinct community reports
    const countRes = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(NULLIF(reporter_email, ''), reporter_ip))::int AS count 
       FROM event_reports 
       WHERE event_id = $1`,
      [id]
    );

    const reportCount = countRes.rows[0]?.count || 1;

    // Threshold Check: If >= 3 distinct reports, auto-freeze event
    if (reportCount >= 3) {
      await pool.query(
        `UPDATE events SET status = 'flagged_review', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      await logModerationResult(pool, {
        entity_type: 'event',
        entity_id: id as string,
        submitted_by: event.organizer_email,
        content_payload: { title: event.title, reportCount, latest_reason: reason },
        result: {
          is_safe: false,
          profanity_detected: false,
          fast_filter_passed: false,
          quality_score: 0,
          decision: 'auto_reject',
          flags: ['community_3_reports_threshold_reached'],
          reason: `Auto-frozen: Event reached ${reportCount} community safety reports.`,
        },
      });

      await notifySuperAdmins(pool, {
        title: `🚨 CRITICAL SAFETY FREEZE: ${event.title}`,
        message: `Event ID ${id} (${event.title}) has been automatically FROZEN after receiving ${reportCount} community fraud/safety reports. Public listing and booking have been suspended pending SuperAdmin audit.`,
        type: 'critical_event_freeze',
        link: `/event/${id}`,
      });
    }

    return res.json({
      success: true,
      message: 'Report received. Our automated safety system is reviewing this event.',
      auto_frozen: reportCount >= 3,
    });
  } catch (error) {
    console.error('Error in reportEventHandler:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function publicSearchHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { q, query, city, category, timeframe, startDate, endDate, limitEvents, limitOrganizers } = req.query;

    const searchTerm = (q || query) as string | undefined;

    const results = await searchPublic(pool, {
      q: searchTerm,
      city: city as string | undefined,
      category: category as string | undefined,
      timeframe: timeframe as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limitEvents: limitEvents ? parseInt(limitEvents as string, 10) : 12,
      limitOrganizers: limitOrganizers ? parseInt(limitOrganizers as string, 10) : 6,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in publicSearchHandler:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}



