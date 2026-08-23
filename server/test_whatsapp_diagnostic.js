const https = require('https');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

const {
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_OTP_TEMPLATE_NAME,
  WHATSAPP_OTP_TEMPLATE_LANGUAGE,
  WHATSAPP_OTP_TEMPLATE_HAS_BUTTON
} = process.env;

console.log('--- Config loaded ---');
console.log('WHATSAPP_PHONE_NUMBER_ID:', WHATSAPP_PHONE_NUMBER_ID);
console.log('WHATSAPP_OTP_TEMPLATE_NAME:', WHATSAPP_OTP_TEMPLATE_NAME);
console.log('WHATSAPP_OTP_TEMPLATE_LANGUAGE:', WHATSAPP_OTP_TEMPLATE_LANGUAGE);
console.log('WHATSAPP_OTP_TEMPLATE_HAS_BUTTON:', WHATSAPP_OTP_TEMPLATE_HAS_BUTTON);
console.log('WHATSAPP_ACCESS_TOKEN prefix:', WHATSAPP_ACCESS_TOKEN ? WHATSAPP_ACCESS_TOKEN.substring(0, 15) + '...' : 'undefined');

if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
  console.error('Error: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing from .env.local!');
  process.exit(1);
}

const recipient = '919160048855'; // Test recipient phone number
const code = '123456';

const components = [
  {
    type: 'body',
    parameters: [
      {
        type: 'text',
        text: code,
      },
      {
        type: 'text',
        text: 'VibeCheck Space',
      },
    ],
  },
];

if (WHATSAPP_OTP_TEMPLATE_HAS_BUTTON !== 'false') {
  components.push({
    type: 'button',
    sub_type: 'url',
    index: '0',
    parameters: [
      {
        type: 'text',
        text: code,
      },
    ],
  });
}

const payload = {
  messaging_product: 'whatsapp',
  to: recipient,
  type: 'template',
  template: {
    name: WHATSAPP_OTP_TEMPLATE_NAME || 'vibecheck_otp_template',
    language: {
      code: WHATSAPP_OTP_TEMPLATE_LANGUAGE || 'en_US',
    },
    components,
  },
};

const payloadString = JSON.stringify(payload);

console.log('\n--- Request Payload ---');
console.log(JSON.stringify(payload, null, 2));

const options = {
  hostname: 'graph.facebook.com',
  path: `/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadString)
  }
};

console.log('\nSending request to Meta API...');
const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n--- Meta API Response ---');
    console.log('Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Body:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Body:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('\nRequest Error:', e);
});

req.write(payloadString);
req.end();
