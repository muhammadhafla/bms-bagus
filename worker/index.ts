/// <reference lib="webworker" />
import { type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist';
import { defaultCache } from '@serwist/next/worker';

export {};
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const manifest = self.__SW_MANIFEST || [];
const precacheEntries = [
  ...manifest,
  { url: '/offline', revision: '1' },
];

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: false, // We will handle this manually via postMessage
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }: { request: Request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Mendengarkan pesan dari aplikasi (client)
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push Notification Listener
self.addEventListener('push', (event: any) => {
  if (event.data) {
    try {
      let data: any = {};
      try {
        data = event.data.json();
      } catch {
        data = { body: event.data.text() };
      }

      const title = data.title || 'BMS - Notifikasi';
      const options: any = {
        body: data.body || 'Ada pemberitahuan baru di BMS.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || `bms-${Date.now()}`,
        renotify: true,
        data: {
          url: data.url || '/dashboard',
          timestamp: Date.now(),
        },
      };

      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error('Error in service worker push event:', e);
    }
  }
});

// Notification Click Listener
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: readonly WindowClient[]) => {
      // If a window is already open at our domain, focus and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
