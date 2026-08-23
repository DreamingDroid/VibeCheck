import dotenv from 'dotenv';
import path from 'path';

// MUST LOAD DOTENV BEFORE EXPORTING CONFIGS
const appEnv = process.env.APP_ENV || 'local';
const envFile = `.env.${appEnv}`;
console.log(`[Config] Loading environment: ${appEnv} (${envFile})`);
const result = dotenv.config({ path: path.join(__dirname, '..', envFile) });
if (result.error) {
  console.log(`[Config] Error loading ${envFile}, falling back to .env:`, result.error.message);
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

export const config = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://lead_arch:password123@localhost:5433/vibecheck_db',
  
  // WhatsApp Settings
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '114670068407425',
  WHATSAPP_OTP_TEMPLATE_NAME: process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'vibecheck_otp_template',
  WHATSAPP_OTP_TEMPLATE_LANGUAGE: process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || 'en_US',
  WHATSAPP_OTP_TEMPLATE_HAS_BUTTON: process.env.WHATSAPP_OTP_TEMPLATE_HAS_BUTTON !== 'false',

  
  // LLM Settings
  RUN_MODE: (process.env.RUN_MODE || 'cloud').trim(),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  CHAT_MODEL: process.env.CHAT_MODEL || 'llama3.1',
  EMBED_MODEL: process.env.EMBED_MODEL || 'mxbai-embed-large',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  RESEND_API_KEY: process.env.RESEND_API_KEY || 're_dummy_key_123'
};
