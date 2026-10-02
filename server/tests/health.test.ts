import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import { app, pool } from '../src/index';

describe('API Health Check', () => {
  it('GET /health should return 200 or 500 with proper JSON structure', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBeOneOf([200, 500]);
    expect(res.body).toHaveProperty('status');
  });
});
