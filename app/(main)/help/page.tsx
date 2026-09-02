'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQuery } from '@tanstack/react-query';
import {
  IconArrowLeft,
  IconArrowRight,
  IconKey,
  IconShieldLock,
  IconTruckDelivery,
  IconShoppingCart,
  IconReceipt2,
  IconKeyboard,
  IconPrinter,
  IconHelpCircle,
} from '@tabler/icons-react';

import { HelpTopicId } from './types';
import { HelpHeader } from './components/HelpHeader';
import { HelpSidebar } from './components/HelpSidebar';
import { RoleOverviewView } from './components/RoleOverviewView';
import { CapabilityMatrixView } from './components/CapabilityMatrixView';
import { WorkflowGuidesView } from './components/WorkflowGuidesView';
import { ShortcutsView } from './components/ShortcutsView';
import { HardwareGuideView } from './components/HardwareGuideView';
import { FaqView } from './components/FaqView';
import { MarkdownDocView } from './components/MarkdownDocView';
import { helpDocsApi } from '@/lib/api/help-docs';
import { PageLoadingSpinner } from '@/components/ui';

const STATIC_SEQUENCE: { id: HelpTopicId; title: string; categoryTitle: string }[] = [
  { id: 'roles-overview', title: '5 Klasifikasi Peran', categoryTitle: 'Peran & Hak Akses' },
  { id: 'capability-matrix', title: 'Matriks Hak Akses Modul', categoryTitle: 'Peran & Hak Akses' },
  { id: 'sop-transfers', title: 'SOP Transfer Antar Cabang', categoryTitle: 'Gudang & Logistik' },
  { id: 'sop-waste', title: 'SOP Barang Rusak & Kadaluarsa (Waste)', categoryTitle: 'Gudang & Logistik' },
  { id: 'sop-opname', title: 'SOP Penghitungan Stok Opname', categoryTitle: 'Gudang & Logistik' },
  { id: 'sop-binding', title: 'SOP Penugasan Lokasi Cabang', categoryTitle: 'Gudang & Logistik' },
  { id: 'sop-pos', title: 'SOP Transaksi Penjualan Kasir', categoryTitle: 'Kasir & Penjualan' },
  { id: 'sop-return', title: 'SOP Retur & Penukaran Barang', categoryTitle: 'Kasir & Penjualan' },
  { id: 'sop-cashflow', title: 'SOP Arus Kas & Biaya Toko', categoryTitle: 'Keuangan & HR' },
  { id: 'sop-payroll', title: 'SOP Absensi GPS & Penggajian', categoryTitle: 'Keuangan & HR' },
  { id: 'shortcuts', title: 'Daftar Pintasan Tombol (Hotkeys)', categoryTitle: 'Pintasan Keyboard' },
  { id: 'hardware', title: 'Panduan Scanner & Printer Thermal', categoryTitle: 'Perangkat Keras' },
  { id: 'faq', title: 'Tanya Jawab & Kontak IT Support', categoryTitle: 'Bantuan & FAQ' },
];

