import dotenv from 'dotenv';
import path from 'path';

// MUST LOAD DOTENV BEFORE EXPORTING CONFIGS
const result = dotenv.config({ path: path.join(__dirname, '..', '.env') });
if (result.error) {
  console.log('Error loading .env file:', result.error);
}

export const config = {
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://lead_arch:password123@localhost:5433/vibecheck_db',
  
  // WhatsApp Settings
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '114670068407425',
  
  // LLM Settings
  RUN_MODE: (process.env.RUN_MODE || 'cloud').trim(),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  CHAT_MODEL: process.env.CHAT_MODEL || 'llama3.1',
  EMBED_MODEL: process.env.EMBED_MODEL || 'mxbai-embed-large',
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
};
