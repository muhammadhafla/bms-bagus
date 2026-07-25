'use client';

import React from 'react';
import { useSidebarContext } from './SidebarProvider';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { InstallBanner } from '@/components/ui/InstallBanner';
import BottomNav from '@/components/ui/BottomNav';
import { Toaster } from 'sonner';

export function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const { contentMargin } = useSidebarContext();

  return (
    <>
      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${contentMargin} p-0 lg:p-3`}>
        {/* Page content */}
        <main className="flex-1 overflow-auto bg-white dark:bg-neutral-900 rounded-none lg:rounded-[2rem] shadow-none lg:shadow-sm border-0 lg:border border-neutral-200/50 dark:border-neutral-800/50 p-4 lg:p-6 relative pb-24 lg:pb-6">
          <UpdateBanner />
          <InstallBanner />
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
      {/* Global Toaster */}
      <Toaster richColors position="top-center" />
    </>
  );
}
