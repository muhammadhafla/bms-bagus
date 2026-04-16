'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, initialized, authSubscription } = useAuthStore();

  useEffect(() => {
    initialize();

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [initialize, authSubscription]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
