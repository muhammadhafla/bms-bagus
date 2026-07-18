'use client';

import { useEffect, useState } from 'react';

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      // Workbox ditangani oleh @ducanh2912/next-pwa
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      wb.addEventListener('waiting', (event: any) => {
        // Service worker baru sedang menunggu
        setUpdateAvailable(true);
        // Registrasi diperlukan jika ingin memanggil postMessage
        if (event.sw) {
           // We'll rely on wb.messageSkipWaiting() later
        }
      });

      wb.addEventListener('controlling', () => {
        // Saat SW baru mengambil kendali, reload halaman
        window.location.reload();
      });

      // Anda juga bisa memeriksa pendaftaran
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
      });
    }
  }, []);

  const updatePwa = () => {
    if (window.workbox) {
      // Memicu SKIP_WAITING ke service worker
      window.workbox.messageSkipWaiting();
    } else if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return { updateAvailable, updatePwa };
}

declare global {
  interface Window {
    workbox: any;
  }
}
