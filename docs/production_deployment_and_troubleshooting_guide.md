# Production Deployment Runbook & Troubleshooting Guide

This guide documents the full deployment architecture, environment configurations, and all issues/solutions encountered during the UAT deployment to ensure a smooth, error-free deployment to **Production**.

---

## 1. System Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│ 1. Frontend (Next.js 14)                               │
│    - Hosted on: VERCEL (e.g. vibecheckspace.com)       │
│    - Interacts via: /api/proxy/... (Smart Proxy)       │
└──────────────────────────┬─────────────────────────────┘
                           │ (Server-to-Server HTTPS)
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. DNS & Domain Management                             │
│    - Hosted on: HOSTINGER                              │
│    - Points subdomains (api, api-uat) to VPS IP        │
└──────────────────────────┬─────────────────────────────┘
                           │ (A Record: 200.234.41.107)
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Backend & Database Infrastructure                   │
│    - Hosted on: COOLIFY VPS (IP: 200.234.41.107)       │
│    - Traefik: Handles SSL (Let's Encrypt) & Port 4000  │
│    - Express API: Port 4000                            │
│    - PostgreSQL + pgvector: Port 5432 (Internal)       │
│    - pgAdmin: Internal Web DB Administration           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Issues Encountered & Step-by-Step Solutions

### Issue 1: Missing DNS Records Causing `502 Bad Gateway` on Vercel
* **Symptoms:**
  - Vercel frontend APIs (`https://<site>/api/proxy/...`) returned `502 Bad Gateway: Could not connect to backend service`.
  - Terminal testing gave: `curl: (6) Could not resolve host: api-uat.vibecheckspace.com`.
* **Root Cause:**
  - The Next.js frontend on Vercel proxies API calls to `process.env.BACKEND_URL`.
  - When configuring a new environment (UAT/Production), the subdomain (`api-uat` or `api`) was not created in Hostinger DNS. Vercel’s servers could not find where the backend was hosted.
* **Solution for Production:**
  1. Go to **Hostinger DNS Management** for `vibecheckspace.com`.
  2. Add an **A Record**:
     - **Type:** `A`
     - **Name:** `api` (or `api-prod`)
     - **Content / IP:** `200.234.41.107`
     - **TTL:** `300` (5 minutes)
  3. Verify DNS propagation:
     ```bash
     dig +short api.vibecheckspace.com @8.8.8.8
     # Must return 200.234.41.107
     ```

---

### Issue 2: Coolify Domain & SSL Certificate Setup (Traefik 503 / Self-Signed SSL)
* **Symptoms:**
  - Accessing the backend directly returned a self-signed certificate error (`curl (60)`) or `HTTP 503`.
  - Coolify Domains screen displayed `DNS pending`.
* **Root Causes:**
  - Coolify only requests a Let's Encrypt SSL certificate once DNS resolves to the VPS IP.
  - Adding double slashes in the Coolify domain input (e.g. `//api.vibecheckspace.com` when the dropdown already selected `https`).
* **Solution for Production:**
  1. In Coolify &rarr; Production Server service &rarr; **Domains**:
     - Delete any auto-generated temporary `sslip.io` domain.
     - Click **+ Add**.
     - **Protocol:** `https`
     - **Domain:** `api.vibecheckspace.com` *(clean domain name only, no `//` or trailing slashes)*.
     - **Port:** `4000`
  2. Click **Save**.
  3. Click **Recheck DNS** (top right).
  4. **Restart / Redeploy** the Server service so Traefik automatically provisions the Let's Encrypt SSL certificate.
  5. Verify health:
     ```bash
     curl -I https://api.vibecheckspace.com/health
     # Must return HTTP/2 200 OK: {"status":"healthy","database":"connected"}
     ```

---

### Issue 3: Server Pointing to the Wrong Database (DEV DB instead of New DB)
* **Symptoms:**
  - The new database remained empty with 0 tables even after server deployment.
  - Server logs showed `[DB] Ensuring database schema...` succeeded, but tables were actually being created in the DEV database container.
* **Root Cause:**
  - In Coolify, environment variables were copied from DEV, including `DATABASE_URL` which contained the DEV database container ID (e.g., `7mjarg...` instead of the new UAT/PROD container ID `xdhmxc...`).
* **Solution for Production:**
  1. In Coolify, go to the **Production PostgreSQL Database** service (`vibecheck-prod-db`).
  2. Copy the **Internal Connection String**:
     ```text
     postgres://postgres:<password>@<prod_container_id>:5432/postgres
     ```
  3. Go to the **Production Server API** service &rarr; **Environment Variables**.
  4. Paste the exact string into `DATABASE_URL`.
  5. **Restart** the Server container so it connects to the isolated Production DB.

---

### Issue 4: Connecting pgAdmin to the Internal Database
* **Symptoms:**
  - Confusion about what values to enter into pgAdmin's "Host name/address" field.
  - Attempting to paste the entire `postgres://...` URL into the Hostname field.
* **Root Cause:**
  - pgAdmin and PostgreSQL run on the internal Docker network inside Coolify.
  - pgAdmin requires broken-down connection fields, not the raw URL.
* **Solution for Production:**
  In pgAdmin, register the server using the broken-down parameters from the internal connection string:
  | pgAdmin Field | Value to Enter |
  | :--- | :--- |
  | **Name** (General Tab) | `VibeCheck Production DB` *(Display label only)* |
  | **Host name/address** | `<prod_container_id>` *(The host ID between `@` and `:5432`)* |
  | **Port** | `5432` |
  | **Maintenance database** | `postgres` |
  | **Username** | `postgres` |
  | **Password** | `<production_db_password>` |
  | **Save password?** | **Yes** |

---

### Issue 5: Locating and Initializing PostgreSQL Tables
* **Symptoms:**
  - Tables appeared "missing" in pgAdmin after connecting to the database.
* **Root Causes:**
  - In PostgreSQL, tables are located inside **`Schemas` &rarr; `public` &rarr; `Tables`**, not at the root database level.
  - If the backend hasn't booted up yet, the fresh database has no tables until initialized.
* **Solution for Production:**
  1. Expand the tree: `Servers` &rarr; `Prod DB` &rarr; `Databases` &rarr; `postgres` &rarr; **`Schemas`** &rarr; **`public`** &rarr; **`Tables`**.
  2. Right-click **Tables** &rarr; **Refresh**.
  3. If starting clean before server launch, open **Query Tool** and run `db/init.sql`.

---

### Issue 6: Creating SuperAdmin User in Production DB
* **Requirement:**
  Grant full platform SuperAdmin rights to team members on the new environment.
* **Solution:**
  In pgAdmin Query Tool, execute the safe UPSERT query:
  ```sql
  INSERT INTO admins (email, role, status)
  VALUES ('admin@vibecheckspace.com', 'SuperAdmin', 'approved')
  ON CONFLICT (email) 
  DO UPDATE SET 
      role = 'SuperAdmin',
      status = 'approved';
  ```
  *Verify with:*
  ```sql
  SELECT id, email, role, status FROM admins WHERE email = 'admin@vibecheckspace.com';
  ```

---

### Issue 7: Understanding `web_users` vs `users` Tables
* **Requirement:**
  Verifying where user profiles are stored upon login.
* **Architecture:**
  - **`web_users`**: Stores web Google OAuth / Gmail logins (keyed by `email`). Stores name, categories, city, profession, age group.
  - **`users`**: Stores WhatsApp chatbot interactions (keyed by `phone_number`). Stores chat history and AI conversation state.
  - When a web user links their phone number, a synced record is created in `users`.

---

## 3. Production Environment Variables Checklist

Ensure these variables are set in their respective dashboards before launch:

### A. Coolify Backend Server (`server`)
```env
APP_ENV=production
PORT=4000
DATABASE_URL=postgres://postgres:<PROD_PASS>@<PROD_CONTAINER_ID>:5432/postgres
PRIVATE_BACKEND_TOKEN=<STRONG_RANDOM_SECRET_TOKEN>
WEB_APP_URL=https://vibecheckspace.com
ALLOWED_ORIGINS=https://vibecheckspace.com,https://www.vibecheckspace.com
RESEND_API_KEY=re_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### B. Vercel Frontend (`web`)
```env
BACKEND_URL=https://api.vibecheckspace.com
PRIVATE_BACKEND_TOKEN=<MATCHING_STRONG_RANDOM_SECRET_TOKEN>
NEXTAUTH_URL=https://vibecheckspace.com
NEXTAUTH_SECRET=<STRONG_RANDOM_JWT_SECRET>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_WHATSAPP_NUMBER=...
```
