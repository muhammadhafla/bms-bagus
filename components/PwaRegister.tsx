'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for service worker updates periodically
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration error:', err);
        });
    }
  }, []);

  return null;
}
