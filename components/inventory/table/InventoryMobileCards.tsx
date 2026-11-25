'use client';

import React from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { ModernPagination } from '@/components/ui';
import { InventoryPaginationProps } from './useInventoryTableState';

interface InventoryMobileCardsProps {
  items: InventoryItem[];
  canViewHPP: boolean;
  pagination?: InventoryPaginationProps;
  onOpenSlideOver: (item: InventoryItem) => void;
}

export function InventoryMobileCards({
  items,
  canViewHPP,
  pagination,
  onOpenSlideOver,
}: InventoryMobileCardsProps) {
  return (
    <>
      <div className="block space-y-2 lg:hidden">
        {items.map((item) => {
          const isLowStock = (item.stok ?? 0) <= (item.minimum_stock ?? 0);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenSlideOver(item)}
              className={`group flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border border-neutral-200/60 bg-white/70 p-3 text-left shadow-xs backdrop-blur-xl transition-all duration-200 hover:bg-neutral-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.98] dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80 ${
                item.is_discontinued ? 'opacity-60' : ''
              }`}
            >
              <div className="flex w-full items-start justify-between">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="line-clamp-1 text-sm font-bold text-neutral-900 dark:text-white">
                      {item.nama_barang}
                    </h3>
                    {item.is_discontinued && (
                      <span className="shrink-0 rounded bg-neutral-200 px-1 py-0.5 text-[9px] font-bold uppercase text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                        Discontinued
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      {item.kode_barcode}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {(typeof item.id_kategori === 'object'
                        ? item.id_kategori?.nama
                        : item.id_kategori) || '-'}
                    </span>
                  </div>
                </div>
                <div className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-neutral-400 transition-all group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-900/20 dark:group-hover:text-brand-400">
                  <IconChevronRight size={18} stroke={2.5} />
                </div>
              </div>

              <div className="mt-1 grid w-full grid-cols-2 gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-2 text-[13px] dark:border-neutral-800/60">
                {canViewHPP && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Beli
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(item.harga_beli_terakhir || 0)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Jual
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(item.harga_jual)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Diskon
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(item.diskon || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Total Stok
                  </span>
                  <span
                    className={`font-bold ${
                      isLowStock
                        ? 'text-accent-rose-600 dark:text-accent-rose-400'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {item.stok}{' '}
                    <span className="text-[10px] font-normal text-neutral-500">
                      /{item.minimum_stock}
                    </span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <ModernPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={pagination.onPageChange}
          className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:hidden"
        />
      )}
      {pagination &&
        pagination.totalPages <= 1 &&
        pagination.total !== undefined &&
        pagination.total > 0 && (
          <div className="py-3 text-center text-xs font-medium text-neutral-500 lg:hidden dark:text-neutral-400">
            Menampilkan seluruh {pagination.total} barang
          </div>
        )}
    </>
  );
}
