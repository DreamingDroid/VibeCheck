# Project Waves: Hyper-Local Live Pop-Up Engine & Telegram Concierge Implementation Plan

**Feature Name:** Waves (Hyper-Local Micro-Drop Engine)  
**System Role:** AI-Driven Telegram Concierge & 3-State Live Micro-Drop Engine  
**Document Version:** 1.1  
**Target Milestone:** Factory Implementation Roadmap  
**Primary Integration Layers:** Telegram Bot API (Vendor Control & Resident Concierge), PostgreSQL + `pgvector` (Unified Relational & Semantic Layer), Next.js (`/waves` Discovery Interface)  
**Target Environment:** Antigravity IDE / Node.js Express Server / Next.js Web App  

---

## 1. Executive Summary & Core Value Proposition

**Waves** eliminates information latency for transient, weekend micro-entrepreneurs (pop-up food stalls, artisanal kiosks, sunset wellness kiosks along Beach Road) in Visakhapatnam while providing city residents with an instant Telegram discovery companion and real-time live web ticker at `/waves`.

### Core Problems Addressed
1. **The "Dead Trip" Dilemma:** Static social media posts fail to communicate physical presence, stock levels, or early sell-out shutdowns. Customers arrive at Beach Road only to find a stall packed up.
2. **The "Premature Schedule" Illusion:** When a pop-up closes early or finishes its batch, immediately marking it as "Scheduled" misleads users into expecting it to reopen later that day.
3. **Vendor Administrative Friction:** Micro-vendors running busy food stalls cannot navigate multi-step web forms or web admin dashboards during service.

### Solution Design
* **3-State Lifecycle Model:**
  * 🟢 **Live Wave:** Actively open right now with real-time countdown clock and live batch menu notes.
  * 🔴 **Wave Passed (Offline):** Closed/packed up for the day. Explicitly tagged as **Offline**—never pretending to be active.
  * 🟡 **Next Wave Scheduled:** Visible in the scheduled queue **only** when the vendor sets an explicit future date/time (e.g. *"Next Wave: Saturday, 4:00 PM"*).
* **Frictionless Telegram Control:** Vendors trigger live batches, mark early closures, and schedule upcoming appearances exclusively via fast Telegram bot commands (`/wave`, `/endwave`, `/nextwave`).
* **Deterministic Ephemerality:** Live waves enforce hard time-to-live boundaries (defaulting to 3 hours), counting down in real-time on the `/waves` web ticker and auto-expiring via a 60-second background cron worker.
* **Telegram AI Concierge:** Residents discover live waves and upcoming beach pop-ups through quick commands (`/waves`) or natural language queries powered by hybrid PostgreSQL + `pgvector` RAG.

---

## 2. The 3-State Lifecycle Architecture

```
                      ┌────────────────────────────────────────┐
                      │              Registration              │
                      │        (Web Form -> Token Link)        │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          🔴 WAVE PASSED / OFFLINE      │
                      │    - Listed in permanent directory     │
                      │    - Clearly marked: "Currently Closed"│
                      └──────────┬──────────────────▲──────────┘
                                 │                  │
                /nextwave <time> │                  │ /endwave or
                                 │                  │ TTL Expiration (no new date)
                                 ▼                  │
      ┌────────────────────────────────────────┐    │
      │        🟡 NEXT WAVE SCHEDULED          │    │
      │    - Explicit date/time confirmed      │    │
      │    - "Next Wave: Saturday at 4:00 PM"  │    │
      └──────────────────┬─────────────────────┘    │
                         │                          │
           /wave [hours] │            /wave [hours] │
                         ▼                          │
      ┌─────────────────────────────────────────────┴──────────┐
      │                   🟢 LIVE WAVE ACTIVE                  │
      │    - Real-time countdown timer (e.g. 02h:45m:10s)      │
      │    - Glowing pulse badge & live batch offerings        │
      │    - Exact Beach Road location pin & Google Maps link  │
      └────────────────────────────────────────────────────────┘
```

---

## 3. High-Level System Architecture & Flow

