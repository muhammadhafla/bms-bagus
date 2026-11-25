'use client';

import React from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { ModernPagination } from '@/components/ui';
import { InventoryPaginationProps } from './useInventoryTableState';

interface InventoryDesktopTableProps {
  items: InventoryItem[];
  selectedIds: Set<string>;
  canViewHPP: boolean;
  pagination?: InventoryPaginationProps;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string, e: React.MouseEvent) => void;
  onOpenSlideOver: (item: InventoryItem) => void;
}

export function InventoryDesktopTable({
  items,
  selectedIds,
  canViewHPP,
  pagination,
  onToggleSelectAll,
  onToggleSelect,
  onOpenSlideOver,
}: InventoryDesktopTableProps) {
  return (
    <div className="shadow-elevated hidden overflow-auto rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-neutral-900/60">
      <table className="w-full min-w-[900px]">
        <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
          <tr>
            <th className="w-12 px-4 py-3 text-center">
              <input
                type="checkbox"
                aria-label="Pilih semua barang di halaman ini"
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:checked:bg-brand-500"
                checked={items.length > 0 && selectedIds.size === items.length}
                onChange={onToggleSelectAll}
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Barcode
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Nama Barang
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Kategori
            </th>
            {canViewHPP && (
              <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                Harga Beli
              </th>
            )}
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Harga Jual
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Diskon
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              <span
                className="inline-flex items-center justify-end gap-1"
                title="Total stok akumulasi di semua gudang & cabang"
              >
                Total Stok
              </span>
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Minimal Stok
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
          {items.map((item) => {
            const isLowStock = (item.stok ?? 0) <= (item.minimum_stock ?? 0);
            const isSelected = selectedIds.has(item.id);

            return (
              <tr
                key={item.id}
                onClick={() => onOpenSlideOver(item)}
                className={`group cursor-pointer transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60 ${
                  isSelected ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                } ${item.is_discontinued ? 'opacity-60' : ''}`}
              >
                <td
                  className="px-4 py-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${item.nama_barang}`}
                    className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800 dark:checked:bg-brand-500"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={(e) => onToggleSelect(item.id, e)}
                  />
                </td>
                <td className="px-4 py-3 font-mono text-sm text-neutral-600 dark:text-neutral-400">
                  {item.kode_barcode}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSlideOver(item);
                      }}
                      className="text-left font-medium hover:text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded dark:hover:text-brand-400"
                    >
                      {item.nama_barang}
                    </button>
                    {item.is_discontinued && (
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                        Discontinued
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {(typeof item.id_kategori === 'object'
                      ? item.id_kategori?.nama
                      : item.id_kategori) || '-'}
                  </span>
                </td>
                {canViewHPP && (
                  <td className="px-4 py-3 text-right font-mono text-sm text-neutral-600 dark:text-neutral-300">
                    {formatCurrency(item.harga_beli_terakhir || 0)}
                  </td>
                )}
                <td className="px-4 py-3 text-right font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(item.harga_jual)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-neutral-600 dark:text-neutral-300">
                  {formatCurrency(item.diskon || 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-bold ${
                      isLowStock
                        ? 'text-accent-rose-600 dark:text-accent-rose-400'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {item.stok}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-neutral-500 dark:text-neutral-400">
                  {item.minimum_stock}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSlideOver(item);
                    }}
                    aria-label={`Edit detail ${item.nama_barang}`}
                    className="inline-flex rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                  >
                    <IconChevronRight size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <ModernPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={pagination.onPageChange}
          className="rounded-none border-x-0 border-b-0"
        />
      )}
      {pagination &&
        pagination.totalPages <= 1 &&
        pagination.total !== undefined &&
        pagination.total > 0 && (
          <div className="border-t border-neutral-200/50 px-4 py-2.5 text-center text-xs font-medium text-neutral-500 dark:border-neutral-800/50 dark:text-neutral-400">
            Menampilkan seluruh {pagination.total} barang
          </div>
        )}
    </div>
  );
}
