'use client';

import { useState, useEffect, useCallback } from 'react';
import { penjualanApi } from '@/lib/api/penjualan';
import { formatCurrency, formatDateWIB } from '@/lib/utils';
import { IconSearch, IconEye, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { TransactionModal } from '@/components/dashboard/TransactionModal';

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
              className="bg-white dark:bg-neutral-900 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">{formatDate(record.created_at || record.tanggal)}</p>
                  <p className="font-mono font-medium text-neutral-900 dark:text-white">
                    {record.id}
                  </p>
                </div>
                <button
                  onClick={() => handleViewDetail(record.id)}
                  className="p-2 text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/30 rounded-xl"
                >
                  <IconEye className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
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
              <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tanggal</th>
              <th className="px-5 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Total</th>
              <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-24">Aksi</th>
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
                <tr key={record.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {((page - 1) * limit) + index + 1}
                  </td>
                  <td className="px-5 py-4 text-sm font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {record.id}
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                    {formatDate(record.created_at || record.tanggal)}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-neutral-900 dark:text-neutral-100 text-right">
                    {formatCurrency(record.total)}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleViewDetail(record.id)}
                      className="p-2 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-xl transition-colors btn-press"
                    >
                      <IconEye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 0 && (
        <div className="flex-shrink-0 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 rounded-b-3xl">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium text-center sm:text-left">
            Menampilkan {total > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} dari {total} data <span className="mx-2">|</span> Halaman {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-600 dark:text-neutral-300 btn-press"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-600 dark:text-neutral-300 btn-press"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
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