function HelpContent() {
  const { user, profile } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTopic, setActiveTopic] = useState<HelpTopicId>('roles-overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [sidebarFilter, setSidebarFilter] = useState('');

  // Fetch dynamic articles list from Supabase
  const { data: dynamicArticlesRes } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => helpDocsApi.getAll(),
    staleTime: 1000 * 60 * 10,
  });

  const dynamicArticles = useMemo(() => dynamicArticlesRes?.data || [], [dynamicArticlesRes?.data]);

  // Check if active topic is a dynamic article slug
  const isDynamicTopic = !STATIC_SEQUENCE.some((t) => t.id === activeTopic);
  const dynamicArticle = isDynamicTopic
    ? dynamicArticles.find((art) => art.slug === activeTopic)
    : null;

  // Sync URL search params (?topic=... or ?doc=...)
  useEffect(() => {
    const topicParam = searchParams.get('topic') || searchParams.get('doc');
    if (topicParam) {
      setActiveTopic(topicParam);
    }
  }, [searchParams]);

  const handleSelectTopic = (topicId: HelpTopicId) => {
    setActiveTopic(topicId);
    router.replace(`/help?topic=${topicId}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hotkey: Ctrl+K to focus search input
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    const searchInput = document.querySelector('input[placeholder*="Cari fitur"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  });

  // Calculate current user's active roles
  const userRoles = useMemo(() => {
    return profile?.roles && profile.roles.length > 0 ? profile.roles : [];
  }, [profile]);

  // Full Sequence for Previous / Next Navigation
  const fullSequence = useMemo(() => {
    const dynamicItems = dynamicArticles.map((art) => ({
      id: art.slug,
      title: art.title,
      categoryTitle: art.category || 'Panduan Tambahan',
    }));
    return [...STATIC_SEQUENCE, ...dynamicItems];
  }, [dynamicArticles]);

  const currentTopicIndex = fullSequence.findIndex((t) => t.id === activeTopic);
  const prevTopic = currentTopicIndex > 0 ? fullSequence[currentTopicIndex - 1] : null;
  const nextTopic =
    currentTopicIndex < fullSequence.length - 1 ? fullSequence[currentTopicIndex + 1] : null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar Header */}
      <HelpHeader
        profile={profile}
        userEmail={user?.email}
        userRoles={userRoles}
        searchQuery={globalSearch}
        onSearchChange={setGlobalSearch}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Main Documentation Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 items-start">
        {/* Left Sub-Sidebar (Docs navigation tree) */}
        <HelpSidebar
          activeTopic={activeTopic}
          onSelectTopic={handleSelectTopic}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
          searchFilter={sidebarFilter}
          onSearchChange={setSidebarFilter}
        />

        {/* Right Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-8">
          {/* Active View Renderer */}
          {activeTopic === 'roles-overview' && <RoleOverviewView userRoles={userRoles} />}

          {activeTopic === 'capability-matrix' && (
            <CapabilityMatrixView userRoles={userRoles} initialSearch={globalSearch} />
          )}

          {activeTopic === 'sop-transfers' && <WorkflowGuidesView selectedGuideId="sop-transfers" />}
          {activeTopic === 'sop-waste' && <WorkflowGuidesView selectedGuideId="sop-waste" />}
          {activeTopic === 'sop-opname' && <WorkflowGuidesView selectedGuideId="sop-opname" />}
          {activeTopic === 'sop-binding' && <WorkflowGuidesView selectedGuideId="sop-binding" />}
          {activeTopic === 'sop-pos' && <WorkflowGuidesView selectedGuideId="sop-pos" />}
          {activeTopic === 'sop-return' && <WorkflowGuidesView selectedGuideId="sop-return" />}
          {activeTopic === 'sop-cashflow' && <WorkflowGuidesView selectedGuideId="sop-cashflow" />}
          {activeTopic === 'sop-payroll' && <WorkflowGuidesView selectedGuideId="sop-payroll" />}

          {activeTopic === 'shortcuts' && <ShortcutsView />}

          {activeTopic === 'hardware' && <HardwareGuideView />}

          {activeTopic === 'faq' && <FaqView profile={profile} userRoles={userRoles} />}

          {/* Dynamic Supabase Markdown Article */}
          {isDynamicTopic && dynamicArticle && <MarkdownDocView article={dynamicArticle} />}

          {isDynamicTopic && !dynamicArticle && (
            <div className="p-12 text-center rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-800 space-y-3">
              <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                Dokumen &ldquo;{activeTopic}&rdquo; tidak ditemukan atau belum dipublikasikan.
              </p>
              <button
                type="button"
                onClick={() => handleSelectTopic('roles-overview')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
              >
                <span>Kembali ke Beranda Bantuan</span>
              </button>
            </div>
          )}

          {/* Bottom Topic Navigation (Previous / Next Buttons) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-neutral-200 dark:border-neutral-800">
            {prevTopic ? (
              <button
                type="button"
                onClick={() => handleSelectTopic(prevTopic.id)}
                className="group flex w-full sm:w-auto items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-left shadow-xs transition-all hover:border-brand-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-neutral-800 dark:text-neutral-400">
                  <IconArrowLeft size={16} />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Topik Sebelumnya
                  </span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {prevTopic.title}
                  </span>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextTopic ? (
              <button
                type="button"
                onClick={() => handleSelectTopic(nextTopic.id)}
                className="group flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-right shadow-xs transition-all hover:border-brand-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <div>
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Topik Selanjutnya
                  </span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {nextTopic.title}
                  </span>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-neutral-800 dark:text-neutral-400">
                  <IconArrowRight size={16} />
                </div>
              </button>
            ) : (
              <div />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <React.Suspense fallback={<PageLoadingSpinner />}>
      <HelpContent />
    </React.Suspense>
  );
}
