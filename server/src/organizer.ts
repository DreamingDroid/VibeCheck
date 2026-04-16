import { Request, Response } from 'express';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';
import { createOrganizerEvent, getEventsByOrganizerEmail, getEventByOrganizer, getOrganizerEventRSVPs, getBroadcastAttendees } from './queries/events';
import { getSystemSetting } from './queries/analytics';
import { config } from './config';

export async function organizerCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, city, date_time, external_link, contact_info, organizer_email } = req.body;
  
  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const event = await createOrganizerEvent(pool, req.body);
    res.json({ success: true, data: event, message: 'Event submitted for approval.' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerGetEventsHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const rows = await getEventsByOrganizerEmail(pool, email as string);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Secure RSVP endpoint for Organizers (No emails returned)
export async function organizerGetEventRsvpsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { email } = req.query;
  
  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    // Basic verification that they are the organizer
    const eventCheck = await getEventByOrganizer(pool, id as string);
    if (!eventCheck || eventCheck.organizer_email !== email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const rows = await getOrganizerEventRSVPs(pool, id as string);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Organizer RSVP error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Broadcast stats
export async function getBroadcastStatsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { email } = req.query;

  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const eventCheck = await getEventByOrganizer(pool, id as string);
    if (!eventCheck || eventCheck.organizer_email !== email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    let costPerMessage = 2;
    try {
       const val = await getSystemSetting(pool, 'whatsapp_broadcast_rate');
       if (val) costPerMessage = Number(val) || 2;
    } catch(e) {}

    const attendees = await getBroadcastAttendees(pool, id as string);
    const count = attendees.length;
    
    res.json({
      success: true,
      eligibleCount: count,
      costPerMessage,
      totalCost: count * costPerMessage
    });
  } catch (error) {
    console.error('Broadcast Stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// Perform Broadcast
export async function broadcastMessageHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email, message } = req.body;

  if (!organizer_email || !message) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  try {
    const eventCheck = await getEventByOrganizer(pool, id as string);
    if (!eventCheck || eventCheck.organizer_email !== organizer_email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const eventTitle = eventCheck.title;

    const rows = await getBroadcastAttendees(pool, id as string);

    // Send the message locally by calling sendWhatsAppMessage
    const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
    let sentCount = 0;

    for (const r of rows) {
      if (r.phone_number) {
         const finalMsg = `*Update for ${eventTitle}*\n\n${message}\n\n- The Organizer`;
         await sendWhatsAppMessage(phoneNumberId, r.phone_number, finalMsg);
         sentCount++;
      }
    }

    res.json({ success: true, message: `Successfully broadcasted to ${sentCount} attendees.` });
  } catch (error) {
    console.error('Broadcast Exec error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

