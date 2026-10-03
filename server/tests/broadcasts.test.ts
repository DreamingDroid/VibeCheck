import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApiClient } from './helpers';
import { initializeDatabase, pool } from '../src/index';

describe('Organizer Event Broadcasts & In-App / FCM Notifications API', () => {
  const api = createApiClient();

  const timestamp = Date.now();
  const testOrganizerEmail = `qa_broadcast_org_${timestamp}@vibecheck.dev`;
  const testAttendeeEmail = `qa_attendee_${timestamp}@vibecheck.dev`;
  const adminEmail = `admin@vibecheck.dev`;

  let eventId: string | null = null;
  let receivedNotificationId: string | null = null;
  const mockFcmToken = `fcm_token_device_${timestamp}`;

  beforeAll(async () => {
    // 0. Ensure schema migrations
    await initializeDatabase();

    // Ensure SuperAdmin exists
    await pool.query(`
      INSERT INTO admins (email, role, status)
      VALUES ($1, 'SuperAdmin', 'approved')
      ON CONFLICT (email) DO UPDATE SET role = 'SuperAdmin', status = 'approved'
    `, [adminEmail]);

    // 1. Create and approve test event
    const eventRes = await api.post('/api/admin/events').send({
      title: `QA Broadcast Fest ${timestamp}`,
      description: 'Automated test event for organizer and admin broadcasts.',
      category: 'Music',
      location: 'Port View Amphitheatre',
      city: 'Visakhapatnam',
      date_time: new Date(Date.now() + 86400000 * 3).toISOString(),
      organizer_email: testOrganizerEmail,
      is_paid: false
    });

    if (eventRes.body?.data?.id) {
      eventId = eventRes.body.data.id;
      await api.put(`/api/admin/events/${eventId}/review`).send({
        status: 'approved'
      });

      // 2. Register attendee RSVP so attendee is eligible to receive event broadcasts
      await api.post(`/api/events/${eventId}/rsvp`).send({
        email: testAttendeeEmail,
        name: 'QA Broadcast Attendee',
        age_confirmed: true
      });
    }
  });

  afterAll(async () => {
    if (eventId) {
      await api.delete(`/api/admin/events/${eventId}`);
    }
  });

  describe('1. Audience Estimation & Admin Global Broadcasts', () => {
    it('GET /api/admin/broadcasts/recipients-count should validate scope and return estimate', async () => {
      const res = await api.get('/api/admin/broadcasts/recipients-count?scope=global');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(typeof res.body.data?.total).toBe('number');
    });

    it('POST /api/admin/broadcasts should reject invalid message types or missing fields', async () => {
      const res = await api.post('/api/admin/broadcasts').send({
        title: 'Announcement',
        message: 'Hello World',
        type: 'invalid_type_xyz',
        scope: 'global',
        admin_email: adminEmail
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/admin/broadcasts should dispatch city-wide broadcast from SuperAdmin', async () => {
      const res = await api.post('/api/admin/broadcasts').send({
        title: `City Announcement ${timestamp}`,
        message: 'Exciting weekend festivals arriving across Visakhapatnam!',
        type: 'general_update',
        scope: 'city',
        target_city: 'Visakhapatnam',
        admin_email: adminEmail,
        link: '/dashboard'
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /api/admin/broadcasts should list broadcast dispatch history', async () => {
      const res = await api.get('/api/admin/broadcasts?limit=10');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Organizer Event-Level Broadcasts & Spam Guardrails', () => {
    it('POST /api/organizer/events/:id/in-app-broadcast should reject non-organizer unauthorized senders', async () => {
      if (!eventId) return;

      const res = await api
        .post(`/api/organizer/events/${eventId}/in-app-broadcast`)
        .send({
          title: 'Unauthorized Announcement',
          message: 'Trying to broadcast without being the organizer.',
          type: 'general_update',
          organizer_email: 'stranger_hacker@example.com'
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/not the organizer/i);
    });

    it('POST /api/organizer/events/:id/in-app-broadcast should reject profanity / abusive content', async () => {
      if (!eventId) return;

      const res = await api
        .post(`/api/organizer/events/${eventId}/in-app-broadcast`)
        .send({
          title: 'Exclusive Update',
          message: 'Earn $500 per day free bitcoin crypto giveaway click here',
          type: 'general_update',
          organizer_email: testOrganizerEmail
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/rejected/i);
    });

    it('POST /api/organizer/events/:id/in-app-broadcast should successfully send update to attendees', async () => {
      if (!eventId) return;

      const res = await api
        .post(`/api/organizer/events/${eventId}/in-app-broadcast`)
        .send({
          title: `Venue Gate Update ${timestamp}`,
          message: 'Gate opening has been moved to 5:30 PM IST. Please carry your digital pass QR code.',
          type: 'agenda_shift',
          organizer_email: testOrganizerEmail
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('POST /api/organizer/events/:id/in-app-broadcast should enforce 4-hour cooldown for standard updates', async () => {
      if (!eventId) return;

      const res = await api
        .post(`/api/organizer/events/${eventId}/in-app-broadcast`)
        .send({
          title: 'Spam Followup',
          message: 'Another update within 5 minutes.',
          type: 'general_update',
          organizer_email: testOrganizerEmail
        });

      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/cooldown/i);
    });

    it('POST /api/organizer/events/:id/in-app-broadcast should allow emergency_alert during cooldown', async () => {
      if (!eventId) return;

      const res = await api
        .post(`/api/organizer/events/${eventId}/in-app-broadcast`)
        .send({
          title: 'Urgent Weather Notice',
          message: 'Heavy rain predicted: Event moved indoors to Hall B.',
          type: 'emergency_alert',
          organizer_email: testOrganizerEmail
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('GET /api/organizer/broadcasts should list broadcasts sent by organizer', async () => {
      const res = await api.get(`/api/organizer/broadcasts?organizer_email=${encodeURIComponent(testOrganizerEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. User In-App Notification Center', () => {
    it('GET /api/notifications should deliver broadcast to attendee notification feed', async () => {
      const res = await api.get(`/api/notifications?email=${encodeURIComponent(testAttendeeEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('notifications');
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);

      const latest = res.body.data.notifications[0];
      expect(latest).toHaveProperty('id');
      expect(latest).toHaveProperty('title');
      expect(latest.is_read).toBe(false);
      receivedNotificationId = latest.id;
    });

    it('GET /api/notifications/unread-count should return count of unread alerts', async () => {
      const res = await api.get(`/api/notifications/unread-count?email=${encodeURIComponent(testAttendeeEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(typeof res.body.count).toBe('number');
      expect(res.body.count).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/notifications/mark-read should mark a single notification as read', async () => {
      if (!receivedNotificationId) return;

      const res = await api.post('/api/notifications/mark-read').send({
        notificationId: receivedNotificationId,
        email: testAttendeeEmail
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('POST /api/notifications/mark-all-read should clear all unread badges for user', async () => {
      const res = await api.post('/api/notifications/mark-all-read').send({
        email: testAttendeeEmail
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify unread count is 0
      const countRes = await api.get(`/api/notifications/unread-count?email=${encodeURIComponent(testAttendeeEmail)}`);
      expect(countRes.body.count).toBe(0);
    });
  });

  describe('4. Firebase Cloud Messaging (FCM) Device Registration', () => {
    it('POST /api/notifications/fcm/register should register device token and subscribe to topics', async () => {
      const res = await api.post('/api/notifications/fcm/register').send({
        email: testAttendeeEmail,
        token: mockFcmToken,
        deviceInfo: { browser: 'Chrome', os: 'Linux' },
        city: 'Visakhapatnam',
        categories: ['Music', 'Food'],
        rsvpEventIds: eventId ? [eventId] : []
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.topics)).toBe(true);
      expect(res.body.topics).toContain('global');
      expect(res.body.topics).toContain('city_Visakhapatnam');
    });

    it('POST /api/notifications/fcm/subscribe-event should subscribe token to event topic', async () => {
      if (!eventId) return;

      const res = await api.post('/api/notifications/fcm/subscribe-event').send({
        email: testAttendeeEmail,
        eventId: eventId
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/Subscribed to event/i);
    });

    it('POST /api/notifications/fcm/unregister should remove device token on sign-out', async () => {
      const res = await api.post('/api/notifications/fcm/unregister').send({
        token: mockFcmToken
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });
});
