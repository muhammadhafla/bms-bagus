'use client';

import { useEffect, useRef, useState } from 'react';

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  // Flag: apakah reload ini dipicu oleh user (klik tombol) atau otomatis oleh SW?
  const userTriggeredRef = useRef(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      // Workbox ditangani oleh @ducanh2912/next-pwa
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      const handleWaiting = (_event: any) => {
        // SW baru sedang menunggu — tampilkan banner ke user
        setUpdateAvailable(true);
      };

      const handleControlling = () => {
        // SW baru sudah mengambil alih.
        // Reload HANYA jika dipicu oleh klik tombol user, bukan secara otomatis.
        // Ini mencegah halaman reload tiba-tiba saat user sedang input data.
        if (userTriggeredRef.current) {
          window.location.reload();
        } else {
          // Auto-takeover oleh SW (misalnya setelah deploy) — hanya tampilkan banner.
          setUpdateAvailable(true);
        }
      };

      wb.addEventListener('waiting', handleWaiting);
      wb.addEventListener('controlling', handleControlling);

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
    // Tandai bahwa reload ini berasal dari aksi user
    userTriggeredRef.current = true;

    if (window.workbox) {
      window.workbox.messageSkipWaiting();
    } else if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback: tidak ada SW yang menunggu, langsung reload
      window.location.reload();
    }
  };

  return { updateAvailable, updatePwa };
}

declare global {
  interface Window {
    workbox: any;
  }
}
