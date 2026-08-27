'use client';

import { useEffect, useState } from 'react';

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      let isMounted = true;
      let refreshing = false;

      // Handle controller change (when new service worker takes over)
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Check current registration
      navigator.serviceWorker.ready.then((reg) => {
        if (!isMounted) return;
        setRegistration(reg);

        // If there's already a waiting service worker
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new service workers installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              // Only trigger if we already have a controller (meaning it's an update, not the first install)
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      return () => {
        isMounted = false;
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const updatePwa = () => {
    if (registration && registration.waiting) {
      // Trigger SKIP_WAITING to activate the waiting service worker
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload
      window.location.reload();
    }
  };

  return { updateAvailable, updatePwa };
}