### 3.1 Sequence Architecture Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Vendor as Vendor (Beach Road Pop-Up)
    participant Web as Waves Web (/waves)
    participant API as Express API Server
    participant TG as Telegram Bot API
    participant DB as PostgreSQL + pgvector
    participant Cron as 60s TTL Background Worker
    actor Resident as City Resident

    %% Step 1: Onboarding
    rect rgb(240, 248, 255)
    note over Vendor, DB: Phase 1: Registration & Handshake
    Vendor->>Web: Registers Stall at /waves (Brand, Category, Schedule, Phone, Location)
    Web->>API: POST /api/waves/register
    API->>API: Generate secure pairing token (e.g. "waves_7f9c2...")
    API->>DB: INSERT into `waves_organisers` & `waves_stalls` (pairing_token="waves_7f9c2...")
    API-->>Web: Returns token + Telegram link (`t.me/VibeCheckBot?start=waves_7f9c2`)
    Web->>Vendor: Displays QR Code & "Activate on Telegram" Button

    Vendor->>TG: Taps link -> Sends `/start waves_7f9c2`
    TG->>API: Webhook event (/start waves_7f9c2)
    API->>DB: Link `telegram_user_id`, invalidate token, set `is_verified=true`
    API->>TG: "🎉 Stall linked! In-field commands: /wave, /endwave, /nextwave"
    TG-->>Vendor: Receives confirmation cheatsheet
    end

    %% Step 2: Go Live
    rect rgb(245, 255, 245)
    note over Vendor, Resident: Phase 2: Live Wave Trigger
    Vendor->>TG: `/wave 3 Fresh batch cold brew & brownies ready!`
    TG->>API: Webhook (/wave)
    API->>API: In-memory debounce check (2000ms window)
    API->>DB: Deactivate prior waves; INSERT `waves_drops` (is_active=true, expires_at=NOW()+3h)
    API->>API: Calculate IST closing time
    API->>TG: "🟢 Live Wave Active until 20:30 IST! To close early: /endwave"
    TG-->>Vendor: Receives live confirmation

    Resident->>Web: Visits /waves
    Web->>API: GET /api/waves/feed
    API->>DB: SELECT active waves (is_active=true AND expires_at > NOW())
    API-->>Web: Dual-state JSON payload
    Web->>Resident: Renders "Live Waves Strip" with countdown timer (02h:59m:59s)
    end

    %% Step 3: Session Termination & The 3-State Transition
    rect rgb(255, 245, 245)
    note over Vendor, Resident: Phase 3: Wave Passed & Next Wave Scheduling

    alt Scenario A: Vendor Ends Wave Early
        Vendor->>TG: `/endwave`
        TG->>API: Webhook (/endwave)
        API->>DB: UPDATE `waves_drops` SET is_active=false, ended_at=NOW()
        API->>TG: "🔴 Wave closed! Status is now Offline. Set next wave? e.g. /nextwave Sat 4pm"
        TG-->>Vendor: Receives closure prompt
        Web->>Resident: Card instantly flips to 🔴 "Wave Passed / Offline for today"

    else Scenario B: Automatic TTL Expiration (Vendor forgets /endwave)
        Cron->>DB: UPDATE `waves_drops` SET is_active=false, ended_at=NOW() WHERE expires_at <= NOW() AND is_active=true
        Web->>Resident: Countdown hits 00:00:00 -> Card automatically flips to 🔴 "Wave Passed / Offline"
    end

    %% Step 4: Scheduling Next Wave
    Vendor->>TG: `/nextwave Saturday 4:00 PM`
    TG->>API: Webhook (/nextwave)
    API->>API: Parse natural language datetime into next_scheduled_at
    API->>DB: UPDATE `waves_stalls` SET next_scheduled_at = '2026-10-17 16:00:00+05:30'
    API->>TG: "🟡 Next Wave confirmed for Sat, Oct 17 at 4:00 PM IST!"
    Web->>Resident: Card now moves to 🟡 "Scheduled Waves" with confirmed date badge
    end
