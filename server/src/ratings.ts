import { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  submitEventAndOrganizerRating,
  getEventRatingSummary,
  getOrganizerRatingSummary
} from './queries/ratings';

/**
 * POST /api/events/:id/ratings
 * Body: { email, eventRating, organizerRating }
 */
export async function submitRatingHandler(req: Request, res: Response, pool: Pool) {
  try {
    const eventId = String(req.params.id);
    const { email, eventRating, organizerRating } = req.body;

    if (!eventId || !email) {
      return res.status(400).json({ success: false, error: 'Event ID and user email are required' });
    }

    const numEventRating = Number(eventRating);
    const numOrgRating = Number(organizerRating);

    if (isNaN(numEventRating) || numEventRating < 1 || numEventRating > 5) {
      return res.status(400).json({ success: false, error: 'Event rating must be between 1 and 5 stars' });
    }

    if (isNaN(numOrgRating) || numOrgRating < 1 || numOrgRating > 5) {
      return res.status(400).json({ success: false, error: 'Organizer rating must be between 1 and 5 stars' });
    }

    const result = await submitEventAndOrganizerRating(pool, {
      eventId,
      userEmail: String(email).trim().toLowerCase(),
      eventRating: numEventRating,
      organizerRating: numOrgRating,
    });

    return res.json({
      success: true,
      message: 'Ratings submitted successfully! Thank you for your feedback.',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in submitRatingHandler:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to submit ratings' });
  }
}

/**
 * GET /api/events/:id/ratings?email=...
 */
export async function getEventRatingHandler(req: Request, res: Response, pool: Pool) {
  try {
    const eventId = String(req.params.id);
    const { email } = req.query;

    const summary = await getEventRatingSummary(
      pool,
      eventId,
      typeof email === 'string' ? email.trim().toLowerCase() : undefined
    );

    if (!summary) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error in getEventRatingHandler:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get event ratings' });
  }
}

/**
 * GET /api/organizers/:email/ratings
 */
export async function getOrganizerRatingHandler(req: Request, res: Response, pool: Pool) {
  try {
    const organizerEmail = String(req.params.email);

    if (!organizerEmail) {
      return res.status(400).json({ success: false, error: 'Organizer email is required' });
    }

    const summary = await getOrganizerRatingSummary(pool, decodeURIComponent(organizerEmail).trim().toLowerCase());

    if (!summary) {
      return res.status(404).json({ success: false, error: 'Organizer not found' });
    }

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error in getOrganizerRatingHandler:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to get organizer ratings' });
  }
}
