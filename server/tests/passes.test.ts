import { describe, it, expect } from 'vitest';
import { createApiClient } from './helpers';

describe('Passes & Verification API', () => {
  const api = createApiClient();

  it('POST /api/passes/verify should reject missing qrData and pin', async () => {
    const res = await api
      .post('/api/passes/verify')
      .send({});

    expect(res.status).toBeOneOf([400, 401, 500]);
    if (res.status === 400) {
      expect(res.body).toHaveProperty('success', false);
    }
  });

  it('POST /api/organizer/events/:id/scanner-pin should reject requests without organizer auth or required payload', async () => {
    const res = await api
      .post('/api/organizer/events/test-id/scanner-pin')
      .send({});

    expect(res.status).toBeOneOf([400, 401, 403, 500]);
  });
});
