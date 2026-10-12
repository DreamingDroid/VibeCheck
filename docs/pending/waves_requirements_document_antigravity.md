# Project Waves: Architecture & Functional Requirements Document

**Product Name:** Waves (Hyper-Local Micro-Drop Engine)  
**System Role:** AI-Driven Telegram Concierge & 3-State Live Micro-Drop Engine  
**Target Environment:** Antigravity IDE  
**Primary Integration Layers:** Telegram Bot API (Vendor Ingestion & Resident Concierge), PostgreSQL + `pgvector` (Unified Relational & Semantic Layer), Next.js (`/waves` Web Discovery Interface)  
**Architecture Freeze:** Phase 1  

---

## 1. Executive Summary & Value Proposition

Waves eliminates information latency for transient, weekend micro-entrepreneurs (pop-up food stalls, artisanal vendors, wellness kiosks along Beach Road) while providing city residents with a Telegram discovery companion and live web ticker at `/waves`.

### Core Problems Addressed
1. **The "Dead Trip" Problem:** Static social posts fail to communicate physical presence, stock status, or early shutdowns.
2. **The "Premature Schedule" Illusion:** When a pop-up closes or sells out early, immediately marking it as "Scheduled" misleads users into expecting it to reopen later that day.
3. **Vendor Administrative Friction:** Micro-vendors will not navigate complex dashboards while managing stalls.

### Solution Overview
* **3-State Lifecycle Model:** Stalls transition cleanly through three states:
  * 🟢 **Live Wave:** Actively open with real-time countdown timer and live batch notes.
  * 🔴 **Wave Passed (Offline):** Closed/packed up. Stalls remain discoverable in the directory, clearly marked as Offline.
  * 🟡 **Next Wave Scheduled:** Displayed with an upcoming badge *only* when the vendor has set an explicit future date/time.
* **Frictionless Ingestion:** Organisers control live state exclusively via Telegram commands (`/wave`, `/endwave`, `/nextwave`) without web dashboard logins.
* **Automated Ephemerality:** Live waves require a defined duration and count down in real-time, automatically expiring upon timeout.
* **Conversational Discovery:** End users retrieve live waves and upcoming beach pop-ups through a natural language Telegram bot powered by hybrid RAG.

---

## 2. High-Level System Architecture

```
                  ┌────────────────────────────────────────┐
                  │          Micro-Entrepreneurs           │
                  └───────────────────┬────────────────────┘
                                      │ Telegram Bot API
                                      │ (/start <token>, /golive, /enddrop)
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Telegram Ingestion Service       │
                  └───────────────────┬────────────────────┘
                                      │ State Mutations & Tokens
                                      ▼
┌──────────────────────┐  Read/Write  ┌────────────────────────────────────┐
│   End Users via      ├─────────────►│        PostgreSQL Database         │
│  Telegram Bot API    │              │  - Relational: Profiles & Drops    │
│  (Concierge / RAG)   │◄─────────────┤  - Vector: pgvector Embeddings     │
└──────────────────────┘  RAG Queries └─────────────────┬──────────────────┘
                                                        │
                                                        │ Real-time Polling /
                                                        │ Active Queries
                                                        ▼
                                      ┌────────────────────────────────────┐
                                      │       Local Currents Web UI        │
                                      │    (Next.js Client Application)    │
                                      └────────────────────────────────────┘
```

---

## 3. Data Architecture Specifications (PostgreSQL + `pgvector`)

All persistent relational structures and vector indexes reside within a unified PostgreSQL instance to enable single-transaction joins across semantic similarity, spatial coordinates, and operational state.

### 3.1 Entity Model
1. **Organisers Table:**
   * Primary key (UUID).
   * Contact details (Name, Phone Number).
   * Unique Telegram user ID (populated via pairing handshake).
   * Temporary single-use pairing token (cleared upon binding).
   * Timestamp metadata.

2. **Waves Stalls Table (1:1 Relationship with Organiser for MVP):**
   * Primary key (UUID).
   * Foreign key reference to Organiser record.
   * Business branding (Name, Category tag, Instagram handle).
   * Operational expectations (Typical schedule string, typical location description).
   * Persistent narrative description.
   * Next scheduled state (`next_scheduled_at` timestamp with timezone, `next_scheduled_note` text) populated via `/nextwave`.

3. **Waves Stall Embeddings Table:**
   * Foreign key reference to Stall record.
   * Vector column (1536 dimensions for normalized text embeddings).
   * Search text payload containing synthesized stall attributes.
   * HNSW index utilizing cosine similarity distance metrics.

4. **Waves Drops Table (Ephemeral Live State):**
   * Primary key (UUID).
   * Foreign key reference to Stall record.
   * Real-time drop title and limited batch descriptions.
   * Location descriptor and optional geographic coordinates (Latitude, Longitude).
   * Active status flag (Boolean).
   * Expiration timestamp with timezone.
   * Compound index on active flag and expiration timestamp.

5. **Waves Bot Users Table:**
   * Primary key (UUID).
   * Unique Telegram chat/user identifier (BigInt or string).
   * Telegram username and display name.
   * Preferred category tags array.
   * Opt-in flag for proactive weekend digests.
   * Interaction timestamps.

---

## 4. Vendor Lifecycle & Telegram Control Specifications