```

---

## 4. Database Schema (PostgreSQL DDL + `pgvector`)

All tables are prefixed with `waves_` to ensure clean domain isolation while enabling single-transaction relational joins.

```sql
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Waves Organisers (Vendor Identities & Bot Pairings)
CREATE TABLE IF NOT EXISTS waves_organisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    telegram_user_id BIGINT UNIQUE,
    telegram_username VARCHAR(255),
    pairing_token VARCHAR(64) UNIQUE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waves_organisers_tg_user ON waves_organisers(telegram_user_id);
CREATE INDEX idx_waves_organisers_pairing ON waves_organisers(pairing_token) WHERE pairing_token IS NOT NULL;

-- 3. Waves Stalls Table (Permanent Profiles + Next Scheduled State)
CREATE TABLE IF NOT EXISTS waves_stalls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organiser_id UUID NOT NULL REFERENCES waves_organisers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- e.g. "Food & Drink", "Artisanal", "Wellness", "Coffee"
    instagram_handle VARCHAR(100),
    typical_schedule TEXT NOT NULL, -- e.g. "Every Sat & Sun, 4:00 PM - 9:00 PM"
    typical_location TEXT NOT NULL, -- e.g. "Opposite Kali Temple, Beach Road"
    description TEXT NOT NULL,
    banner_url TEXT,
    -- 3-State explicit schedule tracking:
    next_scheduled_at TIMESTAMP WITH TIME ZONE, -- Populated via /nextwave
    next_scheduled_note TEXT,                   -- e.g. "Weekend Special Batch"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waves_stalls_organiser ON waves_stalls(organiser_id);
CREATE INDEX idx_waves_stalls_category ON waves_stalls(category);
CREATE INDEX idx_waves_stalls_next_scheduled ON waves_stalls(next_scheduled_at) WHERE next_scheduled_at IS NOT NULL;

