'use client';

import React from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { PosAuthorization, PosAuthStatus } from '@/types/pos-auth';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { SelectInput } from '@/components/ui/SelectInput';
import { FilterButton } from '@/components/ui/FilterButton';
import { ModernPagination } from '@/components/ui/ModernPagination';
import { Spinner } from '@/components/ui';
import { formatDateTimeWIB } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { PosActionConfigItem } from '../_hooks/usePosAuthData';
import { ActionBadge, MetadataSummary, StatusBadge } from './PosAuthBadges';

interface PosHistoryTabProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  historyStatus: PosAuthStatus | 'all';
  onStatusChange: (status: PosAuthStatus | 'all') => void;
  historyActionType: string;
  onActionTypeChange: (actionType: string) => void;
  historyPage: number;
  onPageChange: (page: number) => void;
  isFilterPanelOpen: boolean;
  onSetFilterPanelOpen: (open: boolean) => void;
  activeFilterCount: number;
  historyData?: { data: PosAuthorization[]; count: number };
  isLoading: boolean;
  totalHistoryCount: number;
  totalHistoryPages: number;
  actionConfig: Record<string, PosActionConfigItem>;
  statusOptions: Array<{ value: string; label: string }>;
  actionTypeOptions: Array<{ value: string; label: string }>;
}

