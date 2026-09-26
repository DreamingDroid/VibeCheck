# VibeCheck Smart Search & Multi-Platform Discovery Architecture

## 1. Overview & Vision

The **VibeCheck Search & Discovery Engine** provides a unified, cross-platform search experience across both web and conversational channels. It connects users with upcoming events, curated vibes, and community organisers through two complementary interfaces:

1. **Desktop Web Header Search**: High-speed, debounced direct information retrieval (<50ms) with interactive live dropdowns, popular category tags, and instant cards for events and organisers.
2. **Telegram Bot Assistant**: Natural language query understanding (e.g. *"Are there any trekking events this weekend?"*), returning formatted summaries, direct RSVP actions, and **smart deep links** (`[ 🌐 View on VibeCheckSpace ]`) that pre-filter the web dashboard.

---

## 2. System Architecture

```mermaid
flowchart TD
    subgraph UserChannels ["Client Touchpoints"]
        WebHeader["Desktop Header Search Bar<br/>(Live Dropdown)"]
        WebDashboard["Web Dashboard Catalog<br/>(/dashboard?q=...&timeframe=...)"]
        TelegramUser["Telegram Chat User<br/>('trekking this weekend')"]
    end

    subgraph BackendAPI ["Backend Search & NLP Layer"]
        ProxyRoute["Next.js Smart Proxy<br/>(/api/proxy/search)"]
        ExpressSearch["Public Search Endpoint<br/>(GET /api/search)"]
        NLPParser["Telegram NLP Intent Parser<br/>(Regex + Gemini/Ollama)"]
        DAL["searchPublic() Query Engine"]
    end

    subgraph DatabaseLayer ["PostgreSQL + pgvector"]
        EventsTable["events (Approved, Upcoming)"]
        AdminsTable["admins (Approved Organisers)"]
        FollowersTable["organizer_followers"]
        RSVPsTable["event_rsvps"]
    end

    WebHeader -->|Debounced Query| ProxyRoute
    ProxyRoute --> ExpressSearch
    ExpressSearch --> DAL

    TelegramUser -->|Natural Language| NLPParser
    NLPParser -->|Structured Filters| DAL

    DAL --> EventsTable
    DAL --> AdminsTable
    DAL --> FollowersTable
    DAL --> RSVPsTable

    DAL -->|Structured JSON| ExpressSearch
    ExpressSearch -->|Live Dropdown Cards| WebHeader
    WebHeader -->|Enter / Click| WebDashboard

    DAL -->|Top Matches| NLPParser
    NLPParser -->|Formatted Message + Deep Link| TelegramUser
    TelegramUser -->|Tap [View on VibeCheckSpace]| WebDashboard
```

---

## 3. Backend Search API Specification

### Endpoint: `GET /api/search`

Publicly accessible endpoint protected by Next.js Smart Proxy with CSRF protection and rate limiting.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `q` or `query` | `string` | No | Search keyword matching title, description, category, venue, or organizer name. | `trekking` |
| `city` | `string` | No | Target city filter (case-insensitive). Defaults to all supported cities if omitted. | `Vizag` |
| `category` | `string` | No | Event category (e.g., `Sports`, `Music`, `Techno`, `Food`, `Comedy`). | `Sports` |
| `timeframe` | `string` | No | Temporal filter window: `today`, `tomorrow`, `this_weekend`, `this_week`, `this_month`, `upcoming`. | `this_weekend` |
| `startDate` | `ISO Date` | No | Explicit custom start timestamp filter. | `2026-10-01T00:00:00Z` |
| `endDate` | `ISO Date` | No | Explicit custom end timestamp filter. | `2026-10-04T23:59:59Z` |
| `limitEvents` | `number` | No | Maximum event results returned (default: 12). | `8` |
| `limitOrganizers`| `number` | No | Maximum organizer results returned (default: 6). | `4` |

#### Sample Response Payload

```json
{
  "success": true,
  "data": {
    "query": "trekking",
    "city": "Vizag",
    "category": null,
    "timeframe": "this_weekend",
    "events": [
      {
        "id": "evt_araku_trek_101",
        "title": "Araku Valley Sunrise Trek",
        "description": "Monsoon guided morning hike with panoramic hill views.",
        "category": "Sports",
        "location": "Araku Hilltop",
        "city": "Vizag",
        "date_time": "2026-10-03T05:30:00Z",
        "end_time": "2026-10-03T11:00:00Z",
        "timings": "5:30 AM - 11:00 AM",
        "status": "approved",
        "is_paid": true,
        "image_url": "https://res.cloudinary.com/.../trek.jpg",
        "organizer_name": "Bangalore Trekkers",
        "organizer_slug": "bangalore-trekkers",
        "organizer_rating": 4.9,
        "rsvp_count": 18
      }
    ],
    "organizers": [
      {
        "id": "org_98234",
        "brand_name": "Bangalore Trekkers",
        "slug": "bangalore-trekkers",
        "description": "Leading outdoor adventure community in South India.",
        "image_url": "https://res.cloudinary.com/.../logo.jpg",
        "rating": 4.9,
        "instagram_handle": "bangaloretrekkers",
        "followers_count": 142,
        "upcoming_events_count": 2
      }
    ],
    "totalEvents": 1,
    "totalOrganizers": 1
  }
}
```