### 4.1 Onboarding & Pairing Handshake
1. **Web Registration:** The vendor visits the registration view on `/waves`, entering business identity, category, schedule, location, and contact number.
2. **Token Generation:** The platform persists the record and produces an alphanumeric single-use activation token.
3. **Direct Deep Link:** The vendor receives a deep link directing to the Telegram bot with the start parameter pre-populated (`https://t.me/<bot_username>?start=waves_<token>`).
4. **Binding Trigger:** Upon receiving the `/start waves_<token>` command, the Telegram ingestion service locates the pending organiser record, links the Telegram User ID, and invalidates the token.

### 4.2 In-Field Operational Commands
1. **Command `/wave <duration_in_hours> <drop_description>` (or `/golive`):**
   * Authenticates caller via Telegram User ID against linked stall.
   * Parses operational window (e.g. `3` or `3h`); defaults to standard duration (3 hours) if omitted.
   * Sets expiration boundary to current timestamp plus requested hours.
   * Deactivates any prior active wave records for the stall and clears previous `next_scheduled_at`.
   * Inserts a new wave drop marked active with the target expiration timestamp.
   * Emits confirmation to the vendor displaying closing time in IST and cancellation syntax.

2. **Command `/endwave` (or `/enddrop`):**
   * Authenticates caller via Telegram User ID.
   * Mutates active status of current drop records to inactive immediately.
   * Transitions the stall to **🔴 Wave Passed / Offline** for today.
   * Emits prompt inviting vendor to schedule their next appearance: `Reply with /nextwave Sat 4pm to schedule, or stay offline`.

3. **Command `/nextwave <date/time string>`:**
   * Parses natural language target datetime into an IST timestamp.
   * Updates `waves_stalls.next_scheduled_at` and optional note.
   * Transitions stall into **🟡 Next Wave Scheduled** queue.

4. **Command `/mystall`:**
   * Returns current live countdown, next scheduled date, or offline notice.

5. **Background Expiration Sweep:**
   * Scheduled cron worker running every sixty seconds.
   * Identifies all active drops where expiration timestamp is earlier than or equal to current timestamp.
   * Flips active status to false, preserving historical drop records. Stalls without a future `next_scheduled_at` naturally rest in the Offline zone.

---

## 5. Web Frontend Specifications (`/waves`)

### 5.1 3-Zone Presentation Logic
The web interface queries drops and stalls to assemble three distinct layout zones:

1. **Live Waves Zone (Priority Strip):**
   * **Inclusion Rule:** Drop is flagged active AND expiration timestamp is strictly greater than current timestamp.
   * **Visual Styling:** Elevated prominence, animated emerald/cyan pulsing badge, dynamic countdown clock displaying remaining hours, minutes, and seconds.
   * **Action Trigger:** Displays real-time special offering notes, exact pin location, and social profile link.

2. **Next Waves Scheduled Zone (Upcoming Queue):**
   * **Inclusion Rule:** Permanent stalls whose active drop is false AND have a confirmed future `next_scheduled_at > NOW()`.
   * **Visual Styling:** Calendar badge, countdown to opening, and bookmark reminder button.

3. **Waves Directory Zone (Persistent & Offline):**
   * **Inclusion Rule:** Permanent stalls whose active drop is false and have no future `next_scheduled_at` set.
   * **Visual Styling:** Neutral card displaying standard operating days, beach stretch area, cuisine category, social links, and an explicit **🔴 Offline / Wave Passed** indicator.
   * **Utility:** Provides users weekday visibility without false promises of imminent opening.

---

## 6. Telegram Concierge Agent Specifications

### 6.1 Reactive Conversational Flow ("Pull")
1. **Unified Telegram Webhook:** Processed via `handleTelegramWebhook` in the Telegram service layer.
2. **Idempotency & Debounce Guard:** Rapid duplicate commands from the same Telegram User ID are debounced in-memory (2-second rate limit).
3. **Intent Parsing & Tool Orchestration:**
   * Natural language queries (or `/waves` command) are evaluated across three primary operations:
     * **Live Wave Lookup:** Scans `waves_drops` and `waves_stalls` for stalls currently flagged as active. Formats current countdown and beach location.
     * **Semantic Vector Retrieval:** Fallback execution querying `waves_stall_embeddings` via `pgvector` for stalls matching contextual tastes, cuisines, or ambient preferences.
     * **Preference Update:** Stores user category affinities via interactive inline keyboard buttons into the bot user record.
4. **Response Formulation:** Formats high-relevance responses with location cues, operating status, countdown markers, and direct Google Maps links using Telegram HTML format.

### 6.2 Proactive Digest Flow ("Push")
1. **Schedule:** Fires weekly on Friday at 17:00 IST.
2. **Targeting:** Filters bot users with digest opt-in set to true and at least one matching category preference.
3. **Delivery Mechanism:** Direct Telegram messages with rich Inline Keyboards.
4. **Content Constraints:** Maximum 3 curated weekend pop-ups highlighting beach stretch locations and limited drops.
5. **Interactive Actions:** Tapping an inline button sends a callback query displaying real-time stall details, opening hours, or Google Maps directions.

---

## 7. Edge Cases & Operational Constraints

1. **Telegram Multi-Message Flood:** Bot webhook logic handles concurrent command inputs gracefully by debouncing incoming messages from the same Telegram User ID.
2. **Timezone Uniformity:** All operational deadlines, database timestamps, and cron intervals evaluate against UTC internally and translate to Indian Standard Time (IST) on client layers.
3. **Missing Geo-Coordinates:** If a vendor omits exact geographic pins during activation, the system defaults to the static location description established during initial web registration.
4. **Stale Session Handling:** If a vendor forgets to trigger `/endwave`, the automated 60-second background worker serves as the absolute boundary to eliminate phantom vendor listings.