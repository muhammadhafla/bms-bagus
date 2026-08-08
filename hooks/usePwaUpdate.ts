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

      const handleWaiting = (event: any) => {
        // Service worker baru sedang menunggu
        setUpdateAvailable(true);
        // Registrasi diperlukan jika ingin memanggil postMessage
        if (event.sw) {
           // We'll rely on wb.messageSkipWaiting() later
        }
      };

      const handleControlling = () => {
        // Saat SW baru mengambil kendali, reload halaman
        window.location.reload();
      };

      wb.addEventListener('waiting', handleWaiting);
      wb.addEventListener('controlling', handleControlling);

      // Anda juga bisa memeriksa pendaftaran
      let isMounted = true;
      navigator.serviceWorker.ready.then((reg) => {
        if (isMounted) setRegistration(reg);
      });

      return () => {
        isMounted = false;
        wb.removeEventListener('waiting', handleWaiting);
        wb.removeEventListener('controlling', handleControlling);
      };
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
