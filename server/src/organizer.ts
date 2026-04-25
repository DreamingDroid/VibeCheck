import { Request, Response } from 'express';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';
import { createOrganizerEvent, getEventsByOrganizerEmail, getEventByOrganizer, getOrganizerEventRSVPs, getBroadcastAttendees, updateOrganizerEvent, getOrganizerEventAnalytics, getOrganizerAverageVelocity } from './queries/events';
import { getSystemSetting } from './queries/analytics';
import { config } from './config';
import { getChatModel } from './rag';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export async function organizerCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, city, date_time, end_time, timings, external_link, contact_info, organizer_email } = req.body;

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
    } catch (e) { }

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


export async function organizerUpdateEventHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email, ...data } = req.body;

  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const rowCount = await updateOrganizerEvent(pool, id as string, organizer_email, data);
    if (!rowCount || rowCount === 0) {
      return res.status(403).json({ success: false, error: 'Cannot update this event. It may not be in needs_changes status or you may not be the owner.' });
    }
    res.json({ success: true, message: 'Event updated and resubmitted for approval.' });
  } catch (error) {
    console.error('Organizer update event error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerGetEventAnalyticsHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const email = req.query.email as string;

  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const analytics = await getOrganizerEventAnalytics(pool, id as string);
    const avgVelocity = await getOrganizerAverageVelocity(pool, email);
    
    // We can also compute total RSVPs for this event specifically
    const totalRsvps = analytics.reduce((sum, item) => sum + parseInt(item.count as unknown as string, 10), 0);

    res.json({
      success: true,
      data: {
        timeline: analytics,
        totalRsvps,
        avgVelocity: parseFloat(Number(avgVelocity).toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching event analytics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerGeneratePromoHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { email } = req.query;

  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    console.log('[Promo] Fetching event from DB...');
    const { rows } = await pool.query(
      `SELECT title, category, location, date_time, description 
       FROM events 
       WHERE id = $1 AND organizer_email = $2`,
      [id, email]
    );
    const event = rows[0];
    if (!event) return res.status(404).json({ success: false, error: 'Event not found or unauthorized' });
    console.log('[Promo] Event found. Constructing prompt...');

    const prompt = `You are a hype-building marketing assistant for VibeCheck. 
      Generate a short marketing promo kit for the following event:
      Title: ${event.title}
      Category: ${event.category}
      Location: ${event.location || 'TBA'}
      Date: ${new Date(event.date_time).toLocaleString()}
      Description: ${event.description}

      Please output strictly in the following Markdown format:

      ### 📱 Instagram Captions
      1. [Caption option 1]
      2. [Caption option 2]
      3. [Caption option 3]

      ### 💬 WhatsApp Blast
      [A punchy, emoji-filled, short message to send to past attendees or groups]

      ### ✉️ Newsletter Blurb
      [A slightly longer, exciting paragraph for an email newsletter]

      Keep it fun, high-energy, and suited to the event category! Do not include any other text besides the requested sections.`;

    console.log('[Promo] Invoking getChatModel()...');
    const llm = getChatModel();
    console.log('[Promo] Invoking LLM via LangChain...');

    const combinedPrompt = `You are an expert event marketer.\n\n${prompt}`;
    const response = await llm.invoke(combinedPrompt);

    console.log('[Promo] LLM Responded!');
    const generatedText = typeof response?.content === 'string' ? response.content.trim() : 'Failed to generate promo kit.';

    res.json({ success: true, data: generatedText });
  } catch (error) {
    console.error('Error generating promo kit:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
