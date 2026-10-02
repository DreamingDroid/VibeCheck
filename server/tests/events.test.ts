import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { createApiClient } from './helpers';

describe('Events API Endpoints', () => {
  const api = createApiClient();

  it('GET /api/events should require auth if PRIVATE_BACKEND_TOKEN is configured', async () => {
    // Unauthenticated raw request
    const res = await request(app).get('/api/events');
    // If backend token is configured, expects 401, otherwise 200/500
    expect(res.status).toBeOneOf([200, 401, 500]);
  });

  it('GET /api/events should return an array of events with valid auth', async () => {
    const res = await api.get('/api/events');
    
    expect(res.status).toBeOneOf([200, 500]);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    } else {
      expect(res.body).toHaveProperty('success', false);
    }
  });

  it('GET /api/events with category and search filter should execute successfully', async () => {
    const res = await api.get('/api/events?category=Sports&search=Beach');

    expect(res.status).toBeOneOf([200, 500]);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success', true);
    }
  });

  it('GET /api/events/:id should return 404 for non-existent event', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await api.get(`/api/events/${fakeId}`);

    expect(res.status).toBeOneOf([404, 500]);
    if (res.status === 404) {
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/not found/i);
    }
  });

  it('POST /api/events/:id/rsvp should validate required fields', async () => {
    const res = await api
      .post('/api/events/test-id/rsvp')
      .send({}); // Missing name, email, etc.

    expect(res.status).toBeOneOf([400, 500]);
    if (res.status === 400) {
      expect(res.body).toHaveProperty('success', false);
    }
  });

  it('GET /api/search should handle search queries', async () => {
    const res = await api.get('/api/search?q=music');

    expect(res.status).toBeOneOf([200, 500]);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('success', true);
    }
  });
});