-- 4. Waves Semantic Embeddings Table (pgvector)
CREATE TABLE IF NOT EXISTS waves_stall_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stall_id UUID NOT NULL REFERENCES waves_stalls(id) ON DELETE CASCADE,
    search_text TEXT NOT NULL, -- Synthesized: "Name: ... Category: ... Desc: ... Location: ..."
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waves_stall_embeddings_stall ON waves_stall_embeddings(stall_id);
-- HNSW Cosine Similarity Index for sub-millisecond similarity search
CREATE INDEX idx_waves_stall_embeddings_hnsw 
ON waves_stall_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Waves Drops (Ephemeral Live State & TTL)
CREATE TABLE IF NOT EXISTS waves_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stall_id UUID NOT NULL REFERENCES waves_stalls(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    batch_description TEXT,
    location_descriptor TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_active BOOLEAN NOT NULL DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compound index optimizing live feed queries
CREATE INDEX idx_waves_drops_active_ttl 
ON waves_drops(is_active, expires_at DESC);
CREATE INDEX idx_waves_drops_stall ON waves_drops(stall_id);

-- 6. Waves Bot Users (Telegram Audience & Preferences)
CREATE TABLE IF NOT EXISTS waves_bot_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    first_name VARCHAR(255),
    preferred_categories JSONB DEFAULT '[]'::jsonb,
    is_opted_in_digest BOOLEAN DEFAULT true,
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_waves_bot_users_digest 
ON waves_bot_users(is_opted_in_digest) 
WHERE is_opted_in_digest = true;
```

---

## 5. Vendor Telegram Lifecycle & Command Specifications

### 5.1 Onboarding & Pairing Handshake
1. **Web Registration (`POST /api/waves/register`):**
   * Inputs: Stall Name, Owner Name, Contact Phone, Category, Typical Schedule, Beach Road Location descriptor, Description, and Instagram handle.
   * Generates secure token: `crypto.randomBytes(16).toString('hex')`.
   * Returns deep link: `https://t.me/<BOT_USERNAME>?start=waves_<token>`.
2. **Telegram Activation Trigger (`/start waves_<token>`):**
   * In `server/src/telegram.ts`, payload starting with `waves_`:
     ```typescript
     const token = payload.replace('waves_', '').trim();
     const organiser = await pool.query(
       `UPDATE waves_organisers 
        SET telegram_user_id = $1, telegram_username = $2, pairing_token = NULL, is_verified = true, updated_at = NOW()
        WHERE pairing_token = $3
        RETURNING id, name`,
       [fromId, username, token]
     );
     ```
   * Bot sends confirmation and in-field cheatsheet:
     ```html
     🌊 <b>Welcome to Waves, {Name}!</b>
     Your stall is now activated on Beach Road.

     <b>Quick In-Field Commands:</b>
     • <code>/wave &lt;hours&gt; &lt;menu / item notes&gt;</code> — Go live (e.g. <code>/wave 3 Hot churros & cold brew ready!</code>)
     • <code>/endwave</code> — End live wave (marks you Offline for today)
     • <code>/nextwave &lt;day & time&gt;</code> — Schedule your next appearance (e.g. <code>/nextwave Sat 4pm</code>)
     • <code>/mystall</code> — Check your current status & live countdown
     ```

### 5.2 In-Field Operational Commands

#### 1. Command `/wave [hours] <description>` (Alias: `/golive`)
* **Regex Match:** `^\/(?:wave|golive)(?:\s+(\d+(?:\.\d+)?(?:h)?))?\s*(.*)$/i`
* **Authentication:** Matches `telegram_user_id` against `waves_organisers` and gets `stall_id`.
* **Duration Parsing:** Defaults to `3.0` hours if omitted; capped at `8.0` hours.
* **Atomic State Mutation:**
  1. Deactivates existing active waves:
     `UPDATE waves_drops SET is_active = false, ended_at = NOW() WHERE stall_id = $1 AND is_active = true`
  2. Clears previous `next_scheduled_at` on the stall since the vendor is now live:
     `UPDATE waves_stalls SET next_scheduled_at = NULL, next_scheduled_note = NULL WHERE id = $1`
  3. Inserts new active wave:
     `INSERT INTO waves_drops (stall_id, title, batch_description, location_descriptor, is_active, expires_at) VALUES ($1, $2, $3, $4, true, NOW() + INTERVAL '... hours')`
* **Telegram Feedback:** "🟢 <b>Live Wave Active!</b> You are live until <b>20:30 IST</b>. When closing early, reply <code>/endwave</code>."

#### 2. Command `/endwave` (Alias: `/enddrop`)
* **Regex Match:** `^\/(?:endwave|enddrop)$/i`
* **State Mutation:** Sets `is_active = false, ended_at = NOW()`.
* **3-State Reset:** The stall is now in the **🔴 Wave Passed / Offline** state.
* **Telegram Prompt:**
  ```html
  🔴 <b>Wave ended! Your stall is now marked Offline for today.</b>
  
  Want to schedule your next pop-up? Reply:
  <code>/nextwave Sat 4pm</code>
  (or do nothing to remain offline in the directory).
  ```

#### 3. Command `/nextwave <date/time string>`
* **Regex Match:** `^\/nextwave\s+(.+)$/i`
* **Parsing:** Uses date-parser (or LLM parser) to extract next timestamp in IST (e.g. *"Sat 4pm"* -> next Saturday 16:00 IST).
* **State Mutation:**
  `UPDATE waves_stalls SET next_scheduled_at = $2, next_scheduled_note = $3, updated_at = NOW() WHERE id = $1`
* **Telegram Confirmation:**
  "🟡 <b>Next Wave Scheduled!</b> Your stall will display in the upcoming schedule for <b>Saturday at 4:00 PM IST</b>."

#### 4. Command `/mystall`
* Returns current state:
  * If 🟢 Live: Remaining time (`02h:14m`), live notes, and Google Maps pin.
  * If 🟡 Scheduled: Confirmed date/time of next wave.
  * If 🔴 Offline: *"Offline for today. Use /wave to go live or /nextwave to schedule."*

### 5.3 Debouncing Guard
* In-memory cache `Map<string, number>` tracking command timestamps per `telegram_user_id`.
* Enforces a 2-second cooldown to block duplicate submissions from spotty mobile connections on Beach Road.

---

## 6. Background Expiration Worker (60-Second TTL Engine)

In `server/src/cron.ts`, a lightweight worker sweeps every 60 seconds:

```typescript
export async function sweepExpiredWaves(pool: Pool) {
  try {
    const result = await pool.query(`
      UPDATE waves_drops
      SET is_active = false,
          ended_at = CURRENT_TIMESTAMP
      WHERE is_active = true
        AND expires_at <= CURRENT_TIMESTAMP
      RETURNING id, stall_id
    `);

    if (result.rowCount && result.rowCount > 0) {
      console.log(`[Waves Cron] Automatically expired ${result.rowCount} live waves.`);
    }
  } catch (err) {
    console.error('[Waves Cron] Error sweeping expired waves:', err);
  }
}
```

Registered into the server startup interval:
```typescript
setInterval(() => sweepExpiredWaves(pool), 60 * 1000);
```

---

## 7. Next.js Discovery Interface (`/waves`)

### 7.1 State Segmentation & API Feed (`GET /api/waves/feed`)
The feed groups stalls into 3 distinct sections:

1. `live_waves`:
   * Criteria: `is_active = true AND expires_at > NOW()`.
   * Data: Remaining seconds, live batch notes, location coordinates, stall profile.
2. `scheduled_waves`:
   * Criteria: `is_active = false AND next_scheduled_at > NOW()`.
   * Data: Confirmed `next_scheduled_at` timestamp, note, category, stall profile.
3. `offline_directory`:
   * Criteria: No active drop and no future `next_scheduled_at`.
   * Data: Stall profile, typical schedule string, beach stretch area, Instagram handle. Tagged clearly with **"🔴 Offline / Wave Passed"**.

### 7.2 UI Components Architecture (`web/src/app/waves/`)

```
web/src/app/waves/
├── components/
│   ├── WavesLiveStrip.tsx          # Top high-signal carousel with active live drops
│   ├── LiveWaveCard.tsx            # Glowing card with real-time countdown ticker (HH:MM:SS)
│   ├── ScheduledWaveCard.tsx       # Upcoming card with calendar badge ("Saturday, 4 PM")
│   ├── OfflineStallCard.tsx        # Persistent directory card ("Offline / Wave Passed")
│   ├── StallRegisterModal.tsx      # Vendor onboarding modal + Telegram Activation QR
│   └── WavesCategoryFilter.tsx     # Filter by "All", "Food & Drink", "Coffee", "Artisan"
├── page.tsx                        # 3-Zone dynamic layout
└── layout.tsx                      # SEO metadata ("Waves on Beach Road | VibeCheck")
```

#### Visual Styling & UX Principles:
* **Live Indicator:** Vibrant emerald-cyan pulsing gradient (`animate-pulse`), high-contrast monospace countdown ticker (`font-mono font-black text-sm`).
* **Live Hook:** `useCountdown(expiresAt: string)` updating every 1000ms. When reaching `00:00:00`, instantly triggers a local state re-render to move the card to the Offline zone without requiring a hard page reload.
* **Directions:** Direct Google Maps deep link (`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(drop.location_descriptor + ', Visakhapatnam')}`).

---

## 8. Telegram Resident Concierge & AI Discovery Agent

### 8.1 Resident Commands & RAG (`telegram.ts`)
Resident messages are routed through `handleTelegramWebhook`:

1. **Quick Command (`/waves`):**
   * Returns a rich card listing all currently active waves on Beach Road with remaining countdowns and Google Maps navigation buttons.
2. **Natural Language Search ("What food popups are open right now on beach road?"):**
   * **Step 1 (Live Match):** Scans `waves_drops` for active items matching text keywords.
   * **Step 2 (Semantic Vector Match):** Fallback execution against `waves_stall_embeddings` via cosine similarity:
     ```sql
     SELECT s.name, s.category, s.typical_schedule, s.typical_location, s.description,
            s.next_scheduled_at,
            1 - (e.embedding <=> $1::vector) as similarity
     FROM waves_stall_embeddings e
     JOIN waves_stalls s ON e.stall_id = s.id
     ORDER BY e.embedding <=> $1::vector ASC
     LIMIT 3;
     ```
   * **Step 3 (Response Formatting):** Generates conversational answer in Telegram HTML with live countdowns or scheduled upcoming dates.

### 8.2 Friday 17:00 IST Proactive Digest
* **Cron Schedule:** Triggered every Friday at 17:00 IST via `node-cron` (`0 17 * * 5` in IST timezone).
* **Audience:** Users in `waves_bot_users` with `is_opted_in_digest = true`.
* **Payload:** Curated roundup of anticipated waves for the upcoming weekend.
* **Interactive Inline Buttons:**
  * `[ 🌊 View Live Waves ]` (triggers `/waves` callback)
  * `[ 📍 Beach Road Map ]` (links to `/waves`)
  * `[ 🔔 Set Reminder ]`

---

## 9. Phased Implementation Roadmap

### Phase 1: Database Foundation & Schema Setup
- [ ] Add DDL statements for `waves_organisers`, `waves_stalls`, `waves_stall_embeddings`, `waves_drops`, and `waves_bot_users` in [init.ts](file:///c:/Users/trivi/vibecheck_ws/VibeCheck/server/src/queries/init.ts).
- [ ] Implement query module `server/src/queries/waves.ts` with 3-state aggregation, drop creation, and TTL sweeps.

### Phase 2: Telegram Vendor Engine & State Machine
- [ ] Implement web registration endpoint `POST /api/waves/register` generating single-use tokens.
- [ ] Implement `/start waves_<token>` handshake in [telegram.ts](file:///c:/Users/trivi/vibecheck_ws/VibeCheck/server/src/telegram.ts).
- [ ] Implement vendor operational commands:
  - `/wave` (go live with TTL)
  - `/endwave` (end drop, prompt for next wave)
  - `/nextwave` (parse date and set scheduled state)
  - `/mystall` (status report)
- [ ] Add 60-second background TTL sweep in [cron.ts](file:///c:/Users/trivi/vibecheck_ws/VibeCheck/server/src/cron.ts).

### Phase 3: Next.js Discovery Interface (`/waves`)
- [ ] Implement API endpoint `GET /api/waves/feed` returning `{ live_waves, scheduled_waves, offline_directory }`.
- [ ] Create `/waves` route with 3-Zone presentation:
  1. Priority Live Waves Strip with real-time countdown tickers.
  2. Scheduled Waves Queue with confirmed date badges.
  3. Offline Directory with "Wave Passed" badges.
- [ ] Build `StallRegisterModal` with instant Telegram activation link and QR code.

### Phase 4: Resident Concierge & Proactive Digest
- [ ] Add `/waves` quick command in Telegram bot returning active cards.
- [ ] Integrate semantic vector retrieval via `waves_stall_embeddings` for natural language resident queries.
- [ ] Implement Friday 17:00 IST proactive digest dispatch.

---

## 10. Verification & Test Plan

1. **Vendor Registration & Pairing Handshake:**
   * Submit test vendor at `/waves`, verify `waves_organisers` has active token.
   * Send webhook `/start waves_<token>`, verify `telegram_user_id` is linked and token cleared.
2. **Go-Live & 3-State Transition:**
   * Send `/wave 2 Brownies & cold brew ready!`.
   * Verify `waves_drops` has active record with `expires_at = NOW() + 2 hours`.
   * Check `GET /api/waves/feed` to ensure stall appears in `live_waves`.
3. **End Wave & Offline Guard (No False "Scheduled" State):**
   * Send `/endwave`.
   * Verify drop is deactivated (`is_active = false`).
   * Verify stall appears in `offline_directory` tagged as **Offline / Wave Passed**, NOT in `scheduled_waves`.
4. **Next Wave Scheduling:**
   * Send `/nextwave Saturday 4pm`.
   * Verify `next_scheduled_at` is set on `waves_stalls`.
   * Verify stall now cleanly moves to `scheduled_waves`.
5. **Auto TTL Sweep Test:**
   * Insert drop with `expires_at = NOW() - INTERVAL '1 minute'`, trigger cron sweep, verify status flips to inactive automatically.
