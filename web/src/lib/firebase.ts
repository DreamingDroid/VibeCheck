import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  );
}

export function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }
  if (!isFirebaseConfigured()) {
    console.warn("[Firebase] Firebase environment variables not fully set. Push notifications will run in simulated mode.");
    return null;
  }
  try {
    const app = getFirebaseApp();
    return getMessaging(app);
  } catch (error) {
    console.error("[Firebase] Error initializing messaging:", error);
    return null;
  }
}

/**
 * Request notification permission from browser and register token with backend
 */
export async function registerFcmForUser(params: {
  email: string;
  city?: string | null;
  categories?: string[];
  rsvpEventIds?: string[];
}): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[Firebase] Notification permission not granted.");
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (token) {
      console.log("[Firebase] Device FCM Token acquired:", token.substring(0, 15) + "...");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${baseUrl}/api/notifications/fcm/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: params.email,
          token,
          deviceInfo: navigator.userAgent,
          city: params.city || null,
          categories: params.categories || [],
          rsvpEventIds: params.rsvpEventIds || [],
        }),
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error("[Firebase] Error registering FCM:", error);
    return null;
  }
}

/**
 * Listen for real-time foreground FCM messages while app is open
 */
export function onForegroundFcmMessage(callback: (payload: any) => void): () => void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return () => {};
  }

  let unsubscribe: (() => void) | null = null;

  getFirebaseMessaging().then((messaging) => {
    if (!messaging) return;
    try {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log("[Firebase] Foreground message received in real-time:", payload);
        callback(payload);
      });
    } catch (e) {
      console.error("[Firebase] onMessage listener error:", e);
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
