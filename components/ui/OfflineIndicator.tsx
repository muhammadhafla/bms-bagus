'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { IconWifiOff } from '@tabler/icons-react';

export function OfflineIndicator() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="animate-fade-in-up fixed right-0 bottom-0 left-0 z-[100] flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] text-xs font-medium text-white sm:text-sm lg:pb-2">
      <IconWifiOff size={16} className="text-neutral-400" />
      <span>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</span>
    </div>
  );
}
