/**
 * Telegram Group Link Utilities
 */

export function isValidTelegramLink(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('https://t.me/') ||
    trimmed.startsWith('http://t.me/') ||
    trimmed.startsWith('https://telegram.me/') ||
    trimmed.startsWith('http://telegram.me/') ||
    trimmed.startsWith('t.me/') ||
    trimmed.startsWith('telegram.me/')
  );
}

export function formatTelegramLink(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('t.me/') || trimmed.startsWith('telegram.me/')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
