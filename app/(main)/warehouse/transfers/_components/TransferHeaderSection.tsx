'use client';

import React from 'react';
import {
  IconTruckDelivery,
  IconPlus,
  IconSearch,
  IconX,
  IconScan,
  IconBuildingWarehouse,
  IconChevronDown,
  IconList,
  IconFileText,
  IconCheck,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/Button';
import { FilterButton } from '@/components/ui/FilterButton';
import { Tabs } from '@/components/ui/Tabs';
import { Gudang } from '@/types/warehouse';
import { TRANSFER_STATUS_CONFIG } from './TransferStatusBadge';
import { TransferTabStatus } from '../_hooks/useWarehouseTransfers';

interface TransferHeaderSectionProps {
  onNewTransfer: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  onSearchChange: (val: string) => void;
  onOpenScanner: () => void;
  isRestrictedBranchUser: boolean;
  userAssignedWarehouse: Gudang | null;
  warehouses: Gudang[];
  selectedGudangId: string;
  onSelectGudang: (val: string) => void;
  effectiveGudangId: string;
  selectedWarehouseObj?: Gudang;
  activeTab: TransferTabStatus;
  onTabChange: (tab: TransferTabStatus) => void;
  startDate: string;
  endDate: string;
  onClearDates: () => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
  onResetFilters: () => void;
}

export function TransferHeaderSection({
  onNewTransfer,
  searchInputRef,
  search,
  onSearchChange,
  onOpenScanner,
  isRestrictedBranchUser,
  userAssignedWarehouse,
  warehouses,
  selectedGudangId,
  onSelectGudang,
  effectiveGudangId,
  selectedWarehouseObj,
  activeTab,
  onTabChange,
  startDate,
  endDate,
  onClearDates,
  activeFilterCount,
  onOpenFilter,
  onResetFilters,
}: TransferHeaderSectionProps) {
  return (
    <>
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
          <IconTruckDelivery
            className="h-6 w-6 shrink-0 text-brand-600 lg:h-8 lg:w-8 dark:text-brand-400"
            stroke={1.5}
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
              Mutasi & Transfer Stok
            </h1>
            <p className="mt-0.5 hidden text-xs font-medium text-neutral-500 md:block lg:mt-2 lg:text-base dark:text-neutral-400">
              Distribusi stok fisik antar cabang, pelacakan in-transit, dan verifikasi penerimaan.
            </p>
          </div>
        </div>

        <div className="animate-fade-in-up hidden shrink-0 items-center gap-2 sm:flex">
          <Button
            variant="primary"
            leftIcon={<IconPlus className="h-4 w-4" />}
            onClick={onNewTransfer}
            className="h-10 whitespace-nowrap sm:h-auto"
          >
            Transfer Baru
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div
          className="animate-fade-in-up flex w-full flex-row items-center gap-2"
          style={{ animationDelay: '50ms' }}
        >
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <IconSearch size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari transfer / kurir... (Ctrl+K)"
              aria-label="Cari dokumen transfer atau kurir"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-10 w-full rounded-xl border border-neutral-200/60 bg-white pl-9 pr-24 text-sm shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:h-[46px] sm:pr-28 sm:text-base dark:border-neutral-800/60 dark:bg-neutral-900"
            />

            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Hapus teks pencarian"
                  className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-neutral-800"
                >
                  <IconX size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={onOpenScanner}
                title="Pindai barcode surat jalan via kamera"
                aria-label="Pindai barcode surat jalan via kamera"
                className="flex items-center gap-1 rounded-lg border border-brand-200/80 bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700 transition-all hover:bg-brand-100 active:scale-95 sm:px-2.5 sm:py-1.5 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
              >
                <IconScan size={16} className="text-brand-600 dark:text-brand-400" />
                <span>Scan</span>
              </button>
            </div>
          </div>

          {isRestrictedBranchUser ? (
            <div
              className="hidden h-[46px] shrink-0 items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50/90 px-3.5 text-xs font-semibold text-neutral-700 shadow-sm lg:flex dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300"
              title={userAssignedWarehouse?.nama || 'Cabang Penugasan'}
            >
              <IconBuildingWarehouse
                size={16}
                className="shrink-0 text-brand-600 dark:text-brand-400"
              />
              <span className="max-w-[200px] truncate">
                Cabang: {userAssignedWarehouse?.nama || 'Terkunci'}
              </span>
            </div>
          ) : (
            <div className="hidden w-64 shrink-0 lg:block">
              <div className="relative">
                <select
                  value={selectedGudangId}
                  onChange={(e) => onSelectGudang(e.target.value)}
                  aria-label="Pilih filter gudang"
                  className="w-full appearance-none rounded-xl border border-neutral-200/60 bg-white py-3 pl-9 pr-8 text-xs font-semibold text-neutral-800 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800/60 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <option value="">Semua Gudang (Cabang/Pusat)</option>
                  {warehouses.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} ({g.kode_gudang})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconBuildingWarehouse size={16} />
                </div>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconChevronDown size={14} />
                </div>
              </div>
            </div>
          )}

          <FilterButton
            onClick={onOpenFilter}
            activeCount={activeFilterCount}
            className="!mr-0 !mt-0 !h-10 !w-10 sm:!h-[46px] sm:!w-auto"
          />

          <Button
            variant="primary"
            onClick={onNewTransfer}
            title="Transfer Baru"
            aria-label="Buat Transfer Baru"
            className="relative flex !h-10 !min-h-0 !w-10 shrink-0 items-center justify-center rounded-xl !p-0 sm:hidden min-[400px]:!w-auto min-[400px]:!px-3.5"
          >
            <IconPlus size={18} className="shrink-0" />
            <span className="ml-1 hidden whitespace-nowrap text-xs font-semibold min-[400px]:inline">
              Baru
            </span>
          </Button>
        </div>

        {(activeFilterCount > 0 || search) && (
          <div
            className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap py-1"
            style={{ animationDelay: '100ms' }}
          >
            {activeTab !== 'ALL' && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
                Status: {TRANSFER_STATUS_CONFIG[activeTab]?.label || activeTab}
                <button
                  type="button"
                  onClick={() => onTabChange('ALL')}
                  aria-label="Hapus filter status"
                  className="text-brand-400 transition-colors hover:text-brand-600 dark:hover:text-brand-200"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}
            {effectiveGudangId && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Gudang:{' '}
                {selectedWarehouseObj?.nama || userAssignedWarehouse?.nama || 'Terpilih'}
                {!isRestrictedBranchUser && (
                  <button
                    type="button"
                    onClick={() => onSelectGudang('')}
                    aria-label="Hapus filter gudang"
                    className="text-blue-400 transition-colors hover:text-blue-600 dark:hover:text-blue-200"
                  >
                    <IconX size={14} />
                  </button>
                )}
              </div>
            )}
            {(startDate || endDate) && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Tanggal: {startDate || '...'} s/d {endDate || '...'}
                <button
                  type="button"
                  onClick={onClearDates}
                  aria-label="Hapus filter tanggal"
                  className="text-amber-400 transition-colors hover:text-amber-600 dark:hover:text-amber-200"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}
            {search && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Pencarian: &quot;{search}&quot;
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Hapus pencarian aktif"
                  className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <IconX size={14} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onResetFilters}
              className="ml-1 text-xs text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <Tabs
          activeId={activeTab}
          onChange={(tab) => onTabChange(tab as TransferTabStatus)}
          items={[
            { id: 'ALL', label: 'Semua Status', icon: <IconList className="h-4 w-4" /> },
            {
              id: 'IN_TRANSIT',
              label: 'Dalam Pengiriman',
              icon: <IconTruckDelivery className="h-4 w-4" />,
            },
            { id: 'DRAFT', label: 'Draft', icon: <IconFileText className="h-4 w-4" /> },
            {
              id: 'RECEIVED',
              label: 'Selesai Diterima',
              icon: <IconCheck className="h-4 w-4" />,
            },
            { id: 'CANCELED', label: 'Dibatalkan', icon: <IconX className="h-4 w-4" /> },
          ]}
        />
      </div>
    </>
  );
}
