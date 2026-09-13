import { config } from '../config';

async function setupWebhook() {
  const token = config.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set in your .env file.');
    console.log('👉 Please set TELEGRAM_BOT_TOKEN in server/.env and try again.');
    process.exit(1);
  }

  const webhookUrl = process.argv[2] || `${config.WEB_APP_URL}/api/telegram/webhook`;

  console.log(`\n🤖 --- TELEGRAM BOT SETUP UTILITY ---`);
  console.log(`Bot Token: ${token.substring(0, 10)}...`);
  console.log(`Setting Webhook URL to: ${webhookUrl}\n`);

  try {
    // 1. Get Bot Info
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = (await meRes.json()) as { ok: boolean; result?: { username?: string; first_name?: string }; description?: string };
    if (!meData.ok) {
      console.error('❌ Failed to connect to Telegram with this token:', meData);
      process.exit(1);
    }
    console.log(`✅ Connected successfully to Bot: @${meData.result?.username} (${meData.result?.first_name})`);

    // 2. Set Webhook
    const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query']
      })
    });
    const setData = (await setRes.json()) as { ok: boolean; description?: string };
    if (setData.ok) {
      console.log(`✅ Webhook registered successfully!`);
      console.log(`Status: ${setData.description}`);
    } else {
      console.error('⚠️ Could not set webhook:', setData);
    }

    // 3. Check Webhook Info
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = (await infoRes.json()) as { ok: boolean; result?: unknown; description?: string };
    console.log('\n📡 Current Webhook Info:', JSON.stringify(infoData.result, null, 2));

  } catch (err) {
    console.error('❌ Network error during setup:', err);
  }
}

setupWebhook();
