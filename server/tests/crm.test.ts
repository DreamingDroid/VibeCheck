import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApiClient } from './helpers';
import { initializeDatabase, pool } from '../src/index';

describe('Organizer CRM, Followers & VIP Invites API', () => {
  const api = createApiClient();

  const timestamp = Date.now();
  const testOrganizerEmail = `qa_crm_org_${timestamp}@vibecheck.dev`;
  const testOrganizerSlug = `qa-crm-brand-${timestamp}`;
  const testAttendeeEmail = `qa_crm_attendee_${timestamp}@vibecheck.dev`;
  const testAttendeeName = `QA CRM Attendee ${timestamp}`;
  const testAttendeePhone = `9198${Math.floor(10000000 + Math.random() * 90000000)}`;

  let organizerId: string | null = null;
  let publicEventId: string | null = null;
  let inviteOnlyEventId: string | null = null;

  beforeAll(async () => {
    // 0. Initialize database schema
    await initializeDatabase();

    // 1. Seed approved organizer account
    const orgRes = await pool.query(
      `INSERT INTO admins (email, role, status, brand_name, slug, description, rating)
       VALUES ($1, 'organizer', 'approved', $2, $3, 'A test organizer for CRM and social follower testing.', 4.8)
       RETURNING id`,
      [testOrganizerEmail, `QA CRM Brand ${timestamp}`, testOrganizerSlug]
    );
    organizerId = orgRes.rows[0]?.id;

    // 2. Seed web user profile for attendee
    await pool.query(
      `INSERT INTO web_users (email, name, city, phone_number)
       VALUES ($1, $2, 'Visakhapatnam', $3)
       ON CONFLICT (email) DO UPDATE SET name = $2, phone_number = $3`,
      [testAttendeeEmail, testAttendeeName, testAttendeePhone]
    );

    // 3. Create a public event for RSVP & CRM contact aggregation
    const eventRes = await api.post('/api/admin/events').send({
      title: `QA CRM Music Fest ${timestamp}`,
      description: 'Public music event for CRM and follower testing.',
      category: 'Music',
      location: 'Beach Road Stage',
      city: 'Visakhapatnam',
      date_time: new Date(Date.now() + 86400000 * 3).toISOString(),
      organizer_email: testOrganizerEmail,
      is_paid: false
    });

    if (eventRes.body?.data?.id) {
      publicEventId = eventRes.body.data.id;
      await api.put(`/api/admin/events/${publicEventId}/review`).send({ status: 'approved' });

      // Attendee RSVPs to public event
      await api.post(`/api/events/${publicEventId}/rsvp`).send({
        email: testAttendeeEmail,
        name: testAttendeeName,
        age_confirmed: true
      });
    }

    // 4. Create an invite-only VIP event with attendee in guestList
    const inviteEventRes = await api.post('/api/organizer/events').send({
      title: `QA VIP Secret Sunset Soirée ${timestamp}`,
      description: 'Exclusive invite-only gathering for top followers and VIPs.',
      category: 'Nightlife',
      location: 'Private Beach Cliff Villa',
      city: 'Visakhapatnam',
      date_time: new Date(Date.now() + 86400000 * 5).toISOString(),
      organizer_email: testOrganizerEmail,
      visibility: 'invite_only',
      guestList: [testAttendeeEmail]
    });

    if (inviteEventRes.body?.data?.id) {
      inviteOnlyEventId = inviteEventRes.body.data.id;
      await api.put(`/api/admin/events/${inviteOnlyEventId}/review`).send({ status: 'approved' });
    }
  });

  afterAll(async () => {
    // Teardown events
    if (publicEventId) {
      await api.delete(`/api/admin/events/${publicEventId}`);
    }
    if (inviteOnlyEventId) {
      await api.delete(`/api/admin/events/${inviteOnlyEventId}`);
    }

    // Clean up followers & CRM notes
    await pool.query(`DELETE FROM organizer_followers WHERE organizer_email = $1 OR user_email = $2`, [testOrganizerEmail, testAttendeeEmail]);
    await pool.query(`DELETE FROM organizer_crm_notes WHERE organizer_email = $1`, [testOrganizerEmail]);
    await pool.query(`DELETE FROM web_users WHERE email = $1`, [testAttendeeEmail]);
    if (organizerId) {
      await pool.query(`DELETE FROM admins WHERE id = $1`, [organizerId]);
    }
  });

  describe('1. Social Graph & Followers System', () => {
    it('POST /api/followers should allow user to follow an organizer', async () => {
      const res = await api.post('/api/followers').send({
        userEmail: testAttendeeEmail,
        organizerEmail: testOrganizerEmail
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/followed/i);
    });

    it('GET /api/followers/user/:email should list all organizers user is following', async () => {
      const res = await api.get(`/api/followers/user/${encodeURIComponent(testAttendeeEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toContain(testOrganizerEmail);
    });

    it('GET /api/organizers/:identifier should reflect isFollowing: true for user', async () => {
      const res = await api.get(`/api/organizers/${testOrganizerSlug}?userEmail=${encodeURIComponent(testAttendeeEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('organizer');
      expect(res.body.data.organizer.email.toLowerCase()).toBe(testOrganizerEmail.toLowerCase());
      expect(res.body.data.isFollowing).toBe(true);
    });

    it('GET /api/organizer/followers should return organizer follower roster', async () => {
      const res = await api.get(`/api/organizer/followers?email=${encodeURIComponent(testOrganizerEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const follower = res.body.data.find((f: any) => f.email?.toLowerCase() === testAttendeeEmail.toLowerCase());
      expect(follower).toBeDefined();
      expect(follower.name).toBe(testAttendeeName);
    });

    it('DELETE /api/followers should unfollow organizer cleanly', async () => {
      const res = await api.delete('/api/followers').send({
        userEmail: testAttendeeEmail,
        organizerEmail: testOrganizerEmail
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/unfollowed/i);

      // Re-follow for subsequent CRM tests
      await api.post('/api/followers').send({
        userEmail: testAttendeeEmail,
        organizerEmail: testOrganizerEmail
      });
    });
  });

  describe('2. Organizer CRM Contacts & Custom Notes', () => {
    it('GET /api/organizer/crm/contacts should retrieve aggregated contacts from RSVPs and followers', async () => {
      const res = await api.get(`/api/organizer/crm/contacts?email=${encodeURIComponent(testOrganizerEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const contact = res.body.data.find((c: any) => c.email?.toLowerCase() === testAttendeeEmail.toLowerCase());
      expect(contact).toBeDefined();
      expect(contact.is_follower).toBe(true);
      expect(contact.is_attendee).toBe(true);
      expect(contact.name).toBe(testAttendeeName);
      expect(contact.rsvp_count).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/organizer/crm/notes should update custom organizer notes and tags on a contact', async () => {
      const res = await api.post('/api/organizer/crm/notes').send({
        organizer_email: testOrganizerEmail,
        contact_email: testAttendeeEmail,
        notes: 'VIP guest from Vizag music circle. Prefers front row lounge passes.',
        tags: ['vip', 'rock-fan', 'high-engagement']
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/updated/i);
    });

    it('GET /api/organizer/crm/contacts should now return saved notes and tags', async () => {
      const res = await api.get(`/api/organizer/crm/contacts?email=${encodeURIComponent(testOrganizerEmail)}`);

      expect(res.status).toBe(200);
      const contact = res.body.data.find((c: any) => c.email?.toLowerCase() === testAttendeeEmail.toLowerCase());
      expect(contact).toBeDefined();
      expect(contact.notes).toMatch(/front row/i);
      expect(contact.tags).toContain('vip');
      expect(contact.tags).toContain('rock-fan');
    });

    it('POST /api/organizer/crm/broadcast should send targeted CRM broadcast to selected contacts', async () => {
      const res = await api.post('/api/organizer/crm/broadcast').send({
        organizer_email: testOrganizerEmail,
        contact_emails: [testAttendeeEmail],
        message: 'Exclusive early-bird invitation for our upcoming acoustic weekend session!'
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toMatch(/broadcasted/i);
    });
  });

  describe('3. VIP Invites & Exclusive Event Access', () => {
    it('GET /api/organizer/events/:eventId/invites should return issued event invitations', async () => {
      if (!inviteOnlyEventId) return;

      const res = await api.get(`/api/organizer/events/${inviteOnlyEventId}/invites?email=${encodeURIComponent(testOrganizerEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const invite = res.body.data.find((i: any) => i.user_email?.toLowerCase() === testAttendeeEmail.toLowerCase());
      expect(invite).toBeDefined();
    });

    it('GET /api/user/vip-invites should return personal VIP invitations for attendee', async () => {
      const res = await api.get(`/api/user/vip-invites?email=${encodeURIComponent(testAttendeeEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const userInvite = res.body.data.find((inv: any) => inv.id === inviteOnlyEventId || inv.event_id === inviteOnlyEventId);
      expect(userInvite).toBeDefined();
    });
  });

  describe('4. Organizer Analytics Dashboard Overview', () => {
    it('GET /api/organizer/analytics/dashboard should return comprehensive metrics', async () => {
      const res = await api.get(`/api/organizer/analytics/dashboard?email=${encodeURIComponent(testOrganizerEmail)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('aggregates');
      expect(res.body.data.aggregates).toHaveProperty('totalRsvps');
      expect(res.body.data.aggregates).toHaveProperty('totalFollowers');
      expect(res.body.data).toHaveProperty('broadcastStats');
      expect(typeof res.body.data.aggregates.totalRsvps).toBe('number');
      expect(res.body.data.aggregates.totalRsvps).toBeGreaterThanOrEqual(1);
    });
  });
});
