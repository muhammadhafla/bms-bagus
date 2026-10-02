'use client';

import React, { useState } from 'react';
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

            {/* Mobile View - Timeline Style */}
            <div className="block md:hidden px-1 pt-1">
              <div className="relative pl-6 space-y-6 before:absolute before:inset-y-1.5 before:left-[9px] before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
                {historyData.map((item: any, idx: number) => (
                  <div key={item.id} className="relative">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white bg-brand-500 shadow-sm dark:ring-neutral-950 dark:bg-brand-500" />
                    
                    {/* Content */}
                    <div className="flex items-start justify-between bg-white dark:bg-neutral-900 rounded-xl p-3 shadow-sm border border-neutral-100 dark:border-neutral-800/60 ml-1">
                      <div className="flex flex-col pr-2 min-w-0">
                        <span className="text-[10px] font-bold tracking-widest text-neutral-400 dark:text-neutral-500 uppercase">
                          {formatDate(item.tanggal)}
                        </span>
                        <span className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {item.supplier_nama || 'Tanpa Supplier'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-3">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                          {formatCurrency(item.harga_beli)}
                        </span>
                        <span className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                          {item.qty} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
