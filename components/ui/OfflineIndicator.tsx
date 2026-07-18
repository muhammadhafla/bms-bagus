'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { IconWifiOff } from '@tabler/icons-react';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-neutral-900 text-white text-xs sm:text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 animate-fade-in-up pb-[calc(env(safe-area-inset-bottom)+8px)] lg:pb-2">
      <IconWifiOff size={16} className="text-neutral-400" />
      <span>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</span>
    </div>
  );
}
