import { Request, Response } from 'express';
import { Pool } from 'pg';
import { Resend } from 'resend';
import { sendWhatsAppMessage } from './whatsapp';
import { createOrganizerEvent, getEventsByOrganizerEmail, getEventByOrganizer, getOrganizerEventRSVPs, getBroadcastAttendees, updateOrganizerEvent, getOrganizerEventAnalytics, getOrganizerAverageVelocity, toggleEventHousefull, updateEventStatusByOrganizer, issueOrganizerEventPass, cancelOrganizerEventRSVP, updateEventWhatsAppGroupLink, getEventById } from './queries/events';
import { createBroadcastAndDispatch, getAudienceRecipientEmails, CreateBroadcastInput } from './queries/broadcasts';
import { sendFcmTopicBroadcast } from './firebaseAdmin';
import { getSystemSetting, getOrganizerDashboardAnalytics } from './queries/analytics';
import { config } from './config';
import { getChatModel } from './rag';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getOrganizerCrmContacts, upsertOrganizerCrmNotes, getPhoneNumbersForEmails } from './queries/crm';
import { notifySuperAdmins } from './notifications';

const resend = new Resend(config.RESEND_API_KEY);

export async function organizerCreateEventHandler(req: Request, res: Response, pool: Pool) {
  const { title, description, category, location, city, date_time, end_time, timings, external_link, contact_info, organizer_email } = req.body;

  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const event = await createOrganizerEvent(pool, req.body);

    // Notify SuperAdmins of the pending event application
    notifySuperAdmins(pool, {
      title: `New Event Pending Approval: ${title}`,
      message: `Organizer (${organizer_email}) submitted "${title}" for review.`,
      type: 'event_pending_approval',
      link: '/admin/events?tab=pending',
      metadata: { event_id: event?.id, title, organizer_email, city, category, type: 'event_pending_approval' },
      emailSubject: `[VibeCheck Admin] New Event Submitted for Approval: ${title}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1; margin-top: 0;">New Event Submitted for Approval</h2>
          <p>An organizer has created and submitted a new event for review on VibeCheck.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Event Title:</strong> ${title}</p>
            <p style="margin: 6px 0;"><strong>Organizer:</strong> ${organizer_email}</p>
            <p style="margin: 6px 0;"><strong>Category:</strong> ${category || 'General'}</p>
            <p style="margin: 6px 0;"><strong>Location / City:</strong> ${location || 'TBA'} (${city || 'Unspecified'})</p>
            <p style="margin: 6px 0;"><strong>Date & Time:</strong> ${date_time ? new Date(date_time).toLocaleString() : 'TBA'}</p>
          </div>
          <div style="margin-top: 24px;">
            <a href="${config.WEB_APP_URL}/admin/events?tab=pending" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Event in Admin Portal &rarr;</a>
          </div>
        </div>
      `
    }).catch(err => console.warn('[Notifications] Error in notifySuperAdmins on event create:', err.message));

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

    // Notify SuperAdmins of resubmitted event
    notifySuperAdmins(pool, {
      title: `Event Resubmitted: ${data.title || 'Event'}`,
      message: `Organizer (${organizer_email}) updated and resubmitted "${data.title || 'their event'}" for approval.`,
      type: 'event_pending_approval',
      link: '/admin/events?tab=pending',
      metadata: { event_id: id, title: data.title, organizer_email, type: 'event_pending_approval' },
      emailSubject: `[VibeCheck Admin] Event Resubmitted for Approval: ${data.title || 'Event'}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1; margin-top: 0;">Event Resubmitted for Review</h2>
          <p>The organizer <strong>${organizer_email}</strong> has updated their event and resubmitted it for approval.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Event Title:</strong> ${data.title || 'Updated Event'}</p>
            <p style="margin: 6px 0;"><strong>Organizer:</strong> ${organizer_email}</p>
          </div>
          <div style="margin-top: 24px;">
            <a href="${config.WEB_APP_URL}/admin/events?tab=pending" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Resubmitted Event &rarr;</a>
          </div>
        </div>
      `
    }).catch(err => console.warn('[Notifications] Error in notifySuperAdmins on event update:', err.message));

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

export async function organizerToggleHousefullHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email } = req.body;

  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const result = await toggleEventHousefull(pool, id as string, organizer_email);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Event not found or unauthorized' });
    }
    if (result.success === false) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, status: result.status, message: `Event status updated to ${result.status}.` });
  } catch (error) {
    console.error('Error toggling housefull:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerUpdateStatusHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email, status } = req.body;

  if (!organizer_email || !status) return res.status(400).json({ success: false, error: 'Missing parameters' });

  try {
    const result = await updateEventStatusByOrganizer(pool, id as string, organizer_email, status);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Event not found or unauthorized' });
    }
    if (result.success === false) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, status: result.status, message: `Event status updated to ${result.status}.` });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerGetCrmContactsHandler(req: Request, res: Response, pool: Pool) {
  const { email } = req.query;
  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const contacts = await getOrganizerCrmContacts(pool, email as string);
    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error fetching CRM contacts:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerUpsertCrmNotesHandler(req: Request, res: Response, pool: Pool) {
  const { organizer_email, contact_email, notes, tags } = req.body;

  if (!organizer_email || !contact_email) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }

  try {
    await upsertOrganizerCrmNotes(pool, organizer_email, contact_email, notes || '', tags || []);
    res.json({ success: true, message: 'CRM contact notes updated successfully.' });
  } catch (error) {
    console.error('Error updating CRM contact notes:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerCrmBroadcastHandler(req: Request, res: Response, pool: Pool) {
  const { organizer_email, contact_emails, message } = req.body;

  if (!organizer_email || !contact_emails || !Array.isArray(contact_emails) || !message) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  try {
    const phoneNumbers = await getPhoneNumbersForEmails(pool, contact_emails);

    const phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
    let sentCount = 0;

    for (const phone of phoneNumbers) {
      if (phone) {
        const finalMsg = `${message}\n\n- Sent by Organizer`;
        await sendWhatsAppMessage(phoneNumberId, phone, finalMsg);
        sentCount++;
      }
    }

    res.json({ success: true, message: `Successfully broadcasted to ${sentCount} contacts.` });
  } catch (error) {
    console.error('Error sending CRM broadcast:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerGetDashboardAnalyticsHandler(req: Request, res: Response, pool: Pool) {
  const email = req.query.email as string;

  if (!email) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const data = await getOrganizerDashboardAnalytics(pool, email);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching organizer dashboard analytics:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerIssuePassHandler(req: Request, res: Response, pool: Pool) {
  const { id, rsvpId } = req.params;
  const { email } = req.body;

  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const eventCheck = await getEventByOrganizer(pool, id as string);
    if (!eventCheck || eventCheck.organizer_email !== email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updated = await issueOrganizerEventPass(pool, id as string, rsvpId as string);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'RSVP not found' });
    }

    res.json({ success: true, data: updated, message: 'Attendee pass issued successfully!' });
  } catch (error) {
    console.error('Issue pass error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function organizerCancelRsvpHandler(req: Request, res: Response, pool: Pool) {
  const { id, rsvpId } = req.params;
  const { email } = req.body;

  if (!email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const eventCheck = await getEventByOrganizer(pool, id as string);
    if (!eventCheck || eventCheck.organizer_email !== email) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updated = await cancelOrganizerEventRSVP(pool, id as string, rsvpId as string);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'RSVP not found' });
    }

    res.json({ success: true, data: updated, message: 'RSVP cancelled successfully.' });
  } catch (error) {
    console.error('Cancel RSVP error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Update WhatsApp group link for an event
 * PUT /api/organizer/events/:id/whatsapp-group
 */
export async function organizerUpdateWhatsAppGroupLinkHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email, whatsapp_group_link } = req.body;

  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const eventCheck = await getEventByOrganizer(pool, id as string);
    if (!eventCheck || eventCheck.organizer_email !== organizer_email) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not the organizer of this event' });
    }

    const updated = await updateEventWhatsAppGroupLink(pool, id as string, organizer_email, whatsapp_group_link);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Event not found or unauthorized' });
    }

    res.json({ success: true, data: updated, message: 'WhatsApp group invite link updated successfully.' });
  } catch (error) {
    console.error('Update WhatsApp group link error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/**
 * Dispatch WhatsApp Group Invite Notification to all RSVP'd Attendees
 * POST /api/organizer/events/:id/whatsapp-group-invite
 */
export async function organizerSendWhatsAppGroupInviteHandler(req: Request, res: Response, pool: Pool) {
  const { id } = req.params;
  const { organizer_email, whatsapp_group_link, custom_message } = req.body;

  if (!organizer_email) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const event = await getEventById(pool, id as string);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (event.organizer_email !== organizer_email) {
      return res.status(403).json({ success: false, error: 'Forbidden: You are not the organizer of this event' });
    }

    const linkToUse = (whatsapp_group_link || event.whatsapp_group_link || '').trim();
    if (!linkToUse) {
      return res.status(400).json({ success: false, error: 'Please provide a valid WhatsApp group invite link.' });
    }

    // Persist new link if updated
    if (whatsapp_group_link && whatsapp_group_link.trim() !== (event.whatsapp_group_link || '').trim()) {
      await updateEventWhatsAppGroupLink(pool, id as string, organizer_email, linkToUse);
    }

    const title = `💬 WhatsApp Group Invite: ${event.title}`;
    const defaultMsg = `Join the official attendee WhatsApp group for "${event.title}" to chat with the organizer and fellow guests!`;
    const message = custom_message && custom_message.trim() ? custom_message.trim() : defaultMsg;

    const input: CreateBroadcastInput = {
      title,
      message,
      type: 'whatsapp_group_invite',
      scope: 'event',
      target_event_id: id as string,
      sender_email: organizer_email,
      sender_role: 'organizer',
      link: linkToUse,
      metadata: {
        event_id: id,
        event_title: event.title,
        whatsapp_group_link: linkToUse,
        action: 'join_whatsapp_group'
      }
    };

    const result = await createBroadcastAndDispatch(pool, input);

    // Instant FCM push broadcast to event topic
    sendFcmTopicBroadcast({
      topic: `event_${id}`,
      title,
      message,
      type: 'whatsapp_group_invite',
      link: linkToUse,
      metadata: {
        broadcast_id: result.broadcast.id,
        event_id: id,
        event_title: event.title,
        whatsapp_group_link: linkToUse,
        action: 'join_whatsapp_group'
      }
    }).catch(err => console.error('[FCM WhatsApp Invite Broadcast Error]:', err));

    // Optional email dispatch via Resend
    if (config.RESEND_API_KEY && config.RESEND_API_KEY !== 're_dummy_key_123' && result.recipientCount > 0) {
      getAudienceRecipientEmails(pool, { scope: 'event', eventId: id as string })
        .then(async (recipientEmails) => {
          for (const email of recipientEmails) {
            await resend.emails.send({
              from: 'VibeCheck <onboarding@resend.dev>',
              to: email,
              subject: `Join the WhatsApp Group for ${event.title}`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 20px;">
                  <div style="display: inline-block; padding: 6px 12px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px;">
                    💬 Official Attendee Group Chat
                  </div>
                  <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 900; font-style: italic; text-transform: uppercase;">You're Invited to Join the Group!</h2>
                  <p style="font-size: 14px; color: #475569;">The organizer of <strong>${event.title}</strong> has invited all confirmed RSVPs to connect, coordinate, and chat before the event.</p>
                  
                  <div style="background: #f8fafc; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e293b; font-size: 13px; font-weight: 600;">"${message}"</p>
                  </div>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${linkToUse}" style="background: #22c55e; color: #ffffff; padding: 16px 32px; border-radius: 9999px; text-decoration: none; font-weight: 900; font-size: 14px; display: inline-block; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.4);">
                      👉 Join WhatsApp Group Chat
                    </a>
                  </div>
                  
                  <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px;">
                    You received this official invitation because you are RSVP'd to ${event.title} on VibeCheck.
                  </p>
                </div>
              `
            }).catch(err => console.warn(`[WhatsApp Invite Email Error to ${email}]:`, err.message));
          }
        })
        .catch(err => console.warn('[Error fetching recipient emails for invite]:', err.message));
    }

    res.json({
      success: true,
      message: `WhatsApp group invite successfully dispatched to ${result.recipientCount} RSVP'd attendees!`,
      data: {
        recipientCount: result.recipientCount,
        whatsapp_group_link: linkToUse
      }
    });
  } catch (error: any) {
    console.error('Send WhatsApp group invite error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
