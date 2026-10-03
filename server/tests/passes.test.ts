import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApiClient } from './helpers';
import { initializeDatabase } from '../src/index';

describe('Attendee RSVP, Passes & Gate Scanner Anti-Passback System', () => {
  const api = createApiClient();

  const timestamp = Date.now();
  const testOrganizerEmail = `qa_scanner_org_${timestamp}@vibecheck.dev`;
  const testAttendeeEmail = `qa_attendee_${timestamp}@vibecheck.dev`;
  const manualAttendeeEmail = `qa_manual_attendee_${timestamp}@vibecheck.dev`;

  let eventId: string | null = null;
  let activeScannerPin: string | null = null;
  let attendeeQrToken: string | null = null;
  let manualAttendeeRsvpId: number | null = null;

  beforeAll(async () => {
    // 0. Ensure schema migrations have run
    await initializeDatabase();

    // 1. Create a published test event
    const eventRes = await api.post('/api/admin/events').send({
      title: `QA Scanner & Pass Fest ${timestamp}`,
      description: 'Automated test event for gate scanning and anti-passback defense.',
      category: 'Music',
      location: 'Sea Breeze Arena',
      city: 'Visakhapatnam',
      date_time: new Date(Date.now() + 86400000 * 2).toISOString(),
      organizer_email: testOrganizerEmail,
      is_paid: false
    });

    if (eventRes.body?.data?.id) {
      eventId = eventRes.body.data.id;
      // Approve event so it is active
      await api.put(`/api/admin/events/${eventId}/review`).send({
        status: 'approved'
      });
    }
  });

  afterAll(async () => {
    // Cleanup event
    if (eventId) {
      await api.delete(`/api/admin/events/${eventId}`);
    }
  });

  describe('1. Attendee RSVP & Digital Pass Generation', () => {
    it('POST /api/events/:id/rsvp should reject RSVP missing email', async () => {
      if (!eventId) return;

      const res = await api.post(`/api/events/${eventId}/rsvp`).send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/email is required/i);
    });

    it('POST /api/events/:id/rsvp should register attendee and initialize RSVP status', async () => {
      if (!eventId) return;

      const res = await api.post(`/api/events/${eventId}/rsvp`).send({
        email: testAttendeeEmail,
        name: 'QA First Attendee',
        age_confirmed: true
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('rsvp_status');
    });

    it('POST /api/events/:id/rsvp should register secondary attendee for manual checkin tests', async () => {
      if (!eventId) return;

      const res = await api.post(`/api/events/${eventId}/rsvp`).send({
        email: manualAttendeeEmail,
        name: 'QA Manual Checkin Attendee',
        age_confirmed: true
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('GET /api/events/:id/rsvp/check should confirm RSVP status', async () => {
      if (!eventId) return;

      const res = await api.get(`/api/events/${eventId}/rsvp/check?email=${encodeURIComponent(testAttendeeEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.rsvped).toBe(true);
    });
  });

  describe('2. Gate Scanner PIN Management', () => {
    it('POST /api/organizer/events/:id/scanner-pin should generate and retrieve Gate Scanner PIN', async () => {
      if (!eventId) return;

      const res = await api.post(`/api/organizer/events/${eventId}/scanner-pin`).send({
        organizer_email: testOrganizerEmail,
        gate_name: 'Main Gate'
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('pin_code');
      expect(res.body.pin_code).toHaveLength(4);
      activeScannerPin = res.body.pin_code;
    });
  });

  describe('3. Gate Scanner Attendee Lookup & QR Token Resolution', () => {
    it('GET /api/passes/attendees should reject invalid Gate Scanner PIN', async () => {
      if (!eventId) return;

      const res = await api.get(`/api/passes/attendees?event_id=${eventId}&q=${encodeURIComponent(testAttendeeEmail)}&staff_pin=0000`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/invalid.*scanner pin/i);
    });

    it('GET /api/passes/attendees should retrieve attendee and QR token with valid PIN', async () => {
      if (!eventId || !activeScannerPin) return;

      const res = await api.get(`/api/passes/attendees?event_id=${eventId}&q=${encodeURIComponent(testAttendeeEmail)}&staff_pin=${activeScannerPin}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.attendees)).toBe(true);
      expect(res.body.attendees.length).toBeGreaterThanOrEqual(1);

      const attendee = res.body.attendees.find((a: any) => a.user_email?.toLowerCase() === testAttendeeEmail.toLowerCase());
      expect(attendee).toBeDefined();
      expect(attendee.qr_token).toBeDefined();
      attendeeQrToken = attendee.qr_token;
    });

    it('GET /api/passes/attendees should locate manual checkin attendee record', async () => {
      if (!eventId || !activeScannerPin) return;

      const res = await api.get(`/api/passes/attendees?event_id=${eventId}&q=${encodeURIComponent(manualAttendeeEmail)}&staff_pin=${activeScannerPin}`);

      expect(res.status).toBe(200);
      const attendee = res.body.attendees.find((a: any) => a.user_email?.toLowerCase() === manualAttendeeEmail.toLowerCase());
      expect(attendee).toBeDefined();
      manualAttendeeRsvpId = attendee.id;
    });
  });

  describe('4. Gate QR Code Scanning & Anti-Passback Defense', () => {
    it('POST /api/passes/verify should reject missing qr_token or event_id', async () => {
      const res = await api.post('/api/passes/verify').send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/passes/verify should reject non-existent QR token (404)', async () => {
      if (!eventId || !activeScannerPin) return;

      const res = await api.post('/api/passes/verify').send({
        qr_token: 'vc_pass_fake_invalid_token_9999',
        event_id: eventId,
        staff_pin: activeScannerPin
      });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('POST /api/passes/verify should successfully check-in on FIRST QR scan', async () => {
      if (!eventId || !attendeeQrToken || !activeScannerPin) return;

      const res = await api.post('/api/passes/verify').send({
        qr_token: attendeeQrToken,
        event_id: eventId,
        staff_pin: activeScannerPin,
        gate_name: 'VIP North Gate'
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.attendee).toBeDefined();
    });

    it('POST /api/passes/verify should enforce Anti-Passback (409 Conflict on duplicate scan)', async () => {
      if (!eventId || !attendeeQrToken || !activeScannerPin) return;

      const res = await api.post('/api/passes/verify').send({
        qr_token: attendeeQrToken,
        event_id: eventId,
        staff_pin: activeScannerPin,
        gate_name: 'VIP North Gate'
      });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('code', 'ALREADY_CHECKED_IN');
      expect(res.body.message).toMatch(/already checked in/i);
    });
  });

  describe('5. Manual Gate Check-In & Attendance Analytics', () => {
    it('POST /api/passes/manual-checkin should manually check-in attendee by ID', async () => {
      if (!eventId || !manualAttendeeRsvpId || !activeScannerPin) return;

      const res = await api.post('/api/passes/manual-checkin').send({
        rsvp_id: manualAttendeeRsvpId,
        event_id: eventId,
        staff_pin: activeScannerPin,
        gate_name: 'Helpdesk Desk 1'
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.pass?.checkin_status).toBe('checked_in');
    });

    it('GET /api/organizer/events/:id/attendance should reflect live check-in counts', async () => {
      if (!eventId || !activeScannerPin) return;

      const res = await api.get(`/api/organizer/events/${eventId}/attendance?staff_pin=${activeScannerPin}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.stats).toBeDefined();
      expect(Number(res.body.stats.total_rsvps)).toBeGreaterThanOrEqual(2);
      expect(Number(res.body.stats.checked_in_count)).toBeGreaterThanOrEqual(2);
    });
  });
});
