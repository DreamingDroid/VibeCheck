# 05. Anti-Scalping, Fair Access & Privacy Guardrails

## 1. Technical Feature Design

### 🎯 Purpose
To prevent bot hoarders and ticket scalpers from exhausting free and paid event quotas, eliminate conflicting overlapping bookings, protect 21+ venues from underage access, prevent review-bombing through verified physical check-in rules, and safeguard attendee email privacy from organizers.

---

### 🎟️ 1. Anti-Hoarding Cap (Max 5 Active Passes)
* **Location:** [`server/src/events.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/events.ts) (`rsvpEventHandler`).
* **Logic:** Prevents a single user account from claiming unlimited passes across the city.
```sql
SELECT COUNT(*)::int AS count 
FROM event_rsvps er 
JOIN events e ON er.event_id = e.id 
WHERE LOWER(er.user_email) = $1 
  AND er.status IN ('approved', 'confirmed', 'pending') 
  AND (e.end_time >= NOW() OR (e.end_time IS NULL AND e.date_time >= NOW()));
```
* **Enforcement:** If `count >= 5`, the system blocks further RSVPs with:
  > *"You have reached the limit of 5 active upcoming event passes. Please attend or cancel existing reservations before booking new ones."*

---

### ⏰ 2. Double-Booking Schedule Conflict Shield
* **Location:** [`server/src/events.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/events.ts) (`rsvpEventHandler`).
* **Logic:** Checks if the user already holds a confirmed pass for another event overlapping within $\pm 2\text{ hours}$ of the target event time.
* **Enforcement:** Blocks conflicting bookings to ensure spots are reserved only for attendees who can actually be physically present.

---

### 🔞 3. 21+ Age Gate for Nightlife & Clubbing
* **Location:** [`server/src/events.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/events.ts) (`rsvpEventHandler`).
* **Enforcement:** Automatically enforced for categories like `Techno / Nightlife`, `Clubbing`, or `Pub Crawl`. Requires explicit adult confirmation before pass generation.

---

### ⭐ 4. Verified Check-In Gate for Reviews (Anti Review-Bombing)
* **Location:** [`server/src/ratings.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/ratings.ts) (`submitRatingHandler`).
* **Logic:** A user cannot rate an event or host unless they were physically checked in by the host's QR scanner at the door (`checkin_status = 'checked_in'`).
```sql
SELECT id FROM event_rsvps 
WHERE event_id = $1 AND LOWER(user_email) = $2 AND checkin_status = 'checked_in';
```
* **Enforcement:** Unverified users or no-shows are blocked from leaving reviews, eliminating fake 1-star review-bombing or manufactured fake 5-star ratings.

---

### 📢 5. Organizer Broadcast Throttling (Anti-Spam Shield)
* **Location:** [`server/src/broadcasts.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/broadcasts.ts) / [`server/src/organizer.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/organizer.ts).
* **Logic:** Organizers are limited to **maximum 1 general broadcast per 4 hours per event** to prevent attendee notification fatigue.

---

### 🔒 6. Attendee Email & Privacy Masking
* **Location:** [`server/src/queries/events.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/queries/events.ts) and [`server/src/queries/crm.ts`](file:///home/trivikramg/workspace/VibeCheck/server/src/queries/crm.ts).
* **Masking Algorithm:**
  ```typescript
  export function maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const [name, domain] = parts;
    const maskedName = name.length <= 2 
      ? name[0] + '***' 
      : name.slice(0, 2) + '***' + name.slice(-1);
    return `${maskedName}@${domain}`;
  }
  ```
* **Result:** Organizers can see attendee count and first names for guest list check-in, but personal raw email addresses and phone numbers are protected from scraping.

---

## 2. Product Marketing & Demo Narrative

### 📢 Headline & Pitch
> **"Fair Access, Authentic Reviews & Built-In Privacy."**

### 💡 The Problem with Legacy Platforms
Bots and scalpers hoard free RSVP spots and sell them outside venues. Bad actors post fake reviews without attending. Hosts export attendee emails into spam marketing lists.

### 🚀 The VibeCheck Solution
1. **No Hoarding:** Every user gets up to 5 active passes at a time. Spots go to real people.
2. **Double-Booking Prevention:** You can’t hold passes for two events happening at the same time across town.
3. **100% Verified Reviews:** Only attendees whose QR pass was physically scanned at the door can leave star ratings and reviews.
4. **Privacy Shield:** Attendee emails are masked automatically in host dashboards.

### 🎯 Key Demo Talking Points
* *"Notice what happens when someone tries to book 10 events across the weekend — VibeCheck caps active bookings at 5 to ensure fair community access."*
* *"Reviews on VibeCheck are 100% authentic because only attendees scanned in at the door can rate the experience."*
* *"Attendee privacy is protected by default with automated email masking."*
