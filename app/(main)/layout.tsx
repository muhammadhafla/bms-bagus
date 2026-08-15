import React from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { QueryProvider } from '@/components/QueryProvider';
import { SidebarProvider } from '@/components/layout/SidebarProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainContentWrapper } from '@/components/layout/MainContentWrapper';
import { PresenceTracker } from '@/components/PresenceTracker';
import { headers } from 'next/headers'; // Imported but intentionally not called outside if unnecessary

export default function MainLayout({ children }: { children: React.ReactNode }) {
  // We avoid calling `headers()` unnecessarily at the layout level unless required,
  // to avoid forcing Dynamic Rendering globally.

  return (
    <QueryProvider>
      <AuthProvider>
        <PresenceTracker />
        <div className="flex min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
          <SidebarProvider>
            <Sidebar />
            <MainContentWrapper>{children}</MainContentWrapper>
          </SidebarProvider>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
