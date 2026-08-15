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
}

export function PurchaseHistoryModal({
  isOpen,
  onClose,
  inventoryId,
  itemName,
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

            {/* Mobile View */}
            <div className="block space-y-3 md:hidden">
              {historyData.map((item: any) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900"
                >
                  <div className="flex items-start justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                      <IconCalendar size={16} />
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {formatDate(item.tanggal)}
                      </span>
                    </div>
                    <div className="text-brand-600 dark:text-brand-400 flex items-center gap-2 font-semibold">
                      <span>{formatCurrency(item.harga_beli)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                      <IconBuildingStore size={16} className="text-neutral-400" />
                      <span className="max-w-[150px] truncate">{item.supplier_nama || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                      <IconHash size={16} className="text-neutral-400" />
                      <span className="font-medium">{item.qty} pcs</span>
                    </div>
                  </div>
                </div>
              ))}
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
