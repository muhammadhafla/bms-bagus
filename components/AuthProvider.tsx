'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/lib/auth';

const SESSION_CHECK_INTERVAL = 60000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, cleanup, initialized, checkAndRefreshSession, user, profile } = useAuthStore();
  const prevUserIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(true);

  // Safe wrapper for checkAndRefreshSession
  const safeCheckSession = useCallback(async () => {
    if (!isMounted) return false;
    try {
      return await checkAndRefreshSession();
    } catch (error) {
      console.error('Session check error:', error);
      return false;
    }
  }, [checkAndRefreshSession, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    initialize();

    return () => {
      setIsMounted(false);
      cleanup();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initialize, cleanup]);

  // Session check interval - runs after initialization
  useEffect(() => {
    if (!initialized) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      safeCheckSession().catch(console.error);
    }, SESSION_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initialized, safeCheckSession]);

  // Check session when user changes (with debounce)
  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) {
      prevUserIdRef.current = null;
      return;
    }

    if (userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;
      // Debounce rapid user changes
      const timeout = setTimeout(() => {
        safeCheckSession().catch(console.error);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [user?.id, safeCheckSession]);

  // Check session when tab/window becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && initialized && user) {
        safeCheckSession().catch(console.error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [initialized, user, safeCheckSession]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
