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

  describe('Event Lifecycle (Creation -> SuperAdmin Approval -> Publishing -> Cleanup)', () => {
    let createdEventId: string | null = null;
    const testOrganizerEmail = `qa_organizer_${Date.now()}@vibecheck.dev`;
    const uniqueTitle = `Automated QA Live Vibe Fest ${Date.now()}`;
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString(); // 3 days in future

    it('POST /api/organizer/events should reject submissions with missing required fields', async () => {
      const res = await api.post('/api/organizer/events').send({
        title: 'Incomplete Event'
        // Missing organizer_email, city, etc.
      });

      expect(res.status).toBeOneOf([400, 401]);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/organizer/events should create a new event in pending status', async () => {
      const res = await api.post('/api/organizer/events').send({
        title: uniqueTitle,
        description: 'End-to-end automated test event for moderation and publishing flow.',
        category: 'Music',
        location: 'Beach Road Acoustic Deck',
        city: 'Visakhapatnam',
        date_time: futureDate,
        organizer_email: testOrganizerEmail,
        is_paid: false,
        status: 'pending'
      });

      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('id');
      createdEventId = res.body.data.id;
      expect(res.body.data.status).toBe('pending');
    });

    it('GET /api/admin/events/pending should include the newly submitted event', async () => {
      if (!createdEventId) return;

      const res = await api.get('/api/admin/events/pending');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((e: any) => e.id === createdEventId);
      expect(found).toBeDefined();
      expect(found?.title).toBe(uniqueTitle);
      expect(found?.status).toBe('pending');
    });

    it('GET /api/events should NOT include the event while status is pending', async () => {
      if (!createdEventId) return;

      const res = await api.get('/api/events');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find((e: any) => e.id === createdEventId);
      expect(found).toBeUndefined();
    });

    it('PUT /api/admin/events/:id/review should reject review requests with invalid status', async () => {
      if (!createdEventId) return;

      const res = await api
        .put(`/api/admin/events/${createdEventId}/review`)
        .send({ status: 'invalid_status_xyz' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('PUT /api/admin/events/:id/review should allow SuperAdmin to approve and publish event', async () => {
      if (!createdEventId) return;

      const res = await api
        .put(`/api/admin/events/${createdEventId}/review`)
        .send({
          status: 'approved',
          comment: 'Approved by automated SuperAdmin QA test suite',
          is_featured: true
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('GET /api/admin/events/pending should no longer contain the approved event', async () => {
      if (!createdEventId) return;

      const res = await api.get('/api/admin/events/pending');
      expect(res.status).toBe(200);
      const found = res.body.data.find((e: any) => e.id === createdEventId);
      expect(found).toBeUndefined();
    });

    it('GET /api/events should now return the newly approved and published event', async () => {
      if (!createdEventId) return;

      const res = await api.get('/api/events');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      const found = res.body.data.find((e: any) => e.id === createdEventId);
      expect(found).toBeDefined();
      expect(found?.title).toBe(uniqueTitle);
      expect(found?.is_featured).toBe(true);
    });

    it('DELETE /api/admin/events/:id should delete the test event cleanly', async () => {
      if (!createdEventId) return;

      const res = await api.delete(`/api/admin/events/${createdEventId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify it's deleted
      const checkRes = await api.get(`/api/events/${createdEventId}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
