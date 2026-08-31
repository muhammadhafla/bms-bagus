'use client';

import { useState, useEffect, useCallback } from 'react';
import { penjualanApi } from '@/lib/api/penjualan';
import { formatCurrency, formatDateWIB, formatDateTimeWIB } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import { ModernPagination } from '@/components/ui';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { TransactionHistoryTable } from './TransactionHistoryTable';

interface PenjualanRecord {
  id: string;
  tanggal: string;
  total: number;
  payment_method?: string | null;
  cash_amount?: number | null;
  qris_amount?: number | null;
  kembalian?: number | null;
  created_at: string;
}

interface RiwayatPenjualanTabProps {
  search: string;
  startDate: string;
  endDate: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

function getPaymentMethodBadge(method?: string | null) {
  const m = (method || 'CASH').toUpperCase();
  if (m === 'CASH') {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
        Tunai
      </span>
    );
  }
  if (m === 'QRIS') {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400">
        QRIS
      </span>
    );
  }
  if (m === 'CASH_QRIS') {
    return (
      <span className="inline-flex items-center rounded-full border border-purple-200/60 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-400">
        Tunai + QRIS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {method || '-'}
    </span>
  );
}

export function RiwayatPenjualanTab({
  search,
  startDate,
  endDate,
  sortBy,
  sortDir,
}: RiwayatPenjualanTabProps) {
  const isAdminUser = useIsAdmin();

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

  const formatDate = (dateStr: string) => {
    return formatDateWIB(dateStr, { day: 'numeric', month: 'short', year: 'numeric' });
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

  const renderMobileCard = (record: PenjualanRecord, index: number) => (
    <div
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="cursor-pointer rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-sm transition-transform active:scale-[0.98] dark:border-neutral-800 dark:bg-neutral-900"
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
            <span className="bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold">
              Selesai
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getPaymentMethodBadge(record.payment_method)}
          <div className="p-1 text-neutral-400 dark:text-neutral-500">
            <IconChevronRight className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <div>
          {record.cash_amount != null && Number(record.cash_amount) > 0 ? (
            <div>
              <p className="text-xs text-neutral-500">Bayar Tunai</p>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                {formatCurrency(record.cash_amount)}
              </p>
              {record.kembalian != null && Number(record.kembalian) > 0 && (
                <p className="text-[11px] text-neutral-400">
                  Kembali: {formatCurrency(record.kembalian)}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-neutral-500">Metode</p>
              <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {record.payment_method === 'QRIS' ? 'QRIS' : '-'}
              </p>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">Total</p>
          <p className="font-bold text-neutral-900 dark:text-white">
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
        ID Transaksi
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Tanggal & Waktu
      </th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Metode
      </th>
      <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Bayar Tunai
      </th>
      <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Total
      </th>
      <th className="w-32 px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
        Status
      </th>
    </tr>
  );

  const renderTableRow = (record: PenjualanRecord, index: number, pageOffset: number) => (
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
      <td className="px-5 py-4 text-sm">
        {getPaymentMethodBadge(record.payment_method)}
      </td>
      <td className="px-5 py-4 text-right text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {record.cash_amount != null && Number(record.cash_amount) > 0 ? (
          <div>
            <span>{formatCurrency(record.cash_amount)}</span>
            {record.kembalian != null && Number(record.kembalian) > 0 && (
              <p className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                Kembali: {formatCurrency(record.kembalian)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-600">-</span>
        )}
      </td>
      <td className="px-5 py-4 text-right text-sm font-bold text-neutral-900 dark:text-neutral-100">
        {formatCurrency(record.total)}
      </td>
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold">
            Selesai
          </span>
          <IconChevronRight className="group-hover:text-brand-500 h-4 w-4 text-neutral-400 transition-colors" />
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <TransactionHistoryTable<PenjualanRecord>
        fetchFn={penjualanApi.getAll}
        queryKeyPrefix={['penjualan']}
        search={search}
        startDate={startDate}
        endDate={endDate}
        sortBy={sortBy}
        sortDir={sortDir}
        renderMobileCard={renderMobileCard}
        renderTableHeader={renderTableHeader}
        renderTableRow={renderTableRow}
      />

      {/* Rincian Penjualan Mini Receipt Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        transactionId={selectedId}
        transactionType="penjualan"
      />
    </>
  );
}
