import { Resend } from 'resend';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

const resend = new Resend(config.RESEND_API_KEY);

function getLogoAttachment() {
  const possiblePaths = [
    path.join(__dirname, '../assets/logo.png'),
    path.join(__dirname, '../../../web/public/logo.png'),
    path.join(process.cwd(), 'src/assets/logo.png'),
    path.join(process.cwd(), '../web/public/logo.png')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch {
        // continue
      }
    }
  }
  return null;
}

export interface VenueAuthEmailParams {
  auditReferenceId: string;
  token: string;
  venueName: string;
  venueAddress: string;
  venueSectionHall?: string;
  venueOfficialEmail: string;
  organizerBrandName: string;
  organizerLegalName: string;
  organizerPhone: string;
  organizerEmail: string;
  eventTitle: string;
  eventCategory: string;
  eventStartTimeIST: string;
  eventEndTimeIST?: string;
  participantLimit?: number;
  isPaid: boolean;
  ticketPrice?: number;
  tokenExpiresAtIST: string;
}

export async function sendVenueAuthorizationEmail(params: VenueAuthEmailParams): Promise<boolean> {
  if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_dummy_key_123') {
    console.log(`[VenueAuth] RESEND_API_KEY not configured. Skipping email dispatch to ${params.venueOfficialEmail}. Token: ${params.token}`);
    return true;
  }

  const approveUrl = `${config.WEB_APP_URL}/venue/verify?token=${encodeURIComponent(params.token)}&action=approve`;
  const rejectUrl = `${config.WEB_APP_URL}/venue/verify?token=${encodeURIComponent(params.token)}&action=reject`;
  const logoBuffer = getLogoAttachment();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>VibeCheck Venue Authorization Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px; margin: 0; line-height: 1.6;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Brand Top Bar -->
    <div style="background-color: #09090b; padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle;">
            <table style="border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; padding-right: 12px;">
                  <img src="https://res.cloudinary.com/s5nvbxwx/image/upload/v1790533934/vibecheck_assets/vibecheck_brand_logo.png" alt="VibeCheck Space Logo" width="34" height="34" style="border-radius: 8px; display: block; border: 1px solid rgba(255,255,255,0.15);" />
                </td>
                <td style="vertical-align: middle;">
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 900; font-style: italic; letter-spacing: -0.5px; color: #ffffff; line-height: 1;">
                    VIBECHECK<span style="color: #22c55e; font-style: normal; display: inline-block; transform: skewX(-12deg); margin-left: 2px;">SPACE</span><sup style="font-size: 9px; font-weight: 700; color: #a1a1aa; vertical-align: top; margin-left: 2px;">™</sup>
                  </div>
                  <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #a1a1aa; margin-top: 3px;">
                    Event Discovery &amp; Safety Protocol
                  </div>
                </td>
              </tr>
            </table>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <span style="display: inline-block; background-color: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 9999px;">
              🛡️ Legal Audit
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Top Reference Banner -->
    <div style="background: linear-gradient(135deg, #18181b 0%, #0f172a 100%); color: #ffffff; padding: 22px 24px; text-align: left; border-bottom: 1px solid #27272a;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #38bdf8; margin-bottom: 6px;">
        Official Legal Verification
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
        Venue Authorization Request
      </h1>
      <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa;">
        Audit Reference: <strong style="color: #f4f4f5; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${params.auditReferenceId}</strong>
      </p>
    </div>

    <!-- Body Notice -->
    <div style="padding: 24px;">
      <p style="font-size: 14px; margin-top: 0;">
        Dear Management of <strong>${params.venueName}</strong>,
      </p>
      <p style="font-size: 13px; color: #475569;">
        This is an official verification notice from <strong>VibeCheck</strong>. An event organizer has listed a scheduled gathering/event to take place at your premises. <strong>To prevent unauthorized gatherings and protect consumer safety, your explicit written electronic authorization is required before this event can be published and tickets can be sold.</strong>
      </p>

      <!-- Section 1: Organizer Identification -->
      <div style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #334155;">
          1. Organizer Identification (Verified on VibeCheck)
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; width: 38%; color: #64748b; font-weight: 600;">Brand / Organizer:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${params.organizerBrandName} (${params.organizerLegalName})</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Verified Phone:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${params.organizerPhone} (OTP Verified)</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; color: #64748b; font-weight: 600;">Verified Email:</td>
            <td style="padding: 9px 14px; font-weight: 700; color: #0f172a;">${params.organizerEmail}</td>
          </tr>
        </table>
      </div>

      <!-- Section 2: Event Details -->
      <div style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #334155;">
          2. Event Details &amp; Proposed Schedule
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; width: 38%; color: #64748b; font-weight: 600;">Event Title:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${params.eventTitle}</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Category:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${params.eventCategory}</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Date &amp; Time:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${params.eventStartTimeIST}${params.eventEndTimeIST ? ` to ${params.eventEndTimeIST}` : ''}</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Venue Area / Hall:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${params.venueSectionHall || 'Main Premises / Designated Area'}</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Max Headcount Limit:</td>
            <td style="padding: 9px 14px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${params.participantLimit ? `${params.participantLimit} Attendees Maximum` : 'Uncapped / Open'}</td>
          </tr>
          <tr>
            <td style="padding: 9px 14px; color: #64748b; font-weight: 600;">Commercial Ticket Sales:</td>
            <td style="padding: 9px 14px; font-weight: 700; color: ${params.isPaid ? '#b45309' : '#15803d'};">
              ${params.isPaid ? `PAID EVENT (Ticket Price: ₹${params.ticketPrice || 0} per person)` : 'FREE COMMUNITY EVENT'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Section 3: Legal Terms & Declaration -->
      <div style="margin-top: 20px; background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; font-size: 12px; color: #78350f;">
        <strong style="display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Legal Declaration &amp; Authorization:</strong>
        By clicking <strong>"I Confirm &amp; Authorize This Event"</strong>, you, as an authorized representative or owner of <strong>${params.venueName}</strong>, hereby declare and confirm that:
        <ol style="margin: 6px 0 0; padding-left: 18px; line-height: 1.6;">
          <li><strong>Valid Booking:</strong> The named organizer (<strong>${params.organizerLegalName}</strong>, Phone: <strong>${params.organizerPhone}</strong>) has an authentic and confirmed reservation at <strong>${params.venueName}</strong> for the specified date, time, and designated area.</li>
          <li><strong>Permitted Activity &amp; Capacity:</strong> The venue management explicitly authorizes the organizer to host up to <strong>${params.participantLimit || 'agreed'} attendees</strong> and ${params.isPaid ? 'conduct commercial ticketed entry' : 'host this gathering'} on the premises.</li>
          <li><strong>Platform Indemnification:</strong> VibeCheck Space is solely an event discovery platform and is not a party to the venue agreement, nor liable for rental fees, damages, cancellations, or disputes between the venue and the organizer.</li>
        </ol>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top: 28px; text-align: center;">
        <a href="${approveUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; margin-right: 8px; box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.25);">
          ✅ I Confirm &amp; Authorize This Event
        </a>
        <div style="margin-top: 12px;">
          <a href="${rejectUrl}" style="display: inline-block; color: #dc2626; text-decoration: underline; font-weight: 600; font-size: 13px;">
            ❌ Reject / Report Unauthorized
          </a>
        </div>
      </div>

      <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
        This secure legal authorization link is uniquely generated for <strong>${params.venueName}</strong> and expires on <strong>${params.tokenExpiresAtIST}</strong> (48 Hours).<br/>
        If this booking is unrecognized or unauthorized, clicking "Reject" will immediately block the listing to prevent unauthorized gatherings.
        <div style="margin-top: 14px; font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">
          ⚡ Powered by VibeCheck Space™ • A Product of BayBuzz Labs
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

  try {
    const fromAddress = config.RESEND_FROM_EMAIL;
    let result = await resend.emails.send({
      from: fromAddress,
      replyTo: config.RESEND_REPLY_TO,
      to: params.venueOfficialEmail,
      subject: `URGENT: Legal Authorization Request for Event at ${params.venueName} — Ref #${params.auditReferenceId}`,
      html
    });

    if (result.error) {
      console.error(`[VenueAuth] Resend error dispatching to ${params.venueOfficialEmail}:`, result.error.message);
      return false;
    }

    console.log(`[VenueAuth] Legal authorization email sent successfully to ${params.venueOfficialEmail}. ID: ${result.data?.id}`);
    return true;
  } catch (err: any) {
    console.error(`[VenueAuth] Error sending authorization email to ${params.venueOfficialEmail}:`, err.message);
    return false;
  }
}

