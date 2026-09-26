import dotenv from 'dotenv';
import path from 'path';

// MUST LOAD DOTENV BEFORE EXPORTING CONFIGS
const rawEnv = (process.env.APP_ENV || 'local').toLowerCase().trim();
const envMap: Record<string, string> = {
  dev: 'development',
  development: 'development',
  uat: 'uat',
  staging: 'uat',
  prd: 'production',
  prod: 'production',
  production: 'production',
  local: 'local'
};
const appEnv = envMap[rawEnv] || rawEnv;
const envFile = `.env.${appEnv}`;
console.log(`[Config] Loading environment: ${appEnv} (${envFile})`);
const result = dotenv.config({ path: path.join(__dirname, '..', envFile) });
if (result.error) {
  console.log(`[Config] Error loading ${envFile}, falling back to .env:`, result.error.message);
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

export const config = {
  APP_ENV: appEnv,
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://lead_arch:password123@localhost:5433/vibecheck_db',
  WEB_APP_URL: (process.env.WEB_APP_URL || (appEnv === 'production' ? 'https://vibecheckspace.com' : 'https://vibecheck-uat.vercel.app')).replace(/\/+$/, ''),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [],

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
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  CHAT_MODEL: process.env.CHAT_MODEL || 'llama3.3',
  EMBED_MODEL: process.env.EMBED_MODEL || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  RESEND_API_KEY: process.env.RESEND_API_KEY || 're_dummy_key_123',

  // Cloudinary Settings
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Telegram Settings
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'VibeCheckSpaceBot',
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || 'vibecheck_telegram_secret',
  // Instagram OAuth Settings
  INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID || process.env.INSTAGRAM_APP_ID || '',
  INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET || '',
  INSTAGRAM_REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || `${(process.env.WEB_APP_URL || (appEnv === 'production' ? 'https://vibecheckspace.com' : 'https://vibecheck-uat.vercel.app')).replace(/\/+$/, '')}/organizer/apply/instagram-callback`,

  // Security / Smart Proxy Token
  PRIVATE_BACKEND_TOKEN: process.env.PRIVATE_BACKEND_TOKEN || ''
};

