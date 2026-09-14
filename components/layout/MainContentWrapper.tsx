'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSidebarContext } from './SidebarProvider';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { InstallBanner } from '@/components/ui/InstallBanner';
import BottomNav from '@/components/ui/BottomNav';
import { Toaster } from 'sonner';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { contentMargin } = useSidebarContext();
  const pathname = usePathname();
  const isHelp = pathname?.startsWith('/help');

  // Silently manage PWA Service Worker background updates without disrupting active users
  usePwaUpdate();

  return (
    <>
      {/* Main Content */}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-200 ${isHelp ? 'ml-0 p-0' : `${contentMargin} p-0 lg:p-3`}`}
      >
        {/* Page content */}
        {isHelp ? (
          <main className="relative flex-1 overflow-auto bg-neutral-50 p-0 shadow-none dark:bg-neutral-950">
            {children}
          </main>
        ) : (
          <main className="relative flex-1 overflow-auto rounded-none border-0 border-neutral-200/50 bg-white p-4 pb-24 shadow-none lg:rounded-[2rem] lg:border lg:p-6 lg:pb-6 lg:shadow-sm dark:border-neutral-800/50 dark:bg-neutral-900">
            <InstallBanner />
            {children}
          </main>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
      {/* Global Toaster */}
      <Toaster richColors position="top-center" />
    </>
  );
}
