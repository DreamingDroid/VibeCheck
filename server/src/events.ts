import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getEventsList, getEventById, insertEventRSVPEmail, checkEventRSVPEmail, checkUserEventAccess, getUserVipInvites } from './queries/events';

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

