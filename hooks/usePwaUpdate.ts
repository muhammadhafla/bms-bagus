'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook for managing silent PWA Service Worker updates.
 * - Detects new service worker in the background.
 * - Triggers SKIP_WAITING automatically when the app is hidden/backgrounded (document.visibilityState === 'hidden' or pagehide).
 * - Avoids disruptive popups or forced unexpected reloads while the user is actively inputting data.
 */
export function usePwaUpdate() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let isMounted = true;
    let cleanupInterval: (() => void) | undefined;

    const applyWaitingWorker = () => {
      const reg = registrationRef.current;
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    // When the tab is minimized, user switches apps, or tab is hidden, activate the waiting worker
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        applyWaitingWorker();
      } else if (document.visibilityState === 'visible') {
        // When user comes back, check for any pending updates from the server
        registrationRef.current?.update().catch(() => {
          // Ignore network errors during background update check
        });
      }
    };

    // When user navigates away or closes tab
    const handlePageHide = () => {
      applyWaitingWorker();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    // Check service worker registration
    navigator.serviceWorker.ready
      .then((reg) => {
        if (!isMounted) return;
        registrationRef.current = reg;

        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller &&
                document.visibilityState === 'hidden'
              ) {
                // If the app is already hidden when new worker finishes installing, activate immediately
                applyWaitingWorker();
              }
            });
          }
        });

        // Periodic background update check every 60 minutes
        const intervalId = setInterval(
          () => {
            reg.update().catch(() => {});
          },
          60 * 60 * 1000
        );

        cleanupInterval = () => clearInterval(intervalId);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      if (cleanupInterval) cleanupInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const updatePwa = () => {
    const reg = registrationRef.current;
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return { updatePwa };
}
