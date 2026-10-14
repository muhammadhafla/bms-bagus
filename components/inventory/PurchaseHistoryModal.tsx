'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { ModernPagination } from '@/components/ui';
import { formatCurrency, formatDateWIB } from '@/lib/utils';
import { inventoryApi } from '@/lib/api';
import {
  IconHistory,
  IconCalendar,
  IconBuildingStore,
  IconHash,
  IconCash,
  IconChevronDown,
} from '@tabler/icons-react';

interface PurchaseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryId: string | null;
  itemName?: string;
  nested?: boolean;
}

export function PurchaseHistoryModal({
  isOpen,
  onClose,
  inventoryId,
  itemName,
  nested = false,
}: PurchaseHistoryModalProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchaseHistory', inventoryId, page],
    queryFn: () => {
      if (!inventoryId) return Promise.reject(new Error('No ID'));
      return inventoryApi.getPurchaseHistory(inventoryId, { page, limit });
    },
    enabled: !!inventoryId && isOpen,
  });

  const historyData = data?.data?.data || [];
  const totalPages = data?.data?.totalPages || 1;

  const formatDate = (dateString: string) => {
    return formatDateWIB(dateString, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const groupedHistory = useMemo(() => {
    const groups: { monthKey: string; items: any[] }[] = [];
    const map = new Map<string, any[]>();

    historyData.forEach((item: any) => {
      const monthKey = formatDateWIB(item.tanggal, { month: 'long', year: 'numeric' });
      if (!map.has(monthKey)) {
        map.set(monthKey, []);
        groups.push({ monthKey, items: map.get(monthKey)! });
      }
      map.get(monthKey)!.push(item);
    });

    return groups;
  }, [historyData]);

  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const isMonthExpanded = (monthKey: string, index: number) => {
    if (collapsedMonths[monthKey] !== undefined) {
      return !collapsedMonths[monthKey];
    }
    return index === 0; // Bulan terbaru otomatis terbuka
  };

  const toggleMonth = (monthKey: string, index: number) => {
    const currentlyOpen = isMonthExpanded(monthKey, index);
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: currentlyOpen,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemName ? `Riwayat Harga: ${itemName}` : 'Riwayat Harga Beli'}
      size="lg"
      isBottomSheetOnMobile
      nested={nested}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          </div>
        ) : error ? (
          <div className="text-accent-rose-500 py-8 text-center">
            <p>Gagal memuat data riwayat.</p>
          </div>
        ) : historyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500 dark:text-neutral-400">
            <IconHistory size={48} className="mb-4 opacity-20" />
            <p>Belum ada riwayat pembelian untuk barang ini.</p>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden overflow-auto rounded-2xl border border-neutral-200/60 bg-white/50 md:block dark:border-neutral-800/60 dark:bg-neutral-900/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-600 uppercase dark:bg-neutral-950/50 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 text-right font-semibold">Qty</th>
                    <th className="px-4 py-3 text-right font-semibold">Harga Beli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {historyData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                        {item.supplier_nama || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900 dark:text-neutral-100">
                        {item.qty}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(item.harga_beli)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View - Cardless Collapsible Monthly Timeline */}
            <div className="block md:hidden px-0.5 space-y-2.5">
              {groupedHistory.map((group, groupIdx) => {
                const isOpen = isMonthExpanded(group.monthKey, groupIdx);
                return (
                  <div
                    key={group.monthKey}
                    className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50/50 dark:border-neutral-800/60 dark:bg-neutral-900/40"
                  >
                    {/* Month Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleMonth(group.monthKey, groupIdx)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-neutral-100/70 active:bg-neutral-200/60 dark:hover:bg-neutral-800/60 dark:active:bg-neutral-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          {group.monthKey}
                        </span>
                        <span className="rounded-full bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {group.items.length} transaksi
                        </span>
                      </div>
                      <IconChevronDown
                        size={16}
                        className={`text-neutral-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Timeline Rows (Cardless) */}
                    {isOpen && (
                      <div className="relative border-t border-neutral-100/80 px-3 py-2.5 before:absolute before:bottom-3 before:left-[19px] before:top-3 before:w-px before:bg-neutral-200 dark:border-neutral-800/60 dark:before:bg-neutral-800">
                        <div className="space-y-3">
                          {group.items.map((item: any) => (
                            <div key={item.id} className="relative flex items-center justify-between pl-5">
                              {/* Timeline Dot */}
                              <div className="absolute left-[3px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand-500 shadow-xs ring-2 ring-neutral-50 dark:bg-brand-500 dark:ring-neutral-900" />

                              {/* Tanggal & Supplier */}
                              <div className="flex min-w-0 flex-1 flex-col pr-2">
                                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                  {formatDateWIB(item.tanggal, { day: '2-digit', month: 'short' })}
                                </span>
                                <span
                                  className="truncate text-[11px] text-neutral-500 dark:text-neutral-400"
                                  title={item.supplier_nama || 'Tanpa Supplier'}
                                >
                                  {item.supplier_nama || 'Tanpa Supplier'}
                                </span>
                              </div>

                              {/* Harga & Qty */}
                              <div className="flex shrink-0 flex-col items-end">
                                <span className="text-xs font-bold text-brand-600 tabular-nums dark:text-brand-400">
                                  {formatCurrency(item.harga_beli)}
                                </span>
                                <span className="mt-0.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                  {item.qty} pcs
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <ModernPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
