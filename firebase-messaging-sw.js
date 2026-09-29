/* FCM displays notification payloads even when no scheduler page is open.
 * Do not add onBackgroundMessage/showNotification: that would display duplicates.
 * There is intentionally no fetch cache, so app updates are never pinned to stale assets.
 */
self.addEventListener('notificationclick', (event) => {
  // FCM handles its own background payloads; handle notifications shown by the open page here.
  if (!event.notification.data?.url) return;
  const url = new URL(event.notification.data.url, self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((client) => client.url === url.href);
      if (existing) return existing.focus();
      return self.clients.openWindow(url.href);
    })(),
  );
});
importScripts('./config/firebase.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
firebase.initializeApp(firebaseConfig);
firebase.messaging();
