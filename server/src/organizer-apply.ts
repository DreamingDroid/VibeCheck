import { Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Resend } from 'resend';
import { config } from './config';
import { sendWhatsAppMessage, sendWhatsAppTemplateOTP } from './whatsapp';
import { notifySuperAdmins } from './notifications';

const resend = new Resend(config.RESEND_API_KEY);

// Cache for OTPs: key -> { code, expiry }
// Key format: "email:foo@bar.com" or "phone:919999999999"
const applyOtpCache = new Map<string, { code: string; expiry: number }>();

// Cache for verified tokens: token -> { type, value, expiry }
const verifiedTokens = new Map<string, { type: 'email' | 'phone'; value: string; expiry: number }>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export async function sendApplyOtpHandler(req: Request, res: Response, pool?: Pool) {
  const { type, value } = req.body;
  
  if (!type || !value || (type !== 'email' && type !== 'phone')) {
    return res.status(400).json({ success: false, error: 'Valid type (email/phone) and value required' });
  }

  let formattedPhone = '';
  if (type === 'phone') {
    formattedPhone = value.replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

    if (pool) {
      try {
        const { rows } = await pool.query(
          'SELECT email, status FROM admins WHERE phone_number = $1',
          [formattedPhone]
        );
        if (rows.length > 0) {
          if (rows[0].status === 'pending_approval') {
            return res.status(400).json({ success: false, error: 'An organizer application with this phone number is already pending approval.' });
          }
          if (rows[0].status === 'approved') {
            return res.status(400).json({ success: false, error: 'An active organizer account with this phone number already exists.' });
          }
        }
      } catch (err) {
        console.error('Error checking existing phone in sendApplyOtpHandler:', err);
      }
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + OTP_EXPIRY_MS;
  const cacheKey = `${type}:${value}`;

  applyOtpCache.set(cacheKey, { code, expiry });

  try {
    if (type === 'email') {
      console.log(`[Verification] [Dev Mode] Email Code for ${value}: ${code}`);
      if (config.RESEND_API_KEY && config.RESEND_API_KEY !== 're_dummy_key_123') {
        resend.emails.send({
          from: 'VibeCheck <onboarding@resend.dev>', // Needs a verified domain in prod
          to: value,
          subject: 'VibeCheck Verification Code',
          html: `<p>Your VibeCheck verification code is: <strong>${code}</strong></p><p>It will expire in 10 minutes.</p>`
        }).catch(err => console.error('[Verification] Error sending Resend email in background:', err));
      }
    } else if (type === 'phone') {
      const message = `Your VibeCheck verification code is: *${code}*. It will expire in 10 minutes.`;
      
      console.log(`[Verification] [Dev Mode] Phone Code for ${formattedPhone}: ${code}`);
      
      if (config.WHATSAPP_PHONE_NUMBER_ID) {
        sendWhatsAppTemplateOTP(config.WHATSAPP_PHONE_NUMBER_ID, formattedPhone, code)
          .catch(err => console.error('[Verification] Error sending WhatsApp template OTP in background:', err));
      }
    }
    
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error(`Error sending ${type} OTP:`, error);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
}

export async function verifyApplyOtpHandler(req: Request, res: Response) {
  const { type, value, code } = req.body;
  
  if (!type || !value || !code) {
    return res.status(400).json({ success: false, error: 'type, value, and code required' });
  }

  const cacheKey = `${type}:${value}`;
  const cachedData = applyOtpCache.get(cacheKey);

  if (!cachedData) {
    return res.status(400).json({ success: false, error: 'No OTP found or expired' });
  }

  if (Date.now() > cachedData.expiry) {
    applyOtpCache.delete(cacheKey);
    return res.status(400).json({ success: false, error: 'OTP expired' });
  }

  if (cachedData.code !== code) {
    return res.status(400).json({ success: false, error: 'Invalid OTP' });
  }

  // OTP is correct
  applyOtpCache.delete(cacheKey);
  
  const token = crypto.randomBytes(32).toString('hex');
  verifiedTokens.set(token, { type, value, expiry: Date.now() + TOKEN_EXPIRY_MS });
  
  res.json({ success: true, token });
}

export async function submitApplicationHandler(req: Request, res: Response, pool: Pool) {
  const { 
    brandName, description, facebookUrl, instagramUrl, 
    email, phone, phoneToken 
  } = req.body;
  
  if (!brandName || !description || !email || !phone || !phoneToken) {
    return res.status(400).json({ success: false, error: 'Missing required fields or tokens' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate phone token
  const phoneVerif = verifiedTokens.get(phoneToken);

  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

  let verifiedPhone = phoneVerif?.value.replace(/\D/g, '') || '';
  if (verifiedPhone.length === 10) verifiedPhone = '91' + verifiedPhone;

  if (!phoneVerif || phoneVerif.type !== 'phone' || verifiedPhone !== formattedPhone || Date.now() > phoneVerif.expiry) {
    return res.status(400).json({ success: false, error: 'Invalid or expired phone verification token' });
  }

  // Clean up tokens
  verifiedTokens.delete(phoneToken);

  const socialLinks = { facebook: facebookUrl, instagram: instagramUrl };

  try {
    // 1. Check for existing organizer application by email or phone
    const existingCheck = await pool.query(
      `SELECT id, email, phone_number, role, status, rejection_reason 
       FROM admins 
       WHERE LOWER(email) = $1 OR phone_number = $2`,
      [cleanEmail, formattedPhone]
    );

    const existingEmailMatch = existingCheck.rows.find(r => r.email.toLowerCase() === cleanEmail);
    const existingPhoneMatch = existingCheck.rows.find(r => r.phone_number === formattedPhone);

    // Case A: User with this email already exists
    if (existingEmailMatch) {
      if (existingEmailMatch.status === 'pending_approval') {
        return res.status(400).json({ 
          success: false, 
          error: 'Your organizer application is currently pending approval by the SuperAdmin. You cannot submit another request until your pending request is reviewed.' 
        });
      }

      if (existingEmailMatch.status === 'approved') {
        return res.status(400).json({ 
          success: false, 
          error: 'An active organizer account already exists with this email address.' 
        });
      }

      if (existingEmailMatch.status === 'rejected') {
        // Allow re-application: verify phone is not taken by another distinct account
        if (existingPhoneMatch && existingPhoneMatch.email.toLowerCase() !== cleanEmail) {
          return res.status(400).json({ 
            success: false, 
            error: 'This phone number is already registered to another organizer account.' 
          });
        }

        // Update the existing record with new details and reset to pending_approval
        await pool.query(
          `UPDATE admins 
           SET brand_name = $1, 
               description = $2, 
               social_links = $3::jsonb, 
               phone_number = $4, 
               status = 'pending_approval', 
               rejection_reason = NULL, 
               phone_verified = true, 
               email_verified = true, 
               created_at = CURRENT_TIMESTAMP
           WHERE LOWER(email) = $5`,
          [brandName, description, JSON.stringify(socialLinks), formattedPhone, cleanEmail]
        );

        // Notify SuperAdmins of the re-application
        notifySuperAdmins(pool, {
          title: `Organizer Re-Application: ${brandName}`,
          message: `${brandName} (${cleanEmail}) has re-submitted their organizer application for review.`,
          type: 'approval_pending',
          link: '/admin/organizers?tab=pending',
          metadata: { brand_name: brandName, email: cleanEmail, phone: formattedPhone, type: 'organizer_application' },
          emailSubject: `[VibeCheck Admin] Organizer Re-Application: ${brandName}`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6366f1; margin-top: 0;">Organizer Re-Application Submitted</h2>
              <p>An organizer whose previous application was rejected has updated their details and re-submitted for review.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 6px 0;"><strong>Brand / Organization:</strong> ${brandName}</p>
                <p style="margin: 6px 0;"><strong>Contact Email:</strong> ${cleanEmail}</p>
                <p style="margin: 6px 0;"><strong>Phone:</strong> ${formattedPhone}</p>
                <p style="margin: 6px 0;"><strong>Description:</strong> ${description}</p>
              </div>
              <div style="margin-top: 24px;">
                <a href="${config.WEB_APP_URL}/admin/organizers?tab=pending" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Application in Admin Portal &rarr;</a>
              </div>
            </div>
          `
        }).catch(err => console.warn('[Notifications] Error in notifySuperAdmins on re-apply:', err.message));

        return res.json({ success: true, message: 'Application re-submitted successfully! Please wait for admin approval.' });
      }
    }

    // Case B: Different email, but phone number is already registered
    if (existingPhoneMatch) {
      if (existingPhoneMatch.status === 'pending_approval') {
        return res.status(400).json({ 
          success: false, 
          error: 'An organizer application with this phone number is already pending approval by the SuperAdmin.' 
        });
      }
      if (existingPhoneMatch.status === 'approved') {
        return res.status(400).json({ 
          success: false, 
          error: 'An active organizer account with this phone number already exists.' 
        });
      }
      return res.status(400).json({ 
        success: false, 
        error: 'This phone number is already registered to another organizer application.' 
      });
    }

    // Case C: Brand new organizer application
    await pool.query(
      `INSERT INTO admins (
        email, role, status, brand_name, description, social_links, phone_number, email_verified, phone_verified
      ) VALUES (
        $1, 'organizer', 'pending_approval', $2, $3, $4::jsonb, $5, true, true
      )`,
      [cleanEmail, brandName, description, JSON.stringify(socialLinks), formattedPhone]
    );

    // Notify SuperAdmins of the pending application
    notifySuperAdmins(pool, {
      title: `New Organizer Application: ${brandName}`,
      message: `${brandName} (${cleanEmail}) has submitted an application for organizer approval.`,
      type: 'approval_pending',
      link: '/admin/organizers?tab=pending',
      metadata: { brand_name: brandName, email: cleanEmail, phone: formattedPhone, type: 'organizer_application' },
      emailSubject: `[VibeCheck Admin] New Organizer Application: ${brandName}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1; margin-top: 0;">New Organizer Application Submitted</h2>
          <p>A new organizer has registered and submitted an application for review on VibeCheck.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Brand / Organization:</strong> ${brandName}</p>
            <p style="margin: 6px 0;"><strong>Contact Email:</strong> ${cleanEmail}</p>
            <p style="margin: 6px 0;"><strong>Phone:</strong> ${formattedPhone}</p>
            <p style="margin: 6px 0;"><strong>Description:</strong> ${description}</p>
          </div>
          <div style="margin-top: 24px;">
            <a href="${config.WEB_APP_URL}/admin/organizers?tab=pending" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Review Application in Admin Portal &rarr;</a>
          </div>
        </div>
      `
    }).catch(err => console.warn('[Notifications] Error in notifySuperAdmins on apply:', err.message));

    return res.json({ success: true, message: 'Application submitted successfully! Please wait for admin approval.' });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'An account with this email or phone number already exists' });
    }
    console.error('Application submission error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

