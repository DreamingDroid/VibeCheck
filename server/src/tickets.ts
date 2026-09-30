import { Request, Response } from 'express';
import { Pool } from 'pg';
import { getChatModel } from './rag';
import { runFastFilter } from './moderation';
import { sendTelegramMessage } from './telegram';
import { notifySuperAdmins } from './notifications';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

function generateTicketNumber(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `TC-${randomDigits}`;
}

const SUPPORT_AGENT_SYSTEM_PROMPT = `You are "VibeCheck Support AI", an empathetic, concise, and helpful customer support agent for VibeCheckSpace (an events and nightlife discovery platform).
Your task is to review the user's issue and provide a direct, helpful solution or troubleshooting steps.

Platform Knowledge:
- Event Passes / Tickets: Passes are issued digitally with a unique QR code. Users can view passes in their dashboard (/dashboard or /passes) or on Telegram (/passes) after RSVP.
- Organizers: Organizers can create and manage their events at /organizer/events. Applications are reviewed within 24 hours.
- Cancellations & Refunds: Event refund policies are set by individual organizers. For paid events, contact the organizer via their contact link or profile.
- Entry Check-in: Attendees show the pass QR code to the gate bouncer/scanner.

Output Format:
You MUST respond with pure JSON only without markdown formatting:
{
  "can_auto_resolve": boolean, // true if standard FAQ/troubleshooting, false if requiring human admin action (refund dispute, account ban, server crash)
  "confidence": number, // 0.0 to 1.0
  "solution_text": "Helpful, friendly response addressing the user directly",
  "escalation_reason": "Reason for human escalation if can_auto_resolve is false"
}`;

export async function submitTicketHandler(req: Request, res: Response, pool: Pool) {
  const { user_email, phone_number, category, subject, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ success: false, error: 'Subject and message are required.' });
  }

  // Layer 1: Check foul language
  const fastCheck = runFastFilter(`${subject} ${message}`);
  if (!fastCheck.passed) {
    return res.status(400).json({
      success: false,
      error: 'Your message contains prohibited or abusive language. Please revise your inquiry respectfully.',
    });
  }

  const cleanEmail = user_email ? user_email.toLowerCase().trim() : null;
  const cleanPhone = phone_number ? phone_number.trim() : null;
  const ticketNumber = generateTicketNumber();
  const safeCategory = ['pass_booking', 'event_issue', 'organizer_inquiry', 'bug_report', 'other'].includes(category)
    ? category
    : 'other';

  try {
    // Layer 2: Run AI First-Responder
    let aiResponseText = '';
    let aiConfidence = 0.5;
    let initialStatus: 'open' | 'ai_resolved' | 'escalated' = 'open';

    try {
      const chat = getChatModel();
      const userPrompt = `User Query:\nEmail: ${cleanEmail || 'N/A'}\nPhone: ${cleanPhone || 'N/A'}\nCategory: ${safeCategory}\nSubject: ${subject}\nMessage: ${message}`;

      const aiResult = await chat.invoke([
        new SystemMessage(SUPPORT_AGENT_SYSTEM_PROMPT),
        new HumanMessage(userPrompt),
      ]);

      let rawContent = aiResult.content;
      if (typeof rawContent !== 'string') rawContent = JSON.stringify(rawContent);
      rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(rawContent);
      aiResponseText = parsed.solution_text || '';
      aiConfidence = Number(parsed.confidence) || 0.5;

      if (parsed.can_auto_resolve && aiConfidence >= 0.8) {
        initialStatus = 'ai_resolved';
      } else {
        initialStatus = 'escalated';
      }
    } catch (aiErr) {
      console.warn('[Support Ticket] AI first-responder failed, defaulting to escalated:', aiErr);
      initialStatus = 'escalated';
      aiResponseText = 'Thank you for reaching out. We have logged your request and our support team will get back to you shortly.';
    }

    // Insert Ticket into Database
    const { rows } = await pool.query(
      `INSERT INTO support_tickets (
        ticket_number, user_email, phone_number, category, subject, message, status, ai_response, ai_confidence, resolved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        ticketNumber,
        cleanEmail,
        cleanPhone,
        safeCategory,
        subject,
        message,
        initialStatus,
        aiResponseText,
        aiConfidence,
        initialStatus === 'ai_resolved' ? new Date() : null,
      ]
    );

    const ticket = rows[0];

    // If escalated or requires human attention, notify SuperAdmins
    if (initialStatus === 'escalated') {
      notifySuperAdmins(pool, {
        title: `🚨 Support Ticket Escalation: ${ticketNumber}`,
        message: `[${safeCategory.toUpperCase()}] ${subject}: "${message.substring(0, 100)}..." from ${cleanEmail || cleanPhone || 'Guest'}`,
        type: 'support_ticket',
        link: `/admin/tickets?id=${ticket.id}`,
        metadata: { ticket_id: ticket.id, ticket_number: ticketNumber, category: safeCategory, user_email: cleanEmail },
      }).catch(err => console.warn('[Notifications] Error notifying superadmins for ticket:', err.message));
    }

    return res.json({
      success: true,
      data: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        ai_response: ticket.ai_response,
        created_at: ticket.created_at,
      },
      message:
        initialStatus === 'ai_resolved'
          ? 'Here is an instant solution from VibeCheck AI Support.'
          : 'Ticket created. Our team has been notified.',
    });
  } catch (error: any) {
    console.error('[Support Ticket] Error creating ticket:', error);
    return res.status(500).json({ success: false, error: 'Internal server error processing support ticket.' });
  }
}

export async function getTicketStatusHandler(req: Request, res: Response, pool: Pool) {
  const { ticketNumber } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT id, ticket_number, category, subject, message, status, ai_response, created_at, resolved_at
       FROM support_tickets
       WHERE ticket_number = $1 OR id::text = $1`,
      [ticketNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Support ticket not found.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[Support Ticket] Error fetching ticket:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}

export async function adminListTicketsHandler(req: Request, res: Response, pool: Pool) {
  try {
    const { status, category } = req.query;
    let query = `SELECT * FROM support_tickets WHERE 1=1`;
    const params: any[] = [];

    if (status && typeof status === 'string') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (category && typeof category === 'string') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const { rows } = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Support Ticket Admin] Error listing tickets:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}
