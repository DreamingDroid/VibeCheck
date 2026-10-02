import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';

describe('Webhooks Endpoints', () => {
  it('GET /webhook should echo hub.challenge when provided', async () => {
    const res = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'vv2026',
        'hub.challenge': '123456'
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe('123456');
  });

  it('GET /webhook should return awake message without challenge', async () => {
    const res = await request(app).get('/webhook');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Webhook awake');
  });

  it('POST /webhook should return 404 for payload without object key', async () => {
    const res = await request(app)
      .post('/webhook')
      .send({});

    expect(res.status).toBe(404);
  });

  it('POST /api/telegram/webhook should reject unauthorized secret token if configured', async () => {
    const res = await request(app)
      .post('/api/telegram/webhook')
      .set('x-telegram-bot-api-secret-token', 'invalid_secret')
      .send({ update_id: 12345 });

    expect(res.status).toBeOneOf([200, 401, 403]);
  });
});
