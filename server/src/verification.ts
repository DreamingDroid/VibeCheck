import { Request, Response } from 'express';
import { Pool } from 'pg';
import { sendWhatsAppMessage, sendWhatsAppTemplateOTP } from './whatsapp';
import { linkUserPhoneNumber } from './queries/users';
import { config } from './config';

// Internal cache for verification codes (phone_number -> {code, expiry, email})
const verificationCache = new Map<string, { code: string; expiry: number; email: string }>();

const WHATSAPP_PHONE_NUMBER_ID = config.WHATSAPP_PHONE_NUMBER_ID;

export async function sendVerificationCodeHandler(req: Request, res: Response, pool: Pool) {
  const { phoneNumber, email } = req.body;

  if (!phoneNumber || !email) {
    return res.status(400).json({ success: false, error: 'Phone number and email are required' });
  }

  // Basic phone number cleaning - ensure it starts with country code if not present
  // This assumes Indian numbers by default if 10 digits are provided
  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }

  // Check if the phone number is already registered to another email
  try {
    const existingUser = await pool.query(
      'SELECT email FROM web_users WHERE phone_number = $1',
      [formattedPhone]
    );
    if (existingUser.rows.length > 0 && existingUser.rows[0].email !== email) {
      return res.status(400).json({
        success: false,
        error: 'This phone number is already registered with another profile. Please provide a different number.'
      });
    }
  } catch (dbErr) {
    console.error('Error checking existing phone registration:', dbErr);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  verificationCache.set(formattedPhone, { code, expiry, email });

  const message = `Your VibeCheck verification code is: *${code}*. It will expire in 10 minutes.`;

  try {
    if (WHATSAPP_PHONE_NUMBER_ID) {
      await sendWhatsAppTemplateOTP(WHATSAPP_PHONE_NUMBER_ID, formattedPhone, code);
      console.log(`[Verification] Sent code to ${formattedPhone}`);
    } else {
      console.log(`[Verification] [Dev Mode] Code for ${formattedPhone}: ${code}`);
    }
    
    return res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return res.status(500).json({ success: false, error: 'Failed to send verification code' });
  }
}

export async function verifyPhoneNumberHandler(req: Request, res: Response, pool: Pool) {
  const { phoneNumber, code, email } = req.body;

  if (!phoneNumber || !code || !email) {
    return res.status(400).json({ success: false, error: 'Phone number, code, and email are required' });
  }

  let formattedPhone = phoneNumber.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone;
  }

  // Double check if the phone number is already registered to another email
  try {
    const existingUser = await pool.query(
      'SELECT email FROM web_users WHERE phone_number = $1',
      [formattedPhone]
    );
    if (existingUser.rows.length > 0 && existingUser.rows[0].email !== email) {
      return res.status(400).json({
        success: false,
        error: 'This phone number is already registered with another profile. Please provide a different number.'
      });
    }
  } catch (dbErr) {
    console.error('Error checking existing phone registration on verify:', dbErr);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  const cachedValue = verificationCache.get(formattedPhone);

  if (!cachedValue) {
    return res.status(400).json({ success: false, error: 'No verification code found for this number' });
  }

  if (cachedValue.code !== code) {
    return res.status(400).json({ success: false, error: 'Invalid verification code' });
  }

  if (Date.now() > cachedValue.expiry) {
    verificationCache.delete(formattedPhone);
    return res.status(400).json({ success: false, error: 'Verification code expired' });
  }

  try {
    await linkUserPhoneNumber(pool, email, formattedPhone);

    // Success! Clear cache
    verificationCache.delete(formattedPhone);

    return res.json({ success: true, message: 'Phone number verified and linked' });
  } catch (error) {
    console.error('Error verifying phone number:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during verification' });
  }
}
