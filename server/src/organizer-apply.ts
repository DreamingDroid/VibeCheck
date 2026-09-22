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
const verifiedTokens = new Map<string, { type: 'email' | 'phone' | 'instagram'; value: string; expiry: number }>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function normalizeInstagramHandle(input: string): string {
  if (!input) return '';
  let handle = input.trim();
  // Remove URL prefixes if provided
  handle = handle.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  // Remove trailing slashes and query params
  handle = handle.split(/[/?#]/)[0];
  // Remove leading @
  handle = handle.replace(/^@/, '');
  return handle.toLowerCase().trim();
}

export async function getInstagramAuthUrlHandler(req: Request, res: Response) {
  try {
    const hasCredentials = Boolean(config.INSTAGRAM_CLIENT_ID && config.INSTAGRAM_CLIENT_SECRET);
    
    if (!hasCredentials) {
      return res.json({
        success: true,
        isDevMode: true,
        message: 'Instagram Meta OAuth in Sandbox / Dev Simulation mode.',
      });
    }

    const clientId = config.INSTAGRAM_CLIENT_ID;
    const redirectUri = encodeURIComponent(config.INSTAGRAM_REDIRECT_URI);
    // Use Instagram Business Login domain & permission scope
    const scope = encodeURIComponent('instagram_business_basic');
    const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    return res.json({
      success: true,
      isDevMode: false,
      authUrl,
    });
  } catch (error: any) {
    console.error('Error in getInstagramAuthUrlHandler:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate Instagram authorization URL' });
  }
}

export async function exchangeInstagramCodeHandler(req: Request, res: Response, pool: Pool) {
  const { code, devHandle, email, redirectUri } = req.body;

  try {
    let verifiedHandle = '';
    const hasCredentials = Boolean(config.INSTAGRAM_CLIENT_ID && config.INSTAGRAM_CLIENT_SECRET);

    if (hasCredentials && code && code !== 'dev_simulation') {
      const cleanCode = String(code).replace(/#_$/, '').split('#')[0].trim();
      const targetRedirectUri = redirectUri || config.INSTAGRAM_REDIRECT_URI;

      // Exchange authorization code for Instagram access token
      const tokenForm = new URLSearchParams();
      tokenForm.append('client_id', config.INSTAGRAM_CLIENT_ID);
      tokenForm.append('client_secret', config.INSTAGRAM_CLIENT_SECRET);
      tokenForm.append('grant_type', 'authorization_code');
      tokenForm.append('redirect_uri', targetRedirectUri);
      tokenForm.append('code', cleanCode);

      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenForm.toString(),
        signal: AbortSignal.timeout(15000),
      });

      const tokenData = (await tokenRes.json()) as any;
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('Instagram Token Exchange Failed:', tokenData);
        return res.status(400).json({
          success: false,
          error: tokenData.error_message || tokenData.error?.message || 'Failed to exchange Instagram authorization code',
        });
      }

      // Fetch user profile info from Meta Graph API
      let username = '';
      const userRes = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${tokenData.access_token}`,
        { signal: AbortSignal.timeout(15000) }
      );
      const userData = (await userRes.json()) as any;

      if (userRes.ok && userData.username) {
        username = userData.username;
      } else if (tokenData.user_id) {
        // Fallback: fetch using user_id if /me query did not return username
        const altUserRes = await fetch(
          `https://graph.instagram.com/${tokenData.user_id}?fields=id,username&access_token=${tokenData.access_token}`,
          { signal: AbortSignal.timeout(15000) }
        );
        const altData = (await altUserRes.json()) as any;
        if (altUserRes.ok && altData.username) {
          username = altData.username;
        }
      }

      if (!username) {
        console.error('Instagram Profile Fetch Failed:', userData);
        return res.status(400).json({
          success: false,
          error: userData.error?.message || 'Failed to retrieve Instagram profile username',
        });
      }

      verifiedHandle = normalizeInstagramHandle(username);
    } else {
      // Dev / Simulation Mode
      if (!devHandle) {
        return res.status(400).json({ success: false, error: 'Instagram handle required for verification' });
      }
      verifiedHandle = normalizeInstagramHandle(devHandle);
    }

    if (!verifiedHandle) {
      return res.status(400).json({ success: false, error: 'Invalid Instagram handle resolved' });
    }

    // Check if this Instagram handle is already registered to another active or pending organizer
    const callerEmail = (email || (req.headers['x-user-email'] as string) || '').toLowerCase().trim();
    const duplicateCheck = await pool.query(
      `SELECT email, status, brand_name 
       FROM admins 
       WHERE LOWER(instagram_handle) = $1 AND status != 'rejected'`,
      [verifiedHandle]
    );

    if (duplicateCheck.rows.length > 0) {
      const existing = duplicateCheck.rows[0];
      const isSameApplicant = callerEmail && existing.email.toLowerCase().trim() === callerEmail;
      if (!isSameApplicant) {
        if (existing.status === 'pending_approval') {
          return res.status(400).json({
            success: false,
            error: `Instagram account @${verifiedHandle} is already linked to another application pending approval.`,
          });
        }
        if (existing.status === 'approved') {
          return res.status(400).json({
            success: false,
            error: `Instagram account @${verifiedHandle} is already registered to an active organizer.`,
          });
        }
      }
    }

    // Generate secure Instagram verification token
    const token = 'ig_' + crypto.randomBytes(32).toString('hex');
    verifiedTokens.set(token, {
      type: 'instagram',
      value: verifiedHandle,
      expiry: Date.now() + TOKEN_EXPIRY_MS,
    });

    const fullInstagramUrl = `https://instagram.com/${verifiedHandle}`;

    return res.json({
      success: true,
      token,
      handle: verifiedHandle,
      instagramUrl: fullInstagramUrl,
      message: `Successfully verified Instagram account @${verifiedHandle}!`,
    });
  } catch (error: any) {
    console.error('Error in exchangeInstagramCodeHandler:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error verifying Instagram account' });
  }
}

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
          from: 'VibeCheck <onboarding@resend.dev>',
          to: value,
          subject: 'VibeCheck Verification Code',
          html: `<p>Your VibeCheck verification code is: <strong>${code}</strong></p><p>It will expire in 10 minutes.</p>`
        }).catch(err => console.error('[Verification] Error sending Resend email in background:', err));
      }
    } else if (type === 'phone') {
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
    email, phone, phoneToken, instagramToken 
  } = req.body;
  
  if (!brandName || !description || !email || !phone || !phoneToken) {
    return res.status(400).json({ success: false, error: 'Missing required fields or verification tokens' });
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

  // Validate Instagram verification token
  let cleanInstagramHandle: string | null = null;
  let isInstagramVerified = false;

  if (instagramUrl || instagramToken) {
    if (!instagramToken) {
      return res.status(400).json({
        success: false,
        error: 'Instagram account ownership verification is required. Please verify with Instagram before submitting.',
      });
    }

    const igVerif = verifiedTokens.get(instagramToken);
    if (!igVerif || igVerif.type !== 'instagram' || Date.now() > igVerif.expiry) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired Instagram verification token. Please verify your Instagram account again.',
      });
    }

    const submittedHandle = normalizeInstagramHandle(instagramUrl || '');
    if (submittedHandle !== igVerif.value) {
      return res.status(400).json({
        success: false,
        error: `Submitted Instagram URL does not match the verified account @${igVerif.value}.`,
      });
    }

    cleanInstagramHandle = igVerif.value;
    isInstagramVerified = true;
  } else {
    return res.status(400).json({
      success: false,
      error: 'Please verify your business Instagram account to proceed with organizer registration.',
    });
  }

  // Clean up used tokens
  verifiedTokens.delete(phoneToken);
  if (instagramToken) verifiedTokens.delete(instagramToken);

  const finalInstagramUrl = cleanInstagramHandle ? `https://instagram.com/${cleanInstagramHandle}` : (instagramUrl || null);
  const socialLinks = { facebook: facebookUrl || '', instagram: finalInstagramUrl || '' };

  try {
    // 1. Check for existing organizer application by email, phone, or instagram
    const existingCheck = await pool.query(
      `SELECT id, email, phone_number, instagram_handle, role, status, rejection_reason 
       FROM admins 
       WHERE LOWER(email) = $1 OR phone_number = $2 OR (instagram_handle IS NOT NULL AND LOWER(instagram_handle) = $3)`,
      [cleanEmail, formattedPhone, cleanInstagramHandle]
    );

    const existingEmailMatch = existingCheck.rows.find(r => r.email.toLowerCase() === cleanEmail);
    const existingPhoneMatch = existingCheck.rows.find(r => r.phone_number === formattedPhone);
    const existingInstagramMatch = cleanInstagramHandle 
      ? existingCheck.rows.find(r => r.instagram_handle && r.instagram_handle.toLowerCase() === cleanInstagramHandle) 
      : null;

    // Check if Instagram handle belongs to a different active/pending organizer
    if (existingInstagramMatch && existingInstagramMatch.email.toLowerCase() !== cleanEmail) {
      if (existingInstagramMatch.status === 'pending_approval') {
        return res.status(400).json({
          success: false,
          error: `Instagram account @${cleanInstagramHandle} is linked to another application pending review.`,
        });
      }
      if (existingInstagramMatch.status === 'approved') {
        return res.status(400).json({
          success: false,
          error: `Instagram account @${cleanInstagramHandle} is already registered to another active organizer.`,
        });
      }
    }

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
               instagram_handle = $5,
               instagram_verified = $6,
               status = 'pending_approval', 
               rejection_reason = NULL, 
               phone_verified = true, 
               email_verified = true, 
               created_at = CURRENT_TIMESTAMP
           WHERE LOWER(email) = $7`,
          [brandName, description, JSON.stringify(socialLinks), formattedPhone, cleanInstagramHandle, isInstagramVerified, cleanEmail]
        );

        // Notify SuperAdmins of the re-application
        notifySuperAdmins(pool, {
          title: `Organizer Re-Application: ${brandName}`,
          message: `${brandName} (${cleanEmail}) has re-submitted their organizer application for review (Instagram: @${cleanInstagramHandle}).`,
          type: 'approval_pending',
          link: '/admin/organizers?tab=pending',
          metadata: { brand_name: brandName, email: cleanEmail, phone: formattedPhone, instagram_handle: cleanInstagramHandle, type: 'organizer_application' },
          emailSubject: `[VibeCheck Admin] Organizer Re-Application: ${brandName}`,
          emailHtml: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6366f1; margin-top: 0;">Organizer Re-Application Submitted</h2>
              <p>An organizer whose previous application was rejected has updated their details and re-submitted for review.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 6px 0;"><strong>Brand / Organization:</strong> ${brandName}</p>
                <p style="margin: 6px 0;"><strong>Contact Email:</strong> ${cleanEmail}</p>
                <p style="margin: 6px 0;"><strong>Phone:</strong> ${formattedPhone}</p>
                <p style="margin: 6px 0;"><strong>Instagram:</strong> @${cleanInstagramHandle} (Verified via OAuth)</p>
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
        email, role, status, brand_name, description, social_links, phone_number, email_verified, phone_verified, instagram_verified, instagram_handle
      ) VALUES (
        $1, 'organizer', 'pending_approval', $2, $3, $4::jsonb, $5, true, true, $6, $7
      )`,
      [cleanEmail, brandName, description, JSON.stringify(socialLinks), formattedPhone, isInstagramVerified, cleanInstagramHandle]
    );

    // Notify SuperAdmins of the pending application
    notifySuperAdmins(pool, {
      title: `New Organizer Application: ${brandName}`,
      message: `${brandName} (${cleanEmail}) has submitted an application for organizer approval (Instagram: @${cleanInstagramHandle}).`,
      type: 'approval_pending',
      link: '/admin/organizers?tab=pending',
      metadata: { brand_name: brandName, email: cleanEmail, phone: formattedPhone, instagram_handle: cleanInstagramHandle, type: 'organizer_application' },
      emailSubject: `[VibeCheck Admin] New Organizer Application: ${brandName}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1; margin-top: 0;">New Organizer Application Submitted</h2>
          <p>A new organizer has registered and submitted an application for review on VibeCheck.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Brand / Organization:</strong> ${brandName}</p>
            <p style="margin: 6px 0;"><strong>Contact Email:</strong> ${cleanEmail}</p>
            <p style="margin: 6px 0;"><strong>Phone:</strong> ${formattedPhone}</p>
            <p style="margin: 6px 0;"><strong>Instagram:</strong> @${cleanInstagramHandle} (Verified via OAuth)</p>
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
      if (error.constraint === 'idx_admins_unique_instagram') {
        return res.status(400).json({ success: false, error: 'This Instagram handle is already registered to another organizer.' });
      }
      return res.status(400).json({ success: false, error: 'An account with this email, phone number, or Instagram handle already exists.' });
    }
    console.error('Application submission error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}