export async function sendVenueReminderToOrganizer(params: {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  venueName: string;
  eventDateIST: string;
}): Promise<boolean> {
  if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_dummy_key_123') {
    return true;
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
    <h2 style="color: #ea580c; margin-top: 0;">⏳ Venue Authorization Pending</h2>
    <p>Hi <strong>${params.organizerName}</strong>,</p>
    <p>
      48 hours have elapsed since you submitted your paid event <strong>"${params.eventTitle}"</strong> scheduled for <strong>${params.eventDateIST}</strong> at <strong>${params.venueName}</strong>.
    </p>
    <p>
      We have not yet received electronic authorization from the management of <strong>${params.venueName}</strong>.
    </p>
    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px; margin: 16px 0; font-size: 13px; color: #9a3412;">
      <strong>Action Required:</strong> Please contact your venue manager/owner directly and ask them to check their inbox for the official verification email from VibeCheck to approve your event.
    </div>
    <p style="font-size: 12px; color: #64748b;">
      Once approved by the venue, your event will automatically receive the <strong>🛡️ Venue Confirmed</strong> badge and attendee payment details will be unlocked.
    </p>
  </div>
</body>
</html>
`;

  try {
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      replyTo: config.RESEND_REPLY_TO,
      to: params.organizerEmail,
      subject: `Action Required: Venue Verification Pending for "${params.eventTitle}"`,
      html
    });
    if (result.error) {
      console.error('[VenueAuth] Resend error sending reminder email to organizer:', result.error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[VenueAuth] Error sending reminder email to organizer:', err.message);
    return false;
  }
}

export async function sendAuthorizationConfirmationReceipt(params: {
  auditReferenceId: string;
  venueName: string;
  venueEmail: string;
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  eventDateIST: string;
  signedAtIST: string;
}): Promise<boolean> {
  if (!config.RESEND_API_KEY || config.RESEND_API_KEY === 're_dummy_key_123') {
    return true;
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; border: 1px solid #16a34a; border-radius: 12px; padding: 24px;">
    <div style="background-color: #dcfce7; color: #15803d; padding: 12px; border-radius: 8px; font-weight: bold; margin-bottom: 16px;">
      ✅ Venue Authorization Confirmed &amp; Recorded
    </div>
    <h3 style="margin-top: 0;">Certificate of Authorization</h3>
    <p>This confirms that <strong>${params.venueName}</strong> has officially authorized the event <strong>"${params.eventTitle}"</strong> on <strong>${params.eventDateIST}</strong> organized by <strong>${params.organizerName}</strong>.</p>
    <p style="font-size: 12px; color: #64748b;">
      Audit Reference: <strong>${params.auditReferenceId}</strong><br/>
      Recorded Timestamp: <strong>${params.signedAtIST}</strong>
    </p>
  </div>
</body>
</html>
`;

  try {
    const recipients = [params.venueEmail, params.organizerEmail].filter(Boolean);
    const result = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      replyTo: config.RESEND_REPLY_TO,
      to: recipients,
      subject: `[CONFIRMED] Venue Authorization Receipt — ${params.eventTitle} (Ref: ${params.auditReferenceId})`,
      html
    });
    if (result.error) {
      console.error('[VenueAuth] Resend error sending confirmation receipt:', result.error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('[VenueAuth] Error sending authorization confirmation receipt:', err.message);
    return false;
  }
}
