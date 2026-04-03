import { Request, Response } from 'express';
import { Pool } from 'pg';
import { sendWhatsAppMessage } from './whatsapp';

// Internal cache for verification codes (phone_number -> {code, expiry, email})
const verificationCache = new Map<string, { code: string; expiry: number; email: string }>();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

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

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  verificationCache.set(formattedPhone, { code, expiry, email });

  const message = `Your VibeCheck verification code is: *${code}*. It will expire in 10 minutes.`;

  try {
    if (WHATSAPP_PHONE_NUMBER_ID) {
      await sendWhatsAppMessage(WHATSAPP_PHONE_NUMBER_ID, formattedPhone, message);
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
    // 1. Update web_users table
    await pool.query(
      `UPDATE web_users SET phone_number = $1 WHERE email = $2`,
      [formattedPhone, email]
    );

    // 2. Also ensure user exists in WhatsApp users table (Tier 2)
    // Fetch existing preferences if any
    const webUserResult = await pool.query('SELECT categories FROM web_users WHERE email = $1', [email]);
    const categories = webUserResult.rows[0]?.categories || [];

    await pool.query(
      `INSERT INTO users (phone_number, name, preferences)
       VALUES ($1, (SELECT name FROM web_users WHERE email = $2), jsonb_build_object('categories', $3::jsonb))
       ON CONFLICT (phone_number) DO UPDATE
       SET preferences = jsonb_set(
             COALESCE(users.preferences, '{}'::jsonb),
             '{categories}',
             $3::jsonb
           ),
           updated_at = CURRENT_TIMESTAMP`,
      [formattedPhone, email, JSON.stringify(categories)]
    );

    // Success! Clear cache
    verificationCache.delete(formattedPhone);

    return res.json({ success: true, message: 'Phone number verified and linked' });
  } catch (error) {
    console.error('Error verifying phone number:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during verification' });
  }
}
