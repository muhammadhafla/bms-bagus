'use client';

import { useState, useEffect, ReactNode } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { ModernPagination } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';

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
  fetchFn: (
    options: PaginationOptions,
  ) => Promise<{ data: T[] | null; total?: number; error: any }>;
  queryKeyPrefix: string[];
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
  queryKeyPrefix,
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
  const [page, setPage] = useState(1);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  const offset = (page - 1) * limit;

  const { data: queryResult, isLoading } = useQuery({
    queryKey: [...queryKeyPrefix, { limit, offset, search, startDate, endDate, sortBy, sortDir }],
    queryFn: async () => {
      const result = await fetchFn({
        limit,
        offset,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDir,
      });
      if (result.error) {
        throw new Error(result.error.message || 'Terjadi kesalahan saat memuat data');
      }
      return {
        records: result.data || [],
        total: result.total || 0,
      };
    },
    // Keep previous data while fetching new page for smoother UX
    // (requires importing keepPreviousData if using React Query v5, but we'll stick to basic v4 behavior if we're not sure, wait `keepPreviousData` is a boolean in v4, or a function in v5. Let's just omit it to avoid breaking changes or syntax errors if we don't know the exact version)
  });

  const records = queryResult?.records || [];
  const total = queryResult?.total || 0;
  const loading = isLoading;

  const totalPages = Math.ceil(total / limit) || 1;
  const pageOffset = offset;

  return (
    <div className="shadow-elevated flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
      {/* Mobile View */}
      <div className="block space-y-4 overflow-y-auto p-4 lg:hidden">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center text-neutral-500">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/50 dark:bg-neutral-950/50">
              <IconSearch className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">
              {emptyMessage}
            </p>
            <p className="mt-1 text-sm">Coba sesuaikan filter pencarian.</p>
          </div>
        ) : (
          records.map((record, index) => renderMobileCard(record as T, index))
        )}
      </div>

      <div className="custom-scrollbar hidden h-full overflow-x-auto lg:block">
        <table className="w-full min-w-[700px]">
          <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
            {renderTableHeader()}
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-neutral-500">
                  <div className="flex h-32 items-center justify-center">
                    <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-5 py-16 text-center text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/50 dark:bg-neutral-950/50">
                      <IconSearch className="h-8 w-8 text-neutral-400" />
                    </div>
                    <p className="text-lg font-medium text-neutral-600 dark:text-neutral-300">
                      {emptyMessage}
                    </p>
                    <p className="mt-1 text-sm">Coba sesuaikan filter pencarian.</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, index) => renderTableRow(record as T, index, pageOffset))
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

