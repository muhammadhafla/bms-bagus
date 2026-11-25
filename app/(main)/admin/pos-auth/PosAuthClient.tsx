'use client';

import { usePosAuthData } from './_hooks/usePosAuthData';
import { PosActiveRequestsTab } from './_components/PosActiveRequestsTab';
import { PosHistoryTab } from './_components/PosHistoryTab';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api/client';
import { posAuthApi } from '@/lib/api/pos-auth';
import { PosAuthorization, PosAuthStatus } from '@/types/pos-auth';
import { formatCurrency, formatDateTimeWIB } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import { useHaptic } from '@/hooks/useHaptic';
import { toast } from 'sonner';
import {
  IconShieldLock,
  IconShieldCheck,
  IconCopy,
  IconBrandWhatsapp,
  IconX,
  IconArrowDown,
  IconClock,
  IconBuildingStore,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconHistory,
  IconSettings,
  IconTrash,
  IconTicket,
  IconArrowBack,
  IconArrowsExchange,
  IconArrowBackUp,
  IconLock,
  IconFileInvoice,
  IconShare,
  IconSparkles,
} from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FilterButton } from '@/components/ui/FilterButton';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { ModernPagination } from '@/components/ui/ModernPagination';
import SelectInput from '@/components/ui/SelectInput';
import { Spinner } from '@/components/ui';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  access_settings: {
    label: 'Pengaturan POS',
    icon: IconSettings,
    colorClass: 'text-blue-700 dark:text-blue-300',
    bgClass: 'bg-blue-100 dark:bg-blue-950/70 border-blue-200 dark:border-blue-900',
  },
  void_transaction: {
    label: 'Void Transaksi',
    icon: IconTrash,
    colorClass: 'text-rose-700 dark:text-rose-300',
    bgClass: 'bg-rose-100 dark:bg-rose-950/70 border-rose-200 dark:border-rose-900',
  },
  manual_discount: {
    label: 'Diskon Manual',
    icon: IconTicket,
    colorClass: 'text-amber-700 dark:text-amber-300',
    bgClass: 'bg-amber-100 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900',
  },
  price_override: {
    label: 'Ubah Harga Satuan',
    icon: IconFileInvoice,
    colorClass: 'text-purple-700 dark:text-purple-300',
    bgClass: 'bg-purple-100 dark:bg-purple-950/70 border-purple-200 dark:border-purple-900',
  },
  return_approval: {
    label: 'Retur Penjualan',
    icon: IconArrowBack,
    colorClass: 'text-emerald-700 dark:text-emerald-300',
    bgClass: 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900',
  },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'used', label: 'Digunakan' },
  { value: 'expired', label: 'Kedaluwarsa' },
  { value: 'rejected', label: 'Ditolak' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'Semua Tipe Aksi' },
  { value: 'access_settings', label: 'Pengaturan POS' },
  { value: 'void_transaction', label: 'Void Transaksi' },
  { value: 'manual_discount', label: 'Diskon Manual' },
  { value: 'price_override', label: 'Ubah Harga Satuan' },
  { value: 'return_approval', label: 'Retur Penjualan' },
];

