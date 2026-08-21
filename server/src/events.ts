import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getEventsList, getEventById, insertEventRSVPEmail, checkEventRSVPEmail } from './queries/events';
import mockData from './mock-data-for-testing.json';

export async function getEventsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { category, search, city } = req.query;
    
    let rows = await getEventsList(pool, category, search, city);
    
    // Fallback to mock data if DB is empty
    if (rows.length === 0 && !category && !search && !city) {
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

    const event = await getEventById(pool, id as string);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.status === 'housefull') {
      return res.status(400).json({ success: false, error: 'This event is housefull' });
    }

    if (event.participant_limit && event.rsvp_count >= event.participant_limit) {
      return res.status(400).json({ success: false, error: 'This event is full' });
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
