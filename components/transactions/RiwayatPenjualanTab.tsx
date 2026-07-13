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
  created_at: string;
}

interface RiwayatPenjualanTabProps {
  search: string;
  startDate: string;
  endDate: string;
}

export function RiwayatPenjualanTab({ search, startDate, endDate }: RiwayatPenjualanTabProps) {
  const [records, setRecords] = useState<PenjualanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdminUser = useIsAdmin();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const limit = 10;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * limit;
    const result = await penjualanApi.getAll({ 
      limit, 
      offset, 
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
    if (!result.error && result.data) {
      setRecords(result.data as PenjualanRecord[]);
      setTotal(result.total || 0);
    }
    setLoading(false);
  }, [page, search, startDate, endDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
    return formatDateTimeWIB(dateStr, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderMobileCard = (record: PenjualanRecord, index: number) => (
    <div
      key={record.id}
      onClick={() => handleViewDetail(record.id)}
      className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-neutral-500 mb-1">{formatDateTime(record.created_at || record.tanggal)}</p>
          <div className="flex items-center gap-2">
            <p className="font-mono font-medium text-neutral-900 dark:text-white">
              {record.id.slice(0, 8)}...
            </p>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400">
              Selesai
            </span>
          </div>
        </div>
        <div className="text-neutral-400 dark:text-neutral-500 p-1">
          <IconChevronRight className="w-5 h-5" />
        </div>
      </div>
      {isAdminUser && (
        <div className="flex justify-end mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-right">
            <p className="text-xs text-neutral-500">Total</p>
            <p className="font-bold text-neutral-900 dark:text-white">
              {formatCurrency(record.total)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderTableHeader = () => (
    <tr>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">#</th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">ID Transaksi</th>
      <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tanggal & Waktu</th>
      {isAdminUser && <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Total</th>}
      <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32">Status</th>
    </tr>
  );

  const renderTableRow = (record: PenjualanRecord, index: number, pageOffset: number) => (
    <tr key={record.id} onClick={() => handleViewDetail(record.id)} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group">
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {pageOffset + index + 1}
      </td>
      <td className="px-5 py-4 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">
        {record.id.slice(0, 8)}...
      </td>
      <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
        {formatDateTime(record.created_at || record.tanggal)}
      </td>
      {isAdminUser && (
        <td className="px-5 py-4 text-sm font-bold text-neutral-900 dark:text-neutral-100 text-right">
          {formatCurrency(record.total)}
        </td>
      )}
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400">
            Selesai
          </span>
          <IconChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <TransactionHistoryTable<PenjualanRecord>
        fetchFn={penjualanApi.getAll}
        search={search}
        startDate={startDate}
        endDate={endDate}
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