export function PosHistoryTab({
  searchQuery,
  onSearchChange,
  historyStatus,
  onStatusChange,
  historyActionType,
  onActionTypeChange,
  historyPage,
  onPageChange,
  isFilterPanelOpen,
  onSetFilterPanelOpen,
  activeFilterCount,
  historyData,
  isLoading,
  totalHistoryCount,
  totalHistoryPages,
  actionConfig,
  statusOptions,
  actionTypeOptions,
}: PosHistoryTabProps) {
  const haptic = useHaptic();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex w-full flex-row items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <IconSearch size={18} />
            </div>
            <input
              type="text"
              placeholder="Cari nama kasir, penangan, outlet, atau nomor nota..."
              aria-label="Cari riwayat otorisasi"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200/60 bg-white py-2.5 pl-9 pr-9 text-sm shadow-2xs transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-base dark:border-neutral-800/60 dark:bg-neutral-900 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  onSearchChange('');
                }}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          <FilterButton
            onClick={() => {
              haptic.light();
              onSetFilterPanelOpen(true);
            }}
            activeCount={activeFilterCount}
            className="h-11 sm:h-11"
          />
        </div>

        {activeFilterCount > 0 && (
          <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap py-1">
            {historyStatus !== 'all' && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <span>
                  Status:{' '}
                  {historyStatus === 'used'
                    ? 'Digunakan'
                    : historyStatus === 'expired'
                      ? 'Kedaluwarsa'
                      : 'Ditolak'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    onStatusChange('all');
                    onPageChange(1);
                  }}
                  aria-label="Hapus filter status"
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}

            {historyActionType !== 'all' && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <span>
                  Aksi: {actionConfig[historyActionType]?.label || historyActionType}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    onActionTypeChange('all');
                    onPageChange(1);
                  }}
                  aria-label="Hapus filter tipe aksi"
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                haptic.light();
                onStatusChange('all');
                onActionTypeChange('all');
                onPageChange(1);
              }}
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      <ResponsivePanel
        isOpen={isFilterPanelOpen}
        onClose={() => onSetFilterPanelOpen(false)}
        title="Filter Riwayat Otorisasi"
      >
        <div className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Status Otorisasi:
            </label>
            <SelectInput
              value={historyStatus}
              onChange={(val) => {
                onStatusChange(val as PosAuthStatus | 'all');
                onPageChange(1);
              }}
              options={statusOptions}
              clearable={false}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Tipe Aksi Kasir:
            </label>
            <SelectInput
              value={historyActionType}
              onChange={(val) => {
                onActionTypeChange(val);
                onPageChange(1);
              }}
              options={actionTypeOptions}
              clearable={false}
              className="w-full"
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onSetFilterPanelOpen(false)}
              className="w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98] dark:bg-brand-500"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </ResponsivePanel>

      <div className="block space-y-3 sm:hidden">
        {isLoading ? (
          [1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-36 animate-pulse rounded-2xl border border-neutral-200/60 bg-neutral-100/70 p-3.5 dark:border-neutral-800/60 dark:bg-neutral-800/40"
            />
          ))
        ) : !historyData?.data || historyData.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200/70 bg-white/50 p-8 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/30">
            Tidak ada riwayat permohonan yang sesuai filter.
          </div>
        ) : (
          historyData.data.map((item) => (
            <HistoryMobileCard key={item.id} item={item} actionConfig={actionConfig} />
          ))
        )}
      </div>

      <div className="shadow-elevated hidden overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/70 backdrop-blur-xl sm:block dark:border-neutral-800/70 dark:bg-neutral-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-neutral-50/80 font-bold text-neutral-600 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/80 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3.5">Waktu Pengajuan</th>
                <th className="px-4 py-3.5">Tipe Aksi</th>
                <th className="px-4 py-3.5">Kasir & Lokasi</th>
                <th className="px-4 py-3.5">Konteks / Alasan</th>
                <th className="px-4 py-3.5">Penanggung Jawab</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Waktu Eksekusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <Spinner size="sm" />
                      <span>Memuat riwayat otorisasi...</span>
                    </div>
                  </td>
                </tr>
              ) : !historyData?.data || historyData.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                    Tidak ada riwayat permohonan ditemukan.
                  </td>
                </tr>
              ) : (
                historyData.data.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-neutral-700 dark:text-neutral-300">
                      {formatDateTimeWIB(item.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <ActionBadge actionType={item.action_type} actionConfig={actionConfig} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {item.cashier_name}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {item.gudang_name || 'Toko Utama'}{' '}
                        {item.device_name ? `• ${item.device_name}` : ''}
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-3.5">
                      <MetadataSummary metadata={item.action_metadata} />
                    </td>
                    <td className="px-4 py-3.5 font-medium text-neutral-800 dark:text-neutral-200">
                      {item.status === 'rejected' ? (
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          Ditolak: {item.rejected_by_name || 'Admin'}
                        </span>
                      ) : item.claimed_by_name ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {item.claimed_by_name}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-neutral-500 dark:text-neutral-400">
                      {item.used_at ? formatDateTimeWIB(item.used_at) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModernPagination
        page={historyPage}
        totalPages={totalHistoryPages}
        total={totalHistoryCount}
        limit={15}
        onPageChange={(p) => {
          haptic.light();
          onPageChange(p);
        }}
      />
    </div>
  );
}

function HistoryMobileCard({
  item,
  actionConfig,
}: {
  item: PosAuthorization;
  actionConfig: Record<string, PosActionConfigItem>;
}) {
  return (
    <div className="group flex flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white/70 p-3.5 shadow-xs backdrop-blur-xl transition-all duration-200 active:scale-[0.99] dark:border-neutral-800/60 dark:bg-neutral-900/60">
      <div className="flex items-start justify-between gap-2">
        <div>
          <ActionBadge actionType={item.action_type} actionConfig={actionConfig} />
          <div className="mt-1 text-[11px] font-medium text-neutral-400">
            {formatDateTimeWIB(item.created_at)}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {item.cashier_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-neutral-900 dark:text-white">
            {item.cashier_name}
          </div>
          <div className="truncate text-[11px] text-neutral-400">
            {item.gudang_name || 'Toko Utama'}{' '}
            {item.device_name ? `• ${item.device_name}` : ''}
          </div>
        </div>
      </div>

      {item.action_metadata && Object.keys(item.action_metadata).length > 0 && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-2 text-xs dark:border-neutral-800/60 dark:bg-neutral-800/40">
          <MetadataSummary metadata={item.action_metadata} />
        </div>
      )}

      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-2 text-[12px] dark:border-neutral-800/60">
        <div className="flex flex-col">
          <span className="text-[11px] text-neutral-400">Penanggung Jawab</span>
          <span className="truncate font-semibold text-neutral-800 dark:text-neutral-200">
            {item.status === 'rejected'
              ? `Ditolak: ${item.rejected_by_name || 'Admin'}`
              : item.claimed_by_name || '-'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-neutral-400">Waktu Eksekusi</span>
          <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">
            {item.used_at ? formatDateTimeWIB(item.used_at) : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
