# Firebase Cloud Messaging (FCM) Setup Guide for VibeCheck

This guide explains how to connect your free Firebase project to VibeCheck for real-time in-app toasts, zero-latency badge syncing, and background OS lock-screen push notifications.

---

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, name it `VibeCheck` (or your preferred name), and complete the setup.

---

## 2. Web App Configuration (Client / Frontend)

1. In the Firebase project overview, click the **Web icon (`</>`)** to add a web application.
2. Register the app (e.g. `VibeCheck Web PWA`).
3. Under **Project Settings** > **General** > **Your apps**, copy the Firebase SDK config values.
4. Go to **Project Settings** > **Cloud Messaging** tab:
   - Under **Web configuration** > **Web Push certificates**, click **Generate key pair** to get your **VAPID Key**.
5. Add these keys to `web/.env.local` (or `web/.env`):

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vibecheck-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vibecheck-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=vibecheck-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN...your_web_push_vapid_key...
```

---

## 3. Server Configuration (Backend / Node.js)

1. In the Firebase Console, go to **Project Settings** > **Service accounts** tab.
2. Click **Generate new private key** (downloads a `.json` file).
3. In `server/.env`:
   - Set `FIREBASE_SERVICE_ACCOUNT_KEY` to the single-line JSON string of the downloaded service account:

```env
# Option A: Single-line stringified JSON (Recommended for Coolify / Docker / Vercel / Cloud)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"vibecheck-app","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-...@vibecheck-app.iam.gserviceaccount.com",...}'

# Option B: Absolute / relative path to downloaded JSON file
FIREBASE_SERVICE_ACCOUNT_KEY="./serviceAccountKey.json"
```

---

## 4. How Topic Routing Works Automatically

| Scope Selected in Admin / Organizer | Firebase Topic Dispatched | Recipients |
|---|---|---|
| **Global Broadcast** | `global` | All registered users |
| **City Level Broadcast** (e.g. Vizag) | `city_vizag` | All users located in Vizag |
| **Event Level Broadcast** (e.g. event ID 45) | `event_45` | All attendees who RSVP'd to that event |
| **Category Level Broadcast** (e.g. Techno) | `cat_techno` | All users with 'Techno' in their preferences |

---

## 5. Battery Efficiency & Graceful Fallback Mode

* **When Firebase is Configured**:
  * 🔋 **Zero Battery Drain**: Background interval polling is **completely disabled**. The app only fetches the initial count on mount and relies 100% on instant event-driven Firebase push messages.
* **When Firebase is NOT Configured**:
  * The app runs in fallback polling mode so you can continue developing and testing without any crashes.

