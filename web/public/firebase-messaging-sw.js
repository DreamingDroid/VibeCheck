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

if (apiKey && projectId) {
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

      const title = payload.data?.title || payload.notification?.title || 'VibeCheck Notification';
      const body = payload.data?.message || payload.data?.body || payload.notification?.body || '';
      const link = payload.data?.link || payload.data?.click_action || '/dashboard';

      const notificationOptions = {
        body: body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: {
          url: link,
        },
        // Group all VibeCheck notifications under single tag: replaces old ones so only latest shows
        tag: 'vibecheck-app-alerts',
        renotify: true,
        requireInteraction: payload.data?.type === 'emergency_alert',
      };

      self.registration.showNotification(title, notificationOptions);
    });
  } catch (err) {
    console.error('[firebase-messaging-sw] Firebase initialization error:', err);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
