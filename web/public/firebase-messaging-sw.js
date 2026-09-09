// Firebase Cloud Messaging Background Service Worker
// Automatically receives push notifications when the app/PWA is in background or closed

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parse URL search params passed dynamically from Next.js environment variables
const selfUrl = new URL(self.location.href);
const apiKey = selfUrl.searchParams.get('apiKey') || '';
const projectId = selfUrl.searchParams.get('projectId') || '';
const messagingSenderId = selfUrl.searchParams.get('messagingSenderId') || '';
const appId = selfUrl.searchParams.get('appId') || '';

try {
  firebase.initializeApp({
    apiKey: apiKey,
    projectId: projectId,
    messagingSenderId: messagingSenderId,
    appId: appId,
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw] Received background message via FCM:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'VibeCheck Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || payload.data?.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: payload.data?.link || payload.data?.click_action || '/dashboard',
      },
      tag: payload.data?.type || payload.data?.tag || 'vibecheck-broadcast',
      requireInteraction: payload.data?.type === 'emergency_alert',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.error('[firebase-messaging-sw] Firebase initialization error:', err);
}

// Native Web Push Fallback Listener
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const rawData = event.data.json();
    console.log('[firebase-messaging-sw] Native push event payload:', rawData);

    const title = rawData.notification?.title || rawData.data?.title || 'VibeCheck Notification';
    const body = rawData.notification?.body || rawData.data?.message || rawData.data?.body || '';
    const targetUrl = rawData.data?.link || rawData.data?.click_action || rawData.fcmOptions?.link || '/dashboard';

    const options = {
      body: body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: targetUrl,
      },
      tag: rawData.data?.type || 'vibecheck-broadcast',
      requireInteraction: rawData.data?.type === 'emergency_alert',
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('VibeCheck Alert', {
        body: text,
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: '/dashboard' }
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
