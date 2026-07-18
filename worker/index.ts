/// <reference lib="webworker" />

export default null;
declare const self: ServiceWorkerGlobalScope;

// Mendengarkan pesan dari aplikasi (client)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Memaksa service worker baru untuk mengambil alih segera
    self.skipWaiting();
  }
});

// Anda dapat menambahkan custom logic workbox di sini jika perlu
// misalnya background sync, custom routing, push notifications dll
