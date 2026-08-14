import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getEventsList, getEventById, insertEventRSVPEmail, checkEventRSVPEmail, insertShareClick, getEventForFeedback, checkUserFeedback, insertFeedback } from './queries/events';
import mockData from './mock-data-for-testing.json';

export async function getEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { category, search, city, email } = req.query;
    
    let rows = await getEventsList(pool, category, search, city, email as string);
    
    // Fallback to mock data if DB is empty
    if (rows.length === 0 && !category && !search && !city && !email) {
      console.log('[API] DB is empty, serving mock data fallback');
      rows = mockData;
    }
    
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

    await insertEventRSVPEmail(pool, id as string, email as string);

    return res.json({ success: true, message: 'RSVP confirmed' });
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
      return res.json({ success: true, rsvped: false });
    }

    const rsvped = await checkEventRSVPEmail(pool, id as string, email as string);
    return res.json({ success: true, rsvped });
  } catch (error) {
    console.error('Error checking RSVP:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function trackShareHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { referrerEmail, clickedByEmail } = req.body;

    await insertShareClick(pool, id as string, referrerEmail as string, clickedByEmail as string);
    res.json({ success: true, message: 'Share click tracked' });
  } catch (error) {
    console.error('Error tracking share click:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function getEventForFeedbackHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const event = await getEventForFeedback(pool, id as string);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching event for feedback:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function checkFeedbackHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.json({ success: true, submitted: false });
    }

    const submitted = await checkUserFeedback(pool, id as string, email as string);
    return res.json({ success: true, submitted });
  } catch (error) {
    console.error('Error checking feedback status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function submitFeedbackHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { id } = req.params;
    const { email, rating, feedback } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (rating === undefined || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Valid rating (1-5) is required' });
    }

    // Check if they already rated
    const alreadySubmitted = await checkUserFeedback(pool, id as string, email as string);
    if (alreadySubmitted) {
      return res.status(400).json({ success: false, error: 'Feedback already submitted for this event' });
    }

    await insertFeedback(pool, id as string, email as string, rating, feedback || '');
    return res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