export default function PosAuthClient() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const haptic = useHaptic();

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [historyStatus, setHistoryStatus] = useState<PosAuthStatus | 'all'>('all');
  const [historyActionType, setHistoryActionType] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Dialog State
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [takeoverConfirmId, setTakeoverConfirmId] = useState<{ id: string; ownerName: string } | null>(null);

  // Debounce search query (300ms)
  const {
    activeRequests,
    isLoadingActive,
    historyData,
    isLoadingHistory,
    handlePullRefresh,
    claimMutation,
    releaseMutation,
    takeoverMutation,
    rejectMutation,
    handleCopyPin,
    handleShareWhatsApp,
    activeFilterCount,
    totalHistoryCount,
    totalHistoryPages,
  } = usePosAuthData({
    queryClient,
    haptic,
    actionConfig: ACTION_CONFIG,
    activeTab,
    historyStatus,
    historyActionType,
    searchQuery,
    debouncedSearch,
    setDebouncedSearch,
    historyPage,
    setHistoryPage,
    setRejectConfirmId,
    setTakeoverConfirmId,
  });

  return (
    <PullToRefresh
      onRefresh={handlePullRefresh}
      pullingContent={
        <div className="flex items-center justify-center py-3 text-neutral-400">
          <IconArrowDown className="h-5 w-5 animate-bounce" />
        </div>
      }
      refreshingContent={
        <div className="flex items-center justify-center py-3">
          <Spinner size="sm" />
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 shadow-xs sm:h-11 sm:w-11 dark:bg-brand-500/20 dark:text-brand-400">
              <IconShieldLock className="h-5 w-5 sm:h-6 sm:w-6" stroke={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold tracking-tight text-neutral-900 sm:text-2xl dark:text-white">
                Otorisasi POS
              </h1>
              <p className="hidden text-xs text-neutral-500 sm:block sm:text-sm dark:text-neutral-400">
                Pusat penanganan otorisasi kasir (Pengaturan, Void, Diskon, Ubah Harga, Retur)
                dengan model Tarik Tugas.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-2xs sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Real-time Aktif</span>
          </div>
        </div>

        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveTab('active');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'active'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <span>Antrean</span>
            {activeRequests.length > 0 && (
              <span className="flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-extrabold text-white shadow-sm">
                {activeRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              haptic.light();
              setActiveTab('history');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            <IconHistory className="h-4 w-4" />
            <span>Riwayat</span>
          </button>
        </div>

        {activeTab === 'active' && (
          <PosActiveRequestsTab
            activeRequests={activeRequests}
            isLoading={isLoadingActive}
            currentUserId={profile?.id || ''}
            actionConfig={ACTION_CONFIG}
            onClaim={(id) => claimMutation.mutate(id)}
            onRelease={(id) => releaseMutation.mutate(id)}
            onTakeover={(id, ownerName) => setTakeoverConfirmId({ id, ownerName })}
            onCopyPin={handleCopyPin}
            onShareWa={handleShareWhatsApp}
            onReject={(id) => setRejectConfirmId(id)}
            claimingId={claimMutation.isPending ? claimMutation.variables ?? null : null}
            releasingId={releaseMutation.isPending ? releaseMutation.variables ?? null : null}
          />
        )}

        {activeTab === 'history' && (
          <PosHistoryTab
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            historyStatus={historyStatus}
            onStatusChange={setHistoryStatus}
            historyActionType={historyActionType}
            onActionTypeChange={setHistoryActionType}
            historyPage={historyPage}
            onPageChange={setHistoryPage}
            isFilterPanelOpen={isFilterPanelOpen}
            onSetFilterPanelOpen={setIsFilterPanelOpen}
            activeFilterCount={activeFilterCount}
            historyData={historyData}
            isLoading={isLoadingHistory}
            totalHistoryCount={totalHistoryCount}
            totalHistoryPages={totalHistoryPages}
            actionConfig={ACTION_CONFIG}
            statusOptions={STATUS_OPTIONS}
            actionTypeOptions={ACTION_TYPE_OPTIONS}
          />
        )}

        <ConfirmDialog
          isOpen={!!rejectConfirmId}
          title="Tolak Permohonan Otorisasi?"
          message="Permohonan ini akan dibatalkan seketika dan kode PIN tidak akan dapat digunakan oleh kasir."
          confirmLabel="Ya, Tolak Permohonan"
          cancelLabel="Batal"
          danger={true}
          onConfirm={() => {
            if (rejectConfirmId) rejectMutation.mutate(rejectConfirmId);
          }}
          onCancel={() => setRejectConfirmId(null)}
        />

        <ConfirmDialog
          isOpen={!!takeoverConfirmId}
          title="Ambil Alih Tugas Otorisasi?"
          message={`Tugas ini saat ini sedang ditangani oleh ${takeoverConfirmId?.ownerName}. Apakah Anda yakin ingin mengambil alih tanggung jawab pemberian PIN ke kasir?`}
          confirmLabel="Ya, Ambil Alih Tugas"
          cancelLabel="Batal"
          danger={false}
          onConfirm={() => {
            if (takeoverConfirmId) takeoverMutation.mutate(takeoverConfirmId.id);
          }}
          onCancel={() => setTakeoverConfirmId(null)}
        />
      </div>
    </PullToRefresh>
  );
}


