'use client';

import React from 'react';
import {
  IconBuildingWarehouse,
  IconArrowsExchange,
  IconChevronDown,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import {
  Button,
  SelectInput,
  FilterButton,
} from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { Gudang } from '@/types/warehouse';
import { StockStatusFilter, RakStatusFilter } from '../_hooks/useWarehouseStocks';

interface StockHeaderSectionProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  gudangList: Gudang[];
  activeGudangId: string;
  onSelectGudang: (gudangId: string) => void;
  search: string;
  debouncedSearch: string;
  onSearchChange: (val: string) => void;
  stockStatus: StockStatusFilter;
  onStockStatusChange: (status: StockStatusFilter) => void;
  categoryId: string;
  onCategoryChange: (catId: string) => void;
  rakStatus: RakStatusFilter;
  onRakStatusChange: (rak: RakStatusFilter) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortDir: 'asc' | 'desc') => void;
  kategoriList: any[];
  activeFilterCount: number;
  hasActiveFilters: boolean;
  totalCount: number;
  isFilterOpen: boolean;
  onOpenFilter: () => void;
  onCloseFilter: () => void;
  onResetAll: () => void;
  onTransferNew: () => void;
}

export function StockHeaderSection({
  searchInputRef,
  gudangList,
  activeGudangId,
  onSelectGudang,
  search,
  debouncedSearch,
  onSearchChange,
  stockStatus,
  onStockStatusChange,
  categoryId,
  onCategoryChange,
  rakStatus,
  onRakStatusChange,
  sortBy,
  sortDir,
  onSortChange,
  kategoriList,
  activeFilterCount,
  hasActiveFilters,
  totalCount,
  isFilterOpen,
  onOpenFilter,
  onCloseFilter,
  onResetAll,
  onTransferNew,
}: StockHeaderSectionProps) {
  return (
    <>
      <div className="mb-4 lg:mb-6">
        <div className="mb-4 flex flex-row items-start justify-between gap-4 lg:mb-5 lg:items-center">
          <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
            <IconBuildingWarehouse
              className="h-6 w-6 shrink-0 text-brand-500 lg:h-8 lg:w-8"
              stroke={1.5}
            />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                Stok per Gudang
              </h1>
              <p className="mt-0.5 hidden text-xs font-medium text-neutral-500 md:block lg:mt-2 lg:text-base dark:text-neutral-400">
                Saldo stok fisik, penempatan rak/bin, dan mutasi barang antar outlet.
              </p>
            </div>
          </div>

          <div className="animate-fade-in-up flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                onStockStatusChange(stockStatus === 'low' ? 'all' : 'low')
              }
              className={`btn-press flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all sm:h-auto sm:px-4 sm:py-2 sm:text-sm ${
                stockStatus === 'low'
                  ? 'border-accent-rose-500 bg-accent-rose-500 text-white shadow-sm dark:border-accent-rose-600 dark:bg-accent-rose-600'
                  : 'border-accent-rose-200 bg-accent-rose-50 text-accent-rose-600 hover:bg-accent-rose-100 dark:border-accent-rose-800 dark:bg-accent-rose-950/40 dark:text-accent-rose-300 dark:hover:bg-accent-rose-900/60'
              }`}
              title="Filter hanya stok menipis (<= 5)"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${
                  stockStatus === 'low'
                    ? 'bg-white'
                    : 'animate-pulse bg-accent-rose-500'
                }`}
              />
              <span>
                <span className="hidden sm:inline">Stok Menipis</span>
                <span className="sm:hidden">Menipis</span>
              </span>
            </button>

            <Button
              variant="primary"
              onClick={onTransferNew}
              className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl !p-2 shadow-sm transition-shadow hover:shadow-md sm:h-auto sm:!px-4 sm:!py-2"
            >
              <IconArrowsExchange size={18} className="shrink-0" />
              <span className="hidden font-medium sm:inline">Transfer Stok</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div
            className="animate-fade-in-up flex w-full flex-col gap-2.5 sm:flex-row sm:items-center"
            style={{ animationDelay: '50ms' }}
          >
            <div className="w-full sm:w-72 sm:shrink-0">
              <div className="group relative flex items-center">
                <div className="pointer-events-none absolute left-3 z-10 text-brand-600 dark:text-brand-400">
                  <IconBuildingWarehouse size={18} stroke={1.8} />
                </div>
                <select
                  value={activeGudangId}
                  onChange={(e) => onSelectGudang(e.target.value)}
                  aria-label="Pilih Lokasi Gudang"
                  className="w-full cursor-pointer appearance-none rounded-xl border border-neutral-200/80 bg-white py-2.5 pl-9.5 pr-9 text-xs font-bold text-neutral-800 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-brand-500/30"
                >
                  {gudangList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} ({g.kode_gudang}){g.is_default ? ' ★ Default' : ''}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 text-neutral-400 transition-colors group-hover:text-neutral-600 dark:group-hover:text-neutral-200"
                />
              </div>
            </div>

            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconSearch size={18} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Cari nama barang atau barcode..."
                  aria-label="Cari nama barang atau barcode"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200/60 bg-white py-2.5 pl-9 pr-9 text-sm shadow-sm transition-all focus:border-brand-500 focus:shadow-brand focus:outline-none dark:border-neutral-800/60 dark:bg-neutral-900"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Hapus pencarian"
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-neutral-400 transition-transform hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-90 dark:hover:text-neutral-200"
                  >
                    <IconX size={16} />
                  </button>
                )}
              </div>

              <FilterButton
                onClick={onOpenFilter}
                activeCount={activeFilterCount}
                className="h-[42px] shrink-0"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div
              className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap py-1"
              style={{ animationDelay: '100ms' }}
            >
              {categoryId && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/50 dark:text-brand-300">
                  <span>
                    Kategori:{' '}
                    {kategoriList.find((k) => (k.id || k.nama) === categoryId)?.nama ||
                      categoryId}
                  </span>
                  <button
                    type="button"
                    aria-label="Hapus filter kategori"
                    onClick={() => onCategoryChange('')}
                    className="rounded-full text-brand-500 transition-transform hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-90 dark:hover:text-brand-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}

              {stockStatus !== 'all' && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-rose-200 bg-accent-rose-50 px-3 py-1 text-xs font-medium text-accent-rose-700 dark:border-accent-rose-800 dark:bg-accent-rose-950/40 dark:text-accent-rose-300">
                  <span>
                    {stockStatus === 'low'
                      ? 'Stok Menipis (<= 5)'
                      : stockStatus === 'empty'
                        ? 'Stok Habis (0)'
                        : 'Stok Tersedia (> 0)'}
                  </span>
                  <button
                    type="button"
                    aria-label="Hapus filter status stok"
                    onClick={() => onStockStatusChange('all')}
                    className="rounded-full text-accent-rose-500 transition-transform hover:text-accent-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-rose-500 active:scale-90 dark:hover:text-accent-rose-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}

              {rakStatus !== 'all' && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <span>
                    {rakStatus === 'unassigned'
                      ? 'Belum Diatur Rak'
                      : 'Sudah Ada Lokasi Rak'}
                  </span>
                  <button
                    type="button"
                    aria-label="Hapus filter status rak"
                    onClick={() => onRakStatusChange('all')}
                    className="rounded-full text-amber-500 transition-transform hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:scale-90 dark:hover:text-amber-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}

              {(sortBy !== 'updated_at' || sortDir !== 'desc') && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <span>
                    Urut:{' '}
                    {sortBy === 'nama_barang'
                      ? sortDir === 'asc'
                        ? 'Nama (A-Z)'
                        : 'Nama (Z-A)'
                      : sortBy === 'stok'
                        ? sortDir === 'asc'
                          ? 'Stok Terendah'
                          : 'Stok Tertinggi'
                        : sortBy === 'rak_lokasi'
                          ? 'Rak (A-Z)'
                          : 'Terbaru'}
                  </span>
                  <button
                    type="button"
                    aria-label="Hapus pengurutan"
                    onClick={() => onSortChange('updated_at', 'desc')}
                    className="rounded-full text-neutral-400 transition-transform hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 active:scale-90 dark:hover:text-neutral-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}

              {debouncedSearch && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <span>Pencarian: &quot;{debouncedSearch}&quot;</span>
                  <button
                    type="button"
                    aria-label="Hapus filter pencarian"
                    onClick={() => onSearchChange('')}
                    className="rounded-full text-neutral-400 transition-transform hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 active:scale-90 dark:hover:text-neutral-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onResetAll}
                className="ml-1 cursor-pointer rounded px-1 text-[11px] font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-400"
              >
                Reset Semua
              </button>

              <span className="ml-auto hidden text-[11px] text-neutral-400 sm:inline">
                Total: {totalCount} barang
              </span>
            </div>
          )}
        </div>
      </div>

      <ResponsivePanel
        isOpen={isFilterOpen}
        onClose={onCloseFilter}
        title="Filter Stok Gudang"
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Kategori Barang:
            </label>
            <SelectInput
              value={categoryId}
              onChange={(val) => onCategoryChange(val)}
              options={[
                { value: '', label: 'Semua Kategori' },
                ...kategoriList.map((k) => ({
                  value: k.id || k.nama,
                  label: k.nama,
                })),
              ]}
              placeholder="Semua Kategori"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Status Ketersediaan Stok:
            </label>
            <SelectInput
              value={stockStatus}
              onChange={(val) => onStockStatusChange(val as StockStatusFilter)}
              options={[
                { value: 'all', label: 'Semua Status Stok' },
                { value: 'low', label: 'Hanya Stok Menipis (<= 5 / Min)' },
                { value: 'empty', label: 'Stok Habis (0 pcs)' },
                { value: 'available', label: 'Stok Tersedia (> 0 pcs)' },
              ]}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Status Penempatan Rak / Bin:
            </label>
            <SelectInput
              value={rakStatus}
              onChange={(val) => onRakStatusChange(val as RakStatusFilter)}
              options={[
                { value: 'all', label: 'Semua Status Rak' },
                {
                  value: 'unassigned',
                  label: 'Belum Diatur (Perlu Penempatan Rak)',
                },
                { value: 'assigned', label: 'Sudah Memiliki Lokasi Rak' },
              ]}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Urutkan Berdasarkan:
            </label>
            <SelectInput
              value={`${sortBy}:${sortDir}`}
              onChange={(val) => {
                const [newSortBy, newSortDir] = val.split(':');
                onSortChange(newSortBy, newSortDir as 'asc' | 'desc');
              }}
              options={[
                {
                  value: 'updated_at:desc',
                  label: 'Terakhir Diperbarui: Terbaru',
                },
                { value: 'nama_barang:asc', label: 'Nama Barang (A ke Z)' },
                { value: 'nama_barang:desc', label: 'Nama Barang (Z ke A)' },
                {
                  value: 'stok:asc',
                  label: 'Sisa Stok Gudang: Paling Sedikit',
                },
                {
                  value: 'stok:desc',
                  label: 'Sisa Stok Gudang: Paling Banyak',
                },
                { value: 'rak_lokasi:asc', label: 'Lokasi Rak: A ke Z' },
              ]}
              className="w-full"
            />
          </div>

          <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button
              variant="secondary"
              className="w-1/2"
              onClick={onResetAll}
            >
              Reset Filter
            </Button>
            <Button variant="primary" className="w-1/2" onClick={onCloseFilter}>
              Terapkan
            </Button>
          </div>
        </div>
      </ResponsivePanel>
    </>
  );
}
