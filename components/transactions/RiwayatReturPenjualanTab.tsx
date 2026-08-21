'use client';

import { useState, useEffect, useCallback } from 'react';
import { returnApi } from '@/lib/api/return';
import { formatCurrency, formatDateWIB, formatDateTimeWIB } from '@/lib/utils';
import { IconChevronRight } from '@tabler/icons-react';
import { ReturnTransactionModal } from '@/components/dashboard/ReturnTransactionModal';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { TransactionHistoryTable } from './TransactionHistoryTable';

interface ReturRecord {
  id: string;
  tanggal: string;
  total: number;
  created_at: string;
}

interface RiwayatReturPenjualanTabProps {
  search: string;
  startDate: string;
  endDate: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function RiwayatReturPenjualanTab({
  search,
  startDate,
  endDate,
  sortBy,
  sortDir,
}: RiwayatReturPenjualanTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleViewDetail = (id: string) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedId(null);
  };

  const formatDateTime = (dateStr: string) => {
    return formatDateTimeWIB(dateStr, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMobileCard = (record: ReturRecord, index: number) => (
    <div
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="cursor-pointer rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm transition-transform active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs text-neutral-500">
            {formatDateTime(record.created_at || record.tanggal)}
          </p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-medium text-neutral-900 dark:text-white">
              {record.id.slice(0, 8)}...
            </p>
            <span className="bg-accent-rose-100 text-accent-rose-700 dark:bg-accent-rose-900/30 dark:text-accent-rose-400 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold">
              Retur
            </span>
          </div>
        </div>
        <div className="p-1 text-neutral-400 dark:text-neutral-500">
          <IconChevronRight className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <div className="text-right">
          <p className="text-xs text-neutral-500">Total Nominal Retur</p>
          <p className="text-accent-rose-600 dark:text-accent-rose-400 font-bold">
            {formatCurrency(record.total)}
          </p>
        </div>
      </div>
    </div>
  );

  const renderTableHeader = () => (
    <tr>
      <th className="w-16 px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        #
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        ID Retur
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Tanggal & Waktu
      </th>
      <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Total Nominal Retur
      </th>
      <th className="w-32 px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Status
      </th>
    </tr>
  );

  const renderTableRow = (record: ReturRecord, index: number, pageOffset: number) => (
    <tr
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="group cursor-pointer transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
    >
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {pageOffset + index + 1}
      </td>
      <td className="px-5 py-4 font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {record.id.slice(0, 8)}...
      </td>
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {formatDateTime(record.created_at || record.tanggal)}
      </td>
      <td className="text-accent-rose-600 dark:text-accent-rose-400 px-5 py-4 text-right text-sm font-bold">
        {formatCurrency(record.total)}
      </td>
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="bg-accent-rose-100 text-accent-rose-700 dark:bg-accent-rose-900/30 dark:text-accent-rose-400 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold">
            Retur
          </span>
          <IconChevronRight className="group-hover:text-brand-500 h-4 w-4 text-neutral-400 transition-colors" />
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <TransactionHistoryTable<ReturRecord>
        fetchFn={returnApi.getAllPenjualanReturns}
        queryKeyPrefix={['retur_penjualan']}
        search={search}
        startDate={startDate}
        endDate={endDate}
        sortBy={sortBy}
        sortDir={sortDir}
        renderMobileCard={renderMobileCard}
        renderTableHeader={renderTableHeader}
        renderTableRow={renderTableRow}
      />

      <ReturnTransactionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        transactionId={selectedId}
        transactionType="penjualan_return"
      />
    </>
  );
}
