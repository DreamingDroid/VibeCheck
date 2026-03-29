# VibeCheck "Go-Live" Checklist (v2.0)

Based on the latest System Requirements Specification (SRS), here is an updated overview of our progress and the remaining milestones to fully launch the Vizag Vibes platform.

## ✅ Phase 1: Completed Foundation & WhatsApp Prototyping
- [x] **Node Backend**: Express server configured flawlessly with TypeScript.
- [x] **Database Connectivity**: Local environment linking to PostgreSQL.
- [x] **AI Brain Integration**: LangChain, Ollama, and `pgvector` instantiated for Retrieval-Augmented Generation (RAG).
- [x] **WhatsApp API Setup**: WhatsApp product officially added to the Meta Developer app, with Webhook validation optimized to bypass proxy bot-checkers.
- [x] **Live Message Tunneling**: Successfully tunneled texts from Meta to the local laptop via anti-phishing proxy.
- [x] **Reactive AI Loop**: `whatsapp.ts` successfully parses incoming user texts and automatically calls `sendWhatsAppMessage()` with concise AI responses.

---

## ✅ Phase 2: Completed Database Alignment
- [x] **Migrate Users & Preferences**: Rebuilt `Users Table` schema with `phone_number`, `name`, and `preferences` as JSONB, replacing the old `user_preferences` prototype.
- [x] **Admin Roles & Analytics Tracking**: Added `Admins Table` with `SuperAdmin`/`Editor` role enum.
- [x] **Validate Events Table Schema**: `Events` table rewritten with full SRS compliance — category enum, `age_group` int range, `external_link`, `contact_info`, and updated `date_time` column.
- [x] **RAG Query Alignment**: Updated `rag.ts` to read/write against the new `users` table and `date_time` column naming.
- [x] **Seed Script Alignment**: Updated `seed.ts` to correctly use `date_time` column and uppercase Enum category values.

---

## 🚧 Phase 3: The Web Portal (Discovery Phase) — IN PROGRESS
- [x] **Initialize Frontend**: Scaffolded Next.js 14.2 project (App Router) with Tailwind CSS v3, Shadcn UI, and `tailwindcss-animate`.
- [x] **Authentication**: NextAuth.js (Google OAuth 2.0) fully working — Google login tested and confirmed with session display.
- [x] **Event Listing & Search UI**: Dashboard page built at `/dashboard` with category filter dropdown, text search input, and event card grid (API-driven from Express `/api/events`).
- [x] **Backend Events API**: New `/api/events` endpoint added to Express server with dynamic `category` and `search` filtering.
- [x] **Server Port Separation**: Express server moved to port `4000`, Next.js stays on `3000`.
- [x] **Seed the Database**: Docker running, new schema applied, `seed.ts` executed successfully — 3 events confirmed live in the dashboard UI.
- [x] **Preference Dashboard**: Category toggle UI built at `/preferences`. Saves to `web_users` table (JSONB). Optional WhatsApp phone number field for Tier 2 linking — confirmed working end-to-end.
- [x] **WhatsApp Bridge**: "Notify Me on WhatsApp" button added to every event card. Generates a `wa.me` deep link with a pre-filled message (event name, date, location). Requires `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env.local`.

## ✅ Phase 4: Admin Dashboard & Analytics — COMPLETE
- [x] **Secure Admin Route**: `/admin` protected by email-based check against the `admins` table. Non-admins are redirected to `/dashboard` automatically.
- [x] **Event CMS**: Full Create / Edit / Delete events UI at `/admin/events`. Wired to Express REST API with all event fields (title, description, category, date/time, location, contact, external link).
- [x] **Analytics Engine**: Overview page with stat cards (Total Events, Web Users, WhatsApp Users) and two Recharts bar charts — Events by Category and User Preferred Categories — all confirmed working with live data.

## 🚀 Phase 5: WhatsApp AI Agent Enhancements
- [x] **Onboarding Flow**: Implemented silent profile building capturing the WhatsApp profile name and pointing users to the website for preferences.
- [ ] **Personalization Engine**: Update `rag.ts` to continuously write interaction history to the `preferences` JSONB column.
- [ ] **Cloud AI Integration**: Update backend to conditionally switch between Ollama (local) and Cloud Provider models (e.g., Gemini) based on `RUN_MODE`.

## 🚀 Phase 6: Cloud Deployment & Final Review
- [ ] **Push the Backend Code**: Deploy the finished Node/Express app to Render/Railway.
- [ ] **Push the Frontend Code**: Deploy the Next.js web portal to Vercel.
- [ ] **Transfer `.env` Variables**: Ensure `GEMINI_API_KEY`, `WHATSAPP_` tokens, and `DATABASE_URL` are set on production platforms.
- [ ] **Final Meta Adjustments**: Remove proxy tunnels, set a permanent access token via Meta Business Manager, connect a real phone number, and switch from Development to **Live** Mode.

## 🔮 Phase 7: Post-Launch Enhancements (Deferred)
- [ ] **Proactive (Push) Alerts**: Implement a Daily Cron job to cross-reference new events with user preferences, triggering WhatsApp Template Messages. *(Deferred to monitor operating costs, as template messages incur fees).*
