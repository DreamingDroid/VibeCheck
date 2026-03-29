# Project Specification: Vizag Vibes (v1.0)
**System Architecture:** Hybrid Web-Discovery & AI-Agentic WhatsApp Concierge.

---

## 1. Product Overview
A centralized platform for Visakhapatnam residents to discover events (Sports, Arts, Spiritual, etc.) via a searchable web portal and receive personalized, AI-driven recommendations via a WhatsApp AI Agent.

**Two-Tier User Model:**
- **Tier 1 — Web Users:** Sign in with Google, browse events, and set category preferences via the web portal. No WhatsApp required.
- **Tier 2 — WhatsApp-Linked Users:** Optionally provide their phone number in the web portal to unlock the WhatsApp AI Agent for conversational event discovery and proactive push notifications.

---

## 2. Technical Stack
### Frontend & Discovery
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **Auth:** NextAuth.js (Google OAuth 2.0)

### Backend & AI Engine
- **Server:** Node.js (Hono or Fastify) or Python (FastAPI)
- **Database:** PostgreSQL with `pgvector` extension
- **LLM (Development):** Local Ollama (Llama 3.1 / Mistral)
- **LLM (Production):** Any Provider (e.g., Gemini, OpenAI GPT-4o-mini)
- **Embeddings:** `nomic-embed-text` (Local) / Cloud Provider Embeddings (e.g., `text-embedding-004`, `text-embedding-3-small`)

### Integration
- **WhatsApp API:** Meta Cloud API (Direct)
- **Hosting:** Vercel (Frontend) + Railway/Render (Backend)

---

## 3. Data Schema (PostgreSQL)

### Events Table
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (Default: gen_random_uuid()) |
| `category` | Enum | Sports, Arts, Education, Spiritual, Music, Food |
| `title` | String | Name of the event |
| `description` | Text | Detailed event info (used for RAG context) |
| `date_time` | Timestamp | Scheduled start time |
| `location` | String | Venue name/Area (e.g., RK Beach, Gajuwaka) |
| `age_group` | Int Range | Target audience (e.g., [5, 12], [18, 99]) |
| `external_link` | URL | Link to organizer's site (Optional) |
| `contact_info` | String | WhatsApp/Phone for the organizer |
| `embedding` | Vector(1536) | Semantic vector for AI search |

### Users Table
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `phone_number` | String | Unique WhatsApp number |
| `name` | String | User's name |
| `preferences` | JSONB | Stored categories, interests, and interaction history for personalization |

### Admins Table
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `email` | String | Admin's login email |
| `role` | Enum | SuperAdmin, Editor |

---

## 4. Functional Components

### Part 1: The Web Portal (Discovery Phase)
- **Search & Filter:** Multi-select filtering by Category, Date Range, and Age Group.
- **Preference Dashboard:** User dashboard to toggle interest categories. All web users can set preferences.
- **WhatsApp Linking (Optional):** Users who want push notifications and AI chat can provide their phone number to link their account to the WhatsApp Agent. This unlocks Tier 2 features.
- **WhatsApp Bridge:** "Notify Me" button that pre-fills a WhatsApp message to the bot, automating the account link flow.

### Part 2: The WhatsApp AI Agent (Engagement Phase)
- **Reactive (Pull):** NLP-based queries using RAG.
  - *Example:* "Show me kids' events this Saturday."
  - *Logic:* AI extracts entities -> SQL/Vector query -> Natural language response.
- **Proactive (Push) [DEFERRED]:** Automated alerts.
  - *Logic:* Daily Cron job checks for new events matching user `preferences` and pushes via WhatsApp Template Messages. *(Note: Implementation deferred to a future phase to optimize operating costs, as WhatsApp template messages incur per-conversation fees).*
- **Onboarding:** Automated flow for first-time users to capture name and interests if not already set via the web.
- **Personalization Engine:** Continuously tracks user queries, clicked events, and explicit choices to build a profile over time. The AI uses this context to offer highly customized and tailored recommendations.

### Part 3: The Admin Dashboard
- **Admin Login:** Secure web access for authorized administrators.
- **Event Management:** GUI to manually add, edit, or remove events without touching the database directly. Upon addition, vectors are automatically generated.
- **Analytics Engine:** Visual charts/graphs displaying user engagement, most popular event categories, search query volume, and active user metrics over time.

---

## 5. AI Interaction Flow (RAG Pipeline)
1. **User Query:** "Any tech meetups in Madhurawada?"
2. **Entity Extraction:** AI identifies `category: Technology`, `location: Madhurawada`.
3. **Retrieval:** System performs a hybrid search (SQL Filters + Vector Similarity).
4. **Augmentation:** Top 3-5 matches are injected into the system prompt.
5. **Generation:** AI provides a concise, friendly response with "Click here" links.

---

## 6. Development Milestones (The Vibe-Coding Roadmap)

- [ ] **Phase 1: Foundation:** Setup PostgreSQL + pgvector and a basic CRUD API for events.
- [ ] **Phase 2: Discovery Portal:** Build Next.js site with event listing, filtering, and Google Login.
- [ ] **Phase 3: Local AI Integration:** Connect Ollama for local RAG testing on the event dataset.
- [ ] **Phase 4: WhatsApp Webhook:** Implement Meta Cloud API webhook to receive and send messages.
- [ ] **Phase 5: Cloud Deployment:** Migrate to production, finalizing Reactive AI features.
- [ ] **Phase 6: Push Engine [DEFERRED]:** Build the "Push" engine to notify users when new events drop.

---

## 7. Environment & Global Config
```env
# Toggle between 'local' and 'cloud'
RUN_MODE="local" 

# Local AI (Ollama)
OLLAMA_BASE_URL="http://localhost:11434"

# Cloud AI (e.g., Gemini, OpenAI)
GEMINI_API_KEY="AIza..."
# OPENAI_API_KEY="sk-..."

# WhatsApp
WHATSAPP_TOKEN="your_meta_token"
WHATSAPP_PHONE_ID="your_phone_id"