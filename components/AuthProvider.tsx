'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/lib/auth';

// Priority 3: 5 menit fallback mutlak untuk check session
const SESSION_CHECK_INTERVAL = 300000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, cleanup, initialized, checkAndRefreshSession, user, profile } = useAuthStore();
  const prevUserIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Safe wrapper for checkAndRefreshSession
  const safeCheckSession = useCallback(async () => {
    if (!isMountedRef.current) return false;
    try {
      const result = await checkAndRefreshSession();
      if (!isMountedRef.current) return false;
      return result;
    } catch (error) {
      if (isMountedRef.current) console.error('Session check error:', error);
      return false;
    }
  }, [checkAndRefreshSession]);

  useEffect(() => {
    isMountedRef.current = true;
    initialize();

    return () => {
      isMountedRef.current = false;
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

  return <>{children}</>;
}
