'use client';

import React from 'react';
import {
  IconPackage,
  IconEdit,
  IconArrowsExchange,
  IconExternalLink,
  IconMapPin,
} from '@tabler/icons-react';
import { Button, Badge, ModernPagination } from '@/components/ui';
import { WarehouseItemStock, Gudang } from '@/types/warehouse';

interface StockDataSectionProps {
  stocksLoading: boolean;
  error: string | null;
  items: WarehouseItemStock[];
  activeGudang: Gudang | null;
  activeGudangId: string;
  hasActiveFilters: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onRefetch: () => void;
  onResetAllFilters: () => void;
  onOpenEdit: (item: WarehouseItemStock) => void;
  onNavigateTransfer: (barcode: string) => void;
  onNavigateCatalog: (query: string) => void;
}

export function StockDataSection({
  stocksLoading,
  error,
  items,
  activeGudang,
  hasActiveFilters,
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onRefetch,
  onResetAllFilters,
  onOpenEdit,
  onNavigateTransfer,
  onNavigateCatalog,
}: StockDataSectionProps) {
  return (
    <div className="flex-1">
      {stocksLoading ? (
        <div>
          <div className="shadow-elevated hidden overflow-hidden rounded-3xl border border-neutral-200/60 bg-white lg:block dark:border-neutral-800/60 dark:bg-neutral-900">
            <div className="border-b border-neutral-200/50 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800/50 dark:bg-neutral-950/50">
              <div className="h-5 w-44 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <table className="w-full">
              <thead className="bg-white/50 backdrop-blur-md dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <div className="ml-auto h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <div className="mx-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr
                    key={i}
                    className="border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="mx-auto h-6 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-neutral-200/60 bg-white/70 p-3.5 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60"
              >
                <div className="flex items-start justify-between">
                  <div className="w-2/3 space-y-2">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-neutral-100/50 p-2.5 dark:bg-neutral-800/40">
                  <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-danger-50/50 dark:bg-danger-900/20 border-danger-200/50 dark:border-danger-800/50 shadow-elevated rounded-3xl border py-12 text-center backdrop-blur-md">
          <p className="text-danger-600 dark:text-danger-400 font-medium">{error}</p>
          <button
            type="button"
            onClick={onRefetch}
            className="mt-4 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Coba Muat Ulang
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200/60 bg-white py-12 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900">
          <IconPackage
            size={56}
            className="mb-3 text-neutral-300 dark:text-neutral-600"
          />
          <p className="font-medium text-neutral-700 dark:text-neutral-300">
            Tidak ada data persediaan stok barang
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {hasActiveFilters
              ? 'Coba sesuaikan kata kunci pencarian atau reset filter'
              : `Belum ada saldo barang yang dialokasikan di ${activeGudang?.nama || 'gudang ini'}`}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="mt-4 cursor-pointer text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="shadow-elevated hidden overflow-auto rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-neutral-900/60">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Nama Barang
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Lokasi Rak / Bin
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Stok ({activeGudang?.kode_gudang || 'Gudang'})
                  </th>
                  <th
                    className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400"
                    title="Total akumulasi stok di semua gudang & cabang"
                  >
                    Total Stok Global
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Batas (Min/Max)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {items.map((row) => {
                  const isLow = row.stok_gudang <= (row.min_stok || 5);
                  const isZero = row.stok_gudang === 0;

                  return (
                    <tr
                      key={row.inventory_id}
                      className={`group transition-colors ${
                        isZero
                          ? 'bg-rose-50/20 hover:bg-rose-50/50 dark:bg-rose-950/10 dark:hover:bg-rose-950/30'
                          : isLow
                            ? 'bg-amber-50/20 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/30'
                            : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {row.kode_barcode}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {row.nama_barang}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.id_kategori ? (
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {row.id_kategori.nama}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                            row.rak_lokasi
                              ? 'border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300'
                              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          <IconMapPin size={13} className="shrink-0" />
                          {row.rak_lokasi || 'Belum diatur'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`text-sm font-bold ${
                              isZero
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLow
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-neutral-900 dark:text-white'
                            }`}
                          >
                            {row.stok_gudang} {row.unit || 'pcs'}
                          </span>
                          {isZero ? (
                            <Badge variant="danger" size="sm">
                              Habis
                            </Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="sm">
                              Menipis
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        {row.stok_global} {row.unit || 'pcs'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-neutral-500 dark:text-neutral-400">
                        Min: {row.min_stok || 0}
                        {row.max_stok ? ` • Max: ${row.max_stok}` : ''}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<IconEdit className="h-4 w-4" />}
                            onClick={() => onOpenEdit(row)}
                            title="Atur Lokasi Rak & Batas Stok"
                          >
                            Edit Rak
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<IconArrowsExchange className="h-4 w-4" />}
                            onClick={() => onNavigateTransfer(row.kode_barcode)}
                            title="Transfer Stok ke Cabang Lain"
                          >
                            Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<IconExternalLink className="h-4 w-4" />}
                            onClick={() =>
                              onNavigateCatalog(row.kode_barcode || row.nama_barang)
                            }
                            title="Lihat di Katalog Master"
                            aria-label={`Lihat ${row.nama_barang} di Katalog Master`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <ModernPagination
                page={page}
                totalPages={totalPages}
                total={totalCount}
                limit={limit}
                onPageChange={onPageChange}
                className="hidden rounded-none border-x-0 border-b-0 lg:flex"
              />
            )}
          </div>

          <div className="block space-y-3 lg:hidden">
            {items.map((row) => {
              const isLow = row.stok_gudang <= (row.min_stok || 5);
              const isZero = row.stok_gudang === 0;

              return (
                <div
                  key={row.inventory_id}
                  className={`group flex flex-col gap-2.5 rounded-2xl border p-3.5 shadow-sm backdrop-blur-xl transition-all duration-200 ${
                    isZero
                      ? 'border-rose-200/70 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20'
                      : isLow
                        ? 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                        : 'border-neutral-200/70 bg-white/80 dark:border-neutral-800/70 dark:bg-neutral-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-neutral-900 dark:text-white">
                          {row.nama_barang}
                        </h3>
                        {isZero ? (
                          <Badge variant="danger" size="sm">
                            Habis
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="warning" size="sm">
                            Menipis
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {row.kode_barcode}
                        </span>
                        {row.id_kategori && (
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {row.id_kategori.nama}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${
                        row.rak_lokasi
                          ? 'border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      <IconMapPin size={12} className="shrink-0" />
                      {row.rak_lokasi || 'Belum diatur'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100/60 p-2.5 text-xs dark:bg-neutral-800/50">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Stok {activeGudang?.kode_gudang || 'Gudang'}:
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isZero
                            ? 'text-rose-600 dark:text-rose-400'
                            : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-neutral-900 dark:text-white'
                        }`}
                      >
                        {row.stok_gudang} {row.unit || 'pcs'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span
                        className="text-[11px] text-neutral-500 dark:text-neutral-400"
                        title="Total akumulasi stok di semua gudang & cabang"
                      >
                        Total Stok Global:
                      </span>
                      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        {row.stok_global} {row.unit || 'pcs'}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-between border-t border-neutral-200/50 pt-1.5 text-[11px] text-neutral-500 dark:border-neutral-700/50 dark:text-neutral-400">
                      <span>
                        Batas Min:{' '}
                        <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                          {row.min_stok || 0}
                        </strong>
                      </span>
                      {row.max_stok && (
                        <span>
                          Batas Max:{' '}
                          <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                            {row.max_stok}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-neutral-100 pt-1 dark:border-neutral-800">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs"
                      leftIcon={<IconEdit size={14} />}
                      onClick={() => onOpenEdit(row)}
                    >
                      Edit Rak
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs"
                      leftIcon={<IconArrowsExchange size={14} />}
                      onClick={() => onNavigateTransfer(row.kode_barcode)}
                    >
                      Transfer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 px-2.5"
                      leftIcon={<IconExternalLink size={15} />}
                      onClick={() =>
                        onNavigateCatalog(row.kode_barcode || row.nama_barang)
                      }
                      title="Buka di Katalog"
                      aria-label={`Buka ${row.nama_barang} di Katalog`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <ModernPagination
              page={page}
              totalPages={totalPages}
              total={totalCount}
              limit={limit}
              onPageChange={onPageChange}
              className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:hidden"
            />
          )}
        </>
      )}
    </div>
  );
}
