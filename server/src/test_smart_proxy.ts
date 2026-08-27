import express from 'express';
import rateLimit from 'express-rate-limit';
import http from 'http';

const TEST_PORT = 4999;
const SECRET_TOKEN = 'test_secret_token_12345';

// 1. Setup mock Express server with the exact Smart Proxy middleware
const app = express();
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use('/api', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or malformed Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== SECRET_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid backend access token' });
  }
  next();
});

// Mock endpoints
app.get('/health', (_req, res) => res.json({ status: 'healthy' }));
app.get('/api/events', (_req, res) => res.json({ success: true, data: [{ id: 1, title: 'Sample Event' }] }));
app.get('/api/cities', (_req, res) => res.json({ success: true, data: ['Vizag'] }));
app.get('/api/news', (_req, res) => res.json({ success: true, data: [] }));
app.get('/api/settings', (_req, res) => res.json({ success: true, data: {} }));
app.get('/api/admin/events', (_req, res) => res.json({ success: true, adminData: true }));
app.post('/api/organizer/events', (req, res) => res.json({ success: true, created: req.body }));
app.post('/api/apply/send-otp', (req, res) => res.json({ success: true, otpSent: true }));

const server = http.createServer(app);

async function runTests() {
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`\n=== Running Smart Proxy & Backend Security Verification ===\n`);

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`, err.message);
      failed++;
    }
  }

  // TEST 1: Direct backend call without token should return 401
  await test('Direct Express call without token -> 401 Unauthorized', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/events`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const body = (await res.json()) as any;
    if (!body.error.includes('Missing or malformed')) throw new Error(`Unexpected body: ${JSON.stringify(body)}`);
  });

  // TEST 2: Direct backend call with wrong token should return 401
  await test('Direct Express call with invalid token -> 401 Unauthorized', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/events`, {
      headers: { Authorization: 'Bearer wrong_token' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const body = (await res.json()) as any;
    if (!body.error.includes('Invalid backend access token')) throw new Error(`Unexpected body: ${JSON.stringify(body)}`);
  });

  // TEST 3: Direct backend call with valid token should return 200
  await test('Direct Express call with valid Bearer token -> 200 OK', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/events`, {
      headers: { Authorization: `Bearer ${SECRET_TOKEN}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const body = (await res.json()) as any;
    if (!body.success) throw new Error(`Expected success: true, got ${JSON.stringify(body)}`);
  });

  // TEST 4: Non-/api route like /health is accessible without token
  await test('Public non-/api route (/health) accessible without token -> 200 OK', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/health`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // TEST 5: Simulate Next.js Proxy Route logic
  function isPublicRoute(method: string, endpointPath: string): boolean {
    const normalizedPath = endpointPath.toLowerCase();
    if (method === "GET") {
      if (
        normalizedPath.startsWith("/api/events") ||
        normalizedPath.startsWith("/api/cities") ||
        normalizedPath.startsWith("/api/news") ||
        normalizedPath.startsWith("/api/settings") ||
        normalizedPath === "/api/admin/settings"
      ) {
        return true;
      }
    }
    if (method === "POST") {
      if (
        normalizedPath.startsWith("/api/apply/send-otp") ||
        normalizedPath.startsWith("/api/apply/verify-otp") ||
        normalizedPath.startsWith("/api/apply/submit") ||
        normalizedPath.startsWith("/api/verify/send-code") ||
        normalizedPath.startsWith("/api/verify/confirm-code")
      ) {
        return true;
      }
    }
    return false;
  }

  function isAllowedOrigin(origin: string | null): boolean {
    if (!origin) return false;
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
      if (url.host === "vibecheck.dev") return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  await test('Proxy Origin Validator: blocks malicious origin', async () => {
    if (isAllowedOrigin('http://evil-site.com') !== false) throw new Error('Failed to block evil origin');
  });

  await test('Proxy Origin Validator: allows localhost origin', async () => {
    if (isAllowedOrigin('http://localhost:3500') !== true) throw new Error('Failed to allow localhost');
  });

  await test('Proxy Route Classification: public discovery routes', async () => {
    if (!isPublicRoute('GET', '/api/events')) throw new Error('GET /api/events should be public');
    if (!isPublicRoute('GET', '/api/cities')) throw new Error('GET /api/cities should be public');
    if (!isPublicRoute('GET', '/api/news')) throw new Error('GET /api/news should be public');
    if (!isPublicRoute('GET', '/api/settings')) throw new Error('GET /api/settings should be public');
    if (!isPublicRoute('POST', '/api/apply/send-otp')) throw new Error('POST /api/apply/send-otp should be public');
  });

  await test('Proxy Route Classification: protected routes require session', async () => {
    if (isPublicRoute('GET', '/api/admin/events')) throw new Error('GET /api/admin/events should require auth');
    if (isPublicRoute('POST', '/api/organizer/events')) throw new Error('POST /api/organizer/events should require auth');
    if (isPublicRoute('GET', '/api/user')) throw new Error('GET /api/user should require auth');
    if (isPublicRoute('POST', '/api/followers')) throw new Error('POST /api/followers should require auth');
  });

  server.close();
  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
