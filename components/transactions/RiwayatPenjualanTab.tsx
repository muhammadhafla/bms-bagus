'use client';

import { useState, useEffect, useCallback } from 'react';
import { penjualanApi } from '@/lib/api/penjualan';
import { formatCurrency, formatDateWIB, formatDateTimeWIB } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import { ModernPagination } from '@/components/ui';

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

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-[400px] bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated">
      {/* Mobile View */}
      <div className="block lg:hidden space-y-4 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-neutral-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/50 dark:bg-neutral-950/50 rounded-2xl flex items-center justify-center mb-4">
              <IconSearch className="w-8 h-8 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">Tidak ada data</p>
            <p className="text-sm mt-1">Coba sesuaikan filter pencarian.</p>
          </div>
        ) : (
          records.map((record) => (
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
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Selesai
                    </span>
                  </div>
                </div>
                <div className="text-neutral-400 dark:text-neutral-500 p-1">
                  <IconChevronRight className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <div className="text-right">
                  <p className="text-xs text-neutral-500">Total</p>
                  <p className="font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(record.total)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="overflow-x-auto h-full custom-scrollbar hidden lg:block">
        <table className="w-full min-w-[700px]">
          <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
            <tr>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">#</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">ID Transaksi</th>
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tanggal & Waktu</th>
              <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Total</th>
              <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-neutral-500">
                  <div className="flex justify-center items-center h-32">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-white/50 dark:bg-neutral-950/50 rounded-2xl flex items-center justify-center mb-4">
                      <IconSearch className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">Tidak ada data</p>
                    <p className="text-sm mt-1">Coba sesuaikan filter pencarian.</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.id} onClick={() => handleViewDetail(record.id)} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group">
                  <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {((page - 1) * limit) + index + 1}
                  </td>
                  <td className="px-5 py-4 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {record.id.slice(0, 8)}...
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {formatDateTime(record.created_at || record.tanggal)}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-neutral-900 dark:text-neutral-100 text-right">
                    {formatCurrency(record.total)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Selesai
                      </span>
                      <IconChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 0 && (
        <ModernPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          className="rounded-b-3xl"
        />
      )}

      {/* Rincian Penjualan Mini Receipt Modal */}
      <TransactionModal 
        isOpen={modalOpen} 
        onClose={handleCloseModal} 
        transactionId={selectedId} 
        transactionType="penjualan" 
      />
    </div>
  );
}
