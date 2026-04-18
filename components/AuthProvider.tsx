'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth';

const SESSION_CHECK_INTERVAL = 60000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, cleanup, initialized, checkAndRefreshSession, user, profile } = useAuthStore();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    initialize();

    return () => {
      cleanup();
    };
  }, [initialize, cleanup]);

  useEffect(() => {
    if (!user || !initialized) return;

    const interval = setInterval(() => {
      checkAndRefreshSession();
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user, initialized, checkAndRefreshSession]);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) {
      prevUserIdRef.current = null;
      return;
    }

    if (userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;
      checkAndRefreshSession();
    }
  }, [user?.id, checkAndRefreshSession]);

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
