'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { ModernPagination } from '@/components/ui';

export interface PaginationOptions {
  limit: number;
  offset: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

interface TransactionHistoryTableProps<T> {
  fetchFn: (options: PaginationOptions) => Promise<{ data: T[] | null; total?: number; error: any }>;
  search: string;
  startDate: string;
  endDate: string;
  emptyMessage?: string;
  renderMobileCard: (record: T, index: number) => ReactNode;
  renderTableHeader: () => ReactNode;
  renderTableRow: (record: T, index: number, pageOffset: number) => ReactNode;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function TransactionHistoryTable<T extends { id: string }>({
  fetchFn,
  search,
  startDate,
  endDate,
  emptyMessage = 'Tidak ada data',
  renderMobileCard,
  renderTableHeader,
  renderTableRow,
  limit = 10,
  sortBy,
  sortDir,
}: TransactionHistoryTableProps<T>) {
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * limit;
    const result = await fetchFn({ 
      limit, 
      offset, 
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortDir
    });
    if (!result.error && result.data) {
      setRecords(result.data);
      setTotal(result.total || 0);
    }
    setLoading(false);
  }, [fetchFn, page, limit, search, startDate, endDate, sortBy, sortDir]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.ceil(total / limit) || 1;
  const pageOffset = (page - 1) * limit;

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
            <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">{emptyMessage}</p>
            <p className="text-sm mt-1">Coba sesuaikan filter pencarian.</p>
          </div>
        ) : (
          records.map((record, index) => renderMobileCard(record, index))
        )}
      </div>

      <div className="overflow-x-auto h-full custom-scrollbar hidden lg:block">
        <table className="w-full min-w-[700px]">
          <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
            {renderTableHeader()}
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-neutral-500">
                  <div className="flex justify-center items-center h-32">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-16 text-center text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-white/50 dark:bg-neutral-950/50 rounded-2xl flex items-center justify-center mb-4">
                      <IconSearch className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">{emptyMessage}</p>
                    <p className="text-sm mt-1">Coba sesuaikan filter pencarian.</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, index) => renderTableRow(record, index, pageOffset))
            )}
          </tbody>
        </table>
      </div>
      
      {total > 0 && (
        <ModernPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          className="rounded-b-3xl"
        />
      )}
    </div>
  );
}
