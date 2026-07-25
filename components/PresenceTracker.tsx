'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import { usePresenceStore } from '@/lib/presence';

export function PresenceTracker() {
  const user = useAuthStore((s) => s.user);
  const { initializePresence, cleanupPresence } = usePresenceStore();
  
  useEffect(() => {
    if (user?.id) {
      initializePresence(user.id);
    }
    return () => {
      cleanupPresence();
    };
  }, [user?.id, initializePresence, cleanupPresence]);

  return null;
}
