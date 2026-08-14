import { config } from './config';

export async function sendTelegramMessage(chatIdOrUsername: string, text: string): Promise<boolean> {
  const token = config.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.log(`[Telegram Bot Mock] Notification sent to ${chatIdOrUsername}:`);
    console.log(`----------------------------------------`);
    console.log(text);
    console.log(`----------------------------------------`);
    return true;
  }

  // If we have a token, check if target is numeric (chat_id) or starts with '-' (group chat_id)
  const isNumericChatId = /^-?\d+$/.test(chatIdOrUsername.trim());
  if (!isNumericChatId) {
    console.warn(`[Telegram Bot] Cannot send API message directly to username '${chatIdOrUsername}' without a numeric Chat ID.`);
    console.log(`[Telegram Bot Mock Fallback] Sent to ${chatIdOrUsername}: ${text}`);
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatIdOrUsername.trim(),
        text: text,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      console.error(`[Telegram Bot] Send failed:`, await response.text());
      return false;
    }
    console.log(`[Telegram Bot] Message sent to ${chatIdOrUsername}`);
    return true;
  } catch (error) {
    console.error(`[Telegram Bot] Network error:`, error);
    return false;
  }
}
