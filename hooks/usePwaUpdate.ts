'use client';

import { useEffect, useState } from 'react';

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      const handleWaiting = (_event: any) => {
        // SW baru sedang menunggu — tampilkan banner ke user
        setUpdateAvailable(true);
      };

      const handleControlling = () => {
        // SW baru sudah auto-takeover.
        // JANGAN reload di sini — user mungkin sedang input data.
        // Cukup tampilkan banner agar user reload sendiri.
        setUpdateAvailable(true);
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
    // Aktifkan SW baru yang sedang menunggu (jika ada).
    // messageSkipWaiting() bersifat no-op jika tidak ada SW yang waiting,
    // sehingga aman dipanggil di kedua skenario.
    if (window.workbox) {
      window.workbox.messageSkipWaiting();
    } else if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Langsung reload — tidak bergantung pada controlling event.
    // Ini menangani kedua skenario:
    // A) SW masih "waiting" → messageSkipWaiting() mengaktifkannya, lalu reload.
    // B) SW sudah auto-takeover → tidak ada yang waiting, langsung reload.
    window.location.reload();
  };

  return { updateAvailable, updatePwa };
}

declare global {
  interface Window {
    workbox: any;
  }
}
