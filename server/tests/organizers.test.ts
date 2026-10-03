import { describe, it, expect } from 'vitest';
import { createApiClient } from './helpers';
import { applyOtpCache } from '../src/organizer-apply';

describe('Organizer Applications & Approvals API', () => {
  const api = createApiClient();

  const timestamp = Date.now();
  const testEmail = `qa_applicant_${timestamp}@vibecheck.dev`;
  const testPhone = `987${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testInstagram = `qa_vibes_${timestamp}`;
  let phoneVerificationToken: string | null = null;
  let instagramVerificationToken: string | null = null;
  let createdOrganizerId: string | null = null;

  describe('1. OTP & Identity Verification Subsystem', () => {
    it('POST /api/apply/send-otp should reject invalid type or missing payload', async () => {
      const res = await api.post('/api/apply/send-otp').send({
        type: 'invalid_type',
        value: 'test'
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/apply/send-otp should generate and cache phone OTP', async () => {
      const res = await api.post('/api/apply/send-otp').send({
        type: 'phone',
        value: testPhone
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify OTP is present in cache
      const cached = applyOtpCache.get(`phone:${testPhone}`);
      expect(cached).toBeDefined();
      expect(cached?.code).toHaveLength(6);
    });

    it('POST /api/apply/verify-otp should reject incorrect OTP code', async () => {
      const res = await api.post('/api/apply/verify-otp').send({
        type: 'phone',
        value: testPhone,
        code: '000000'
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/invalid otp/i);
    });

    it('POST /api/apply/verify-otp should verify correct OTP and issue token', async () => {
      const cached = applyOtpCache.get(`phone:${testPhone}`);
      expect(cached).toBeDefined();

      const res = await api.post('/api/apply/verify-otp').send({
        type: 'phone',
        value: testPhone,
        code: cached!.code
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      phoneVerificationToken = res.body.token;
    });

    it('POST /api/apply/instagram/exchange should verify Instagram handle in Dev mode', async () => {
      const res = await api.post('/api/apply/instagram/exchange').send({
        devHandle: testInstagram
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.handle).toBe(testInstagram);
      instagramVerificationToken = res.body.token;
    });
  });

  describe('2. Organizer Application Submission', () => {
    it('POST /api/apply/submit should reject submission missing required verification tokens', async () => {
      const res = await api.post('/api/apply/submit').send({
        brandName: 'Test Incomplete Brand',
        description: 'Music event curation collective in Vizag.',
        email: testEmail,
        phone: testPhone
        // Missing phoneToken and instagramToken
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    it('POST /api/apply/submit should successfully submit application into pending queue', async () => {
      expect(phoneVerificationToken).toBeDefined();
      expect(instagramVerificationToken).toBeDefined();

      const res = await api.post('/api/apply/submit').send({
        brandName: `QA Beats Studio ${timestamp}`,
        description: 'Premier electronic music and sundowner event collective in Visakhapatnam.',
        email: testEmail,
        phone: testPhone,
        phoneToken: phoneVerificationToken,
        instagramUrl: `https://instagram.com/${testInstagram}`,
        instagramToken: instagramVerificationToken
      });

      expect(res.status).toBeOneOf([200, 201]);
      expect(res.body).toHaveProperty('success', true);
    });

    it('POST /api/apply/send-otp should reject OTP requests for phone numbers already in pending approval', async () => {
      const res = await api.post('/api/apply/send-otp').send({
        type: 'phone',
        value: testPhone
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/already pending approval/i);
    });

    it('POST /api/apply/submit should prevent duplicate submissions for same email while pending review', async () => {
      // Use a new distinct phone number for the test
      const altPhone = `986${Math.floor(1000000 + Math.random() * 9000000)}`;
      await api.post('/api/apply/send-otp').send({ type: 'phone', value: altPhone });
      const cached = applyOtpCache.get(`phone:${altPhone}`);
      expect(cached).toBeDefined();

      const otpRes = await api.post('/api/apply/verify-otp').send({
        type: 'phone',
        value: altPhone,
        code: cached!.code
      });
      expect(otpRes.status).toBe(200);

      const altInstagram = `qa_alt_${Date.now()}`;
      const igRes = await api.post('/api/apply/instagram/exchange').send({ devHandle: altInstagram });
      expect(igRes.status).toBe(200);

      const res = await api.post('/api/apply/submit').send({
        brandName: `QA Beats Studio Duplicate`,
        description: 'Duplicate submission attempt with existing email.',
        email: testEmail,
        phone: altPhone,
        phoneToken: otpRes.body.token,
        instagramUrl: `https://instagram.com/${altInstagram}`,
        instagramToken: igRes.body.token
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/pending approval/i);
    });
  });

  describe('3. SuperAdmin Moderation & Approval Workflow', () => {
    it('GET /api/admin/organizers/pending should list the newly submitted application', async () => {
      const res = await api.get('/api/admin/organizers/pending');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const applicant = res.body.data.find((org: any) => org.email.toLowerCase() === testEmail.toLowerCase());
      expect(applicant).toBeDefined();
      expect(applicant.status).toBe('pending_approval');
      createdOrganizerId = applicant.id;
    });

    it('POST /api/admin/organizers/:id/reject should require a rejection reason', async () => {
      if (!createdOrganizerId) return;

      const res = await api.post(`/api/admin/organizers/${createdOrganizerId}/reject`).send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toMatch(/reason is required/i);
    });

    it('POST /api/admin/organizers/:id/approve should approve applicant and promote to organizer', async () => {
      if (!createdOrganizerId) return;

      const res = await api.post(`/api/admin/organizers/${createdOrganizerId}/approve`).send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('GET /api/admin/organizers/pending should no longer list the approved organizer', async () => {
      if (!createdOrganizerId) return;

      const res = await api.get('/api/admin/organizers/pending');
      expect(res.status).toBe(200);

      const applicant = res.body.data.find((org: any) => org.id === createdOrganizerId);
      expect(applicant).toBeUndefined();
    });

    it('GET /api/admin/organizers should now include the approved organizer in active roster', async () => {
      if (!createdOrganizerId) return;

      const res = await api.get('/api/admin/organizers');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      const org = res.body.data.find((o: any) => o.id === createdOrganizerId);
      expect(org).toBeDefined();
      expect(org.email.toLowerCase()).toBe(testEmail.toLowerCase());
      expect(org.status).toBe('approved');
    });

    it('DELETE /api/admin/organizers/:id should delete the test organizer cleanly', async () => {
      if (!createdOrganizerId) return;

      const res = await api.delete(`/api/admin/organizers/${createdOrganizerId}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify deletion from active list
      const checkRes = await api.get('/api/admin/organizers');
      const found = checkRes.body.data.find((o: any) => o.id === createdOrganizerId);
      expect(found).toBeUndefined();
    });
  });
});
