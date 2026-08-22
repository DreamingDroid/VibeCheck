import { Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';
import { Resend } from 'resend';
import { config } from './config';
import { sendWhatsAppMessage } from './whatsapp';

const resend = new Resend(config.RESEND_API_KEY);

// Cache for OTPs: key -> { code, expiry }
// Key format: "email:foo@bar.com" or "phone:919999999999"
const applyOtpCache = new Map<string, { code: string; expiry: number }>();

// Cache for verified tokens: token -> { type, value, expiry }
const verifiedTokens = new Map<string, { type: 'email' | 'phone'; value: string; expiry: number }>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export async function sendApplyOtpHandler(req: Request, res: Response) {
  const { type, value } = req.body;
  
  if (!type || !value || (type !== 'email' && type !== 'phone')) {
    return res.status(400).json({ success: false, error: 'Valid type (email/phone) and value required' });
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
      let formattedPhone = value.replace(/\D/g, '');
      if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
      
      const message = `Your VibeCheck verification code is: *${code}*. It will expire in 10 minutes.`;
      
      console.log(`[Verification] [Dev Mode] Phone Code for ${formattedPhone}: ${code}`);
      
      if (config.WHATSAPP_PHONE_NUMBER_ID) {
        sendWhatsAppMessage(config.WHATSAPP_PHONE_NUMBER_ID, formattedPhone, message)
          .catch(err => console.error('[Verification] Error sending WhatsApp message in background:', err));
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
    await pool.query(
      `INSERT INTO admins (
        email, role, status, brand_name, description, social_links, phone_number, email_verified, phone_verified
      ) VALUES (
        $1, 'organizer', 'pending_approval', $2, $3, $4::jsonb, $5, true, true
      )`,
      [email, brandName, description, JSON.stringify(socialLinks), formattedPhone]
    );
    res.json({ success: true, message: 'Application submitted successfully' });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'An account with this email or phone number already exists' });
    }
    console.error('Application submission error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