---

## 4. Frontend Web Desktop Search

Implemented in [`web/src/components/global-header.tsx`](file:///home/trivikramg/workspace/VibeCheck/web/src/components/global-header.tsx).

### Features:
1. **Debounced Live Querying**: Executes API call 250ms after user pauses typing to avoid excessive backend requests.
2. **Instant Loading Spinner**: Animated feedback during search operations.
3. **Popular Category Suggestions**: Shown when the search bar is focused but empty (`Trekking`, `Live Music`, `Techno`, `Comedy`, `Sports`, `Food`, `Wellness`, `Indie`).
4. **Organisers Showcase**: Displays matching organizer avatars, brand names, verification handles, star ratings, and active vibe counters with direct links to `/organizer/[slug]`.
5. **Events Showcase**: Displays matching event titles, formatted date badges, venue/location, and category pills with direct links to `/event/[id]`.
6. **Keyboard Navigation & Dismissal**:
   - `Enter` key triggers full search dashboard navigation (`/dashboard?q=...`).
   - `Escape` key or clicking outside closes the dropdown.

---

## 5. Web Dashboard Deep-Linking & Filtering

Implemented in [`web/src/app/dashboard/page.tsx`](file:///home/trivikramg/workspace/VibeCheck/web/src/app/dashboard/page.tsx) and [`web/src/context/CityContext.tsx`](file:///home/trivikramg/workspace/VibeCheck/web/src/context/CityContext.tsx).

### Deep-Link URL Format:
```
https://vibecheck.space/dashboard?search=true&q={query}&timeframe={timeframe}&city={city}
```

### Supported Filtering Behaviors:
- **`q` or `search` parameter**: Dynamically filters catalog events by matching keywords across title, description, category, location, and host email.
- **`timeframe` parameter**: Dynamically filters by relative date windows:
  - `today`: Events starting today.
  - `tomorrow`: Events starting tomorrow.
  - `this_weekend`: Events scheduled Friday 16:00 through Sunday 23:59 within the next 7 days.
  - `this_week`: Events within the next 7 days.
  - `this_month`: Events within the next 30 days.
- **`city` parameter**: Automatically activates the specified city in `CityContext`.
- **Active Search Header Bar**: Displays:
  - Result count: *"Results for 'trekking' [THIS WEEKEND] • 2 vibes found"*
  - Clear Filter button: 1-click reset button returning to the unfiltered city view.

---

## 6. Telegram Bot Smart Search Assistant

Implemented in [`server/src/telegram.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/telegram.ts).

### Conversational Flow:

```text
User: "Are there any trekking events this weekend?"
```

1. **Intent & Parameter Extraction**:
   - Deterministic keyword and timeframe matching identifies `timeframe = 'this_weekend'` and `query = 'trekking'`.
   - Multi-word queries pass through fast LLM intent parser to extract cleanly stripped keywords.
2. **Database Query**:
   - `searchPublic(pool, { q: 'trekking', timeframe: 'this_weekend', city: 'Vizag' })`.
3. **Response Formatting**:
   - Bulleted list of top event cards with dates, venues, categories, and price tags.
   - Featured host profile with rating and bio.
   - **Interactive Inline Buttons**:
     - `[ 🌐 View on VibeCheckSpace ]` ➔ Links to `/dashboard?search=true&q=trekking&timeframe=this_weekend&city=Vizag`
     - `[ 🎟️ RSVP: Araku Sunrise Trek ]` ➔ Links directly to `/event/evt_101`
     - `[ 🎭 Organiser Profile: Bangalore Trekkers ]` ➔ Links to `/organizer/bangalore-trekkers`

---

## 7. Security, Performance & Scalability

1. **Zero-RAG Overhead for Search Bar**: Instant database indexing (Postgres trigrams & ILIKE) delivers <50ms response times without incurring LLM token costs on keystrokes.
2. **Smart Proxy Shield**: All frontend requests route through `/api/proxy/search` with CSRF origin validation, rate-limiting, and internal bearer token signing.
3. **Graceful Fallbacks**: If the LLM intent parser times out (>1.8s) or is unreachable, the Telegram bot automatically falls back to regex parameter extraction.
