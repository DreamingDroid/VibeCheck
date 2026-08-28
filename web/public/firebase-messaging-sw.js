// Firebase Cloud Messaging Background Service Worker
// Automatically receives push notifications when the app/PWA is in background or closed

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Parse URL search params or fallback to self configs if injected
const selfUrl = new URL(self.location.href);
const apiKey = selfUrl.searchParams.get('apiKey') || '';
const projectId = selfUrl.searchParams.get('projectId') || '';
const messagingSenderId = selfUrl.searchParams.get('messagingSenderId') || '';
const appId = selfUrl.searchParams.get('appId') || '';

if (apiKey && projectId) {
  firebase.initializeApp({
    apiKey: apiKey,
    projectId: projectId,
    messagingSenderId: messagingSenderId,
    appId: appId,
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'VibeCheck Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.message || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: payload.data?.link || payload.data?.click_action || '/dashboard',
      },
      tag: payload.data?.type || 'vibecheck-broadcast',
      requireInteraction: payload.data?.type === 'emergency_alert',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

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
