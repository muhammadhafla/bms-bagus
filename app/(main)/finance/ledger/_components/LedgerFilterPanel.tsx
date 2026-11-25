'use client';

import React from 'react';
import { IconSearch, IconX, IconFilter } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button, SelectInput, DateRangePicker, FilterButton } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { LedgerTipe, LedgerSumber } from '@/lib/api/ledger';
import { Gudang } from '@/types/warehouse';

interface LedgerFilterPanelProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  dateRange: { startDate: string; endDate: string };
  onDateRangeChange: (start: string, end: string) => void;
  selectedTipe: LedgerTipe | '';
  onClearTipe: () => void;
  selectedSumber: LedgerSumber | '';
  onClearSumber: () => void;
  selectedGudangId: string;
  onClearGudang: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  isFilterOpen: boolean;
  onOpenFilter: () => void;
  onCloseFilter: () => void;
  tempGudangId: string;
  onTempGudangChange: (val: string) => void;
  tempSumber: LedgerSumber | '';
  onTempSumberChange: (val: LedgerSumber | '') => void;
  gudangList: Gudang[];
  onResetDrawer: () => void;
  onApplyDrawer: () => void;
}

export function LedgerFilterPanel({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  selectedTipe,
  onClearTipe,
  selectedSumber,
  onClearSumber,
  selectedGudangId,
  onClearGudang,
  hasActiveFilters,
  onResetFilters,
  isFilterOpen,
  onOpenFilter,
  onCloseFilter,
  tempGudangId,
  onTempGudangChange,
  tempSumber,
  onTempSumberChange,
  gudangList,
  onResetDrawer,
  onApplyDrawer,
}: LedgerFilterPanelProps) {
  const startDateStr = dateRange.startDate;
  const endDateStr = dateRange.endDate;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2.5 print:hidden">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari transaksi atau keterangan..."
              aria-label="Cari transaksi atau keterangan"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-200/80 bg-white py-2 pl-9 pr-9 text-xs text-neutral-800 placeholder-neutral-400 shadow-sm focus:border-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:py-2.5 sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
            />
            <IconSearch
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-neutral-400 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-neutral-200"
              >
                <IconX size={15} />
              </button>
            )}
          </div>

          <div className="w-full shrink-0 sm:w-64">
            <DateRangePicker
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={onDateRangeChange}
            />
          </div>

          <FilterButton
            onClick={onOpenFilter}
            activeCount={(selectedSumber ? 1 : 0) + (selectedGudangId ? 1 : 0)}
            className="sm:h-[42px]"
          />
        </div>

        {hasActiveFilters && (
          <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap py-1">
            <div className="flex shrink-0 items-center gap-1.5 pr-1 text-xs text-neutral-400">
              <IconFilter size={14} className="text-brand-500" />
              <span>Filter aktif:</span>
            </div>

            {startDateStr && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                <span>
                  Periode: {format(new Date(startDateStr), 'dd/MM/yy', { locale: localeId })}{' '}
                  {endDateStr ? `- ${format(new Date(endDateStr), 'dd/MM/yy', { locale: localeId })}` : ''}
                </span>
                <button
                  type="button"
                  aria-label="Hapus filter periode"
                  onClick={() => onDateRangeChange('', '')}
                  className="text-neutral-400 transition-colors hover:text-rose-500"
                >
                  <IconX size={13} />
                </button>
              </div>
            )}

            {selectedGudangId && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                <span>
                  Lokasi:{' '}
                  {gudangList.find((g) => g.id === selectedGudangId)?.nama ||
                    selectedGudangId}
                </span>
                <button
                  type="button"
                  aria-label="Hapus filter lokasi"
                  onClick={onClearGudang}
                  className="text-neutral-400 transition-colors hover:text-rose-500"
                >
                  <IconX size={13} />
                </button>
              </div>
            )}

            {selectedTipe && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                <span>
                  Tipe: {selectedTipe === 'PEMASUKAN' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
                <button
                  type="button"
                  aria-label="Hapus filter tipe"
                  onClick={onClearTipe}
                  className="text-neutral-400 transition-colors hover:text-rose-500"
                >
                  <IconX size={13} />
                </button>
              </div>
            )}

            {selectedSumber && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                <span>Sumber: {selectedSumber.replace(/_/g, ' ')}</span>
                <button
                  type="button"
                  aria-label="Hapus filter sumber"
                  onClick={onClearSumber}
                  className="text-neutral-400 transition-colors hover:text-rose-500"
                >
                  <IconX size={13} />
                </button>
              </div>
            )}

            {searchTerm && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/60 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300">
                <span>Cari: &quot;{searchTerm}&quot;</span>
                <button
                  type="button"
                  aria-label="Hapus pencarian"
                  onClick={() => onSearchChange('')}
                  className="text-neutral-400 transition-colors hover:text-rose-500"
                >
                  <IconX size={13} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onResetFilters}
              className="ml-1 shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline dark:text-rose-400"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      <ResponsivePanel
        isOpen={isFilterOpen}
        onClose={onCloseFilter}
        title="Filter Buku Besar"
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Lokasi Toko / Gudang:
            </label>
            <SelectInput
              value={tempGudangId}
              onChange={(val) => onTempGudangChange(val)}
              options={[
                { label: 'Semua Lokasi / Outlet', value: '' },
                ...gudangList.map((g) => ({
                  label: `${g.nama} (${g.kode_gudang})`,
                  value: g.id,
                })),
              ]}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Kategori / Sumber Transaksi:
            </label>
            <SelectInput
              value={tempSumber}
              onChange={(val) => onTempSumberChange(val as LedgerSumber | '')}
              options={[
                { label: 'Semua Sumber', value: '' },
                { label: 'Penjualan Shift Kasir', value: 'PENJUALAN_SHIFT' },
                { label: 'Pembelian Stok (Kulakan)', value: 'PEMBELIAN_STOK' },
                { label: 'Biaya Operasional', value: 'BIAYA_OPERASIONAL' },
                {
                  label: 'Beban Susut Gudang (Rusak/Expired)',
                  value: 'BEBAN_SUSUT_GUDANG',
                },
                { label: 'Pencairan Kasbon', value: 'KASBON' },
                { label: 'Pembayaran Gaji / EWA', value: 'GAJI' },
                { label: 'Retur Penjualan', value: 'RETUR_PENJUALAN' },
                { label: 'Modal / Penyesuaian Kas', value: 'MODAL' },
                { label: 'Lain-lain', value: 'LAIN_LAIN' },
              ]}
              className="w-full"
            />
          </div>

          <div className="mt-8 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button
              variant="secondary"
              className="w-1/2"
              onClick={onResetDrawer}
            >
              Reset
            </Button>
            <Button variant="primary" className="w-1/2" onClick={onApplyDrawer}>
              Terapkan
            </Button>
          </div>
        </div>
      </ResponsivePanel>
    </>
  );
}
