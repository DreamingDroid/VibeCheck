# Smart Proxy Architecture Implementation Plan

This plan implements a secure proxy architecture that protects your backend from scraping and abuse, while explicitly preserving guest access for your public-facing pages (Landing Page & Local Currents).

## Goal Description
Implement a Next.js Proxy that acts as a secure gateway to your Express backend. The proxy will hide the backend token entirely, enforce Origin checks to block simple scripts, apply rate limits, and enforce NextAuth session checks **only** on sensitive routes, allowing public read-only routes to remain accessible to guests.

## Proposed Changes

### Configuration Layer (Environment variables)
- Add `PRIVATE_BACKEND_TOKEN="your_secure_random_token"` to backend `.env` files.
- Add `PRIVATE_BACKEND_TOKEN="your_secure_random_token"` to frontend `.env` files (Kept strictly on the server).
- Update frontend `NEXT_PUBLIC_API_URL` to point to the Next.js proxy (e.g., `/api/proxy`).

---

### Frontend Components (Next.js)

#### [NEW] `web/src/app/api/proxy/[...path]/route.ts`
Create a Next.js catch-all route handler to act as the Proxy gateway.
- **Origin / CSRF Check:** Validate the `Origin` or `Referer` headers against `process.env.NEXTAUTH_URL` to ensure the request is genuinely coming from the VibeCheck website, blocking Postman or direct browser hits by default.
- **Selective Session Check:** 
  - *Public Routes:* Allow `GET` requests to `/cities`, `/events`, `/news`, and `/settings` without a session.
  - *Protected Routes:* Require a valid NextAuth session (via `getServerSession`) for all `POST/PUT/DELETE` requests and sensitive `GET` routes (`/admin`, `/organizer`, `/user`, `/followers`).
- **Forwarding:** Append the `Authorization: Bearer <PRIVATE_BACKEND_TOKEN>` and forward the request to `http://localhost:4000/api/...`.

#### [MODIFY] `web/src/components/providers.tsx`
- Ensure the existing `fetch` interceptor correctly handles the new relative `/api/proxy` path without manually injecting tokens.

---

### Backend Components (Express)

#### [MODIFY] `server/package.json`
- Install `express-rate-limit`.

#### [MODIFY] `server/src/index.ts`
- **Rate Limiting:** Implement `express-rate-limit` middleware on all `/api` routes (e.g., max 100 requests per 15 minutes per IP) using the `X-Forwarded-For` header.
- **Bearer Token Middleware:** Introduce an Express middleware right before the `/api` route definitions to check `req.headers.authorization` against `config.PRIVATE_BACKEND_TOKEN`.

#### [MODIFY] `server/src/config.ts`
- Read `PRIVATE_BACKEND_TOKEN` from the environment.

## Verification Plan
- Verify guest users can view the Landing Page and `/local-currents` successfully.
- Verify guest users are blocked with `401 Unauthorized` if they try to call an admin or organizer endpoint.
- Verify that attempting to call the Express backend directly on port 4000 without the Bearer token returns `401 Unauthorized`.
- Verify that requests with an invalid Origin header (spoofing) are blocked by the Proxy.
