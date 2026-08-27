import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, StockMutation } from '@/lib/api';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { IconPackage, IconDownload } from '@tabler/icons-react';
import { formatDateWIB, exportToCSV } from '@/lib/utils';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

interface StockReportTabProps {
  startDate: string;
  endDate: string;
}

export function StockReportTab({ startDate, endDate }: StockReportTabProps) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'stock', startDate, endDate, page],
    queryFn: () =>
      reportApi.getStockMutations(startDate || undefined, endDate || undefined, {
        page,
        limit: ITEMS_PER_PAGE,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const stockMutations = useMemo(() => data?.data || [], [data?.data]);
  const hasMore = data?.hasMore || false;

  const handleExportCSV = async () => {
    try {
      const result = await reportApi.exportStockMutations(
        startDate || undefined,
        endDate || undefined,
      );
      if (result.error || !result.data) {
        toast.error('Gagal mengekspor data');
        return;
      }

      const csvData = result.data.map((m: StockMutation) => [
        formatDateWIB(m.created_at),
        m.barcode || '',
        m.nama_barang || '',
        m.type === 'in' ? 'IN' : 'OUT',
        m.qty_mutation,
      ]);

      exportToCSV(
        csvData,
        ['Tanggal', 'Barcode', 'Nama Barang', 'Tipe', 'Qty'],
        `report_stock_${new Date().toISOString().split('T')[0]}.csv`,
      );
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const pageTotalIn = useMemo(
    () =>
      stockMutations
        .filter((m: StockMutation) => m.type === 'in')
        .reduce((sum: number, m: StockMutation) => sum + m.qty_mutation, 0),
    [stockMutations],
  );
  const pageTotalOut = useMemo(
    () =>
      stockMutations
        .filter((m: StockMutation) => m.type === 'out')
        .reduce((sum: number, m: StockMutation) => sum + Math.abs(m.qty_mutation), 0),
    [stockMutations],
  );

  const exportButton = (
    <Button
      onClick={handleExportCSV}
      disabled={stockMutations.length === 0}
      variant="secondary"
      size="sm"
      className="h-9 w-auto shrink-0"
    >
      <IconDownload size={18} />
      <span>Export CSV</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="mb-4 flex justify-end">{exportButton}</div>

      <ReportState
        loading={isLoading}
        error={error ? 'Gagal memuat mutasi stock' : null}
        isEmpty={!isLoading && stockMutations.length === 0}
        emptyIcon={<IconPackage className="h-16 w-16" />}
      >
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Tanggal
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Barcode
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Nama Barang
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Tipe
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Qty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stockMutations.map((mutation: StockMutation) => (
                  <tr
                    key={mutation.id}
                    className="transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                      {formatDateWIB(mutation.created_at)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-sm text-neutral-700 dark:text-neutral-300">
                      {mutation.barcode}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {mutation.nama_barang}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          mutation.type === 'in'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                        }`}
                      >
                        {mutation.type === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {mutation.qty_mutation > 0
                        ? `+${mutation.qty_mutation}`
                        : mutation.qty_mutation}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50 font-bold dark:border-neutral-800 dark:bg-neutral-900">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    Total Mutasi (Halaman Ini)
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="mr-2 text-emerald-600 dark:text-emerald-400">
                      IN: {pageTotalIn}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400">OUT: {pageTotalOut}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {pageTotalIn - pageTotalOut > 0
                      ? `+${pageTotalIn - pageTotalOut}`
                      : pageTotalIn - pageTotalOut}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block divide-y divide-neutral-100 lg:hidden dark:divide-neutral-800">
            {stockMutations.map((mutation: StockMutation) => (
              <div key={mutation.id} className="flex flex-col gap-0.5 p-3 md:gap-1 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 truncate text-sm leading-tight font-medium text-neutral-900 md:text-base dark:text-neutral-100">
                    {mutation.nama_barang}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-[2px] text-[8px] font-bold tracking-wider uppercase md:text-[10px] ${
                        mutation.type === 'in'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                      }`}
                    >
                      {mutation.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <span className="text-sm font-bold text-neutral-900 md:text-base dark:text-neutral-100">
                      {mutation.qty_mutation > 0
                        ? `+${mutation.qty_mutation}`
                        : mutation.qty_mutation}
                    </span>
                  </div>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-neutral-500 md:text-xs">
                  <span className="font-mono">{mutation.barcode}</span>
                  <span>•</span>
                  <span>{formatDateWIB(mutation.created_at)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 p-3 font-bold md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-xs text-neutral-900 md:text-sm dark:text-neutral-100">
                Total Halaman Ini
              </div>
              <div className="text-right">
                <div className="text-[10px] md:text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">IN: {pageTotalIn}</span>{' '}
                  • <span className="text-rose-600 dark:text-rose-400">OUT: {pageTotalOut}</span>
                </div>
                <div className="mt-0.5 text-sm font-bold text-neutral-900 md:mt-1 md:text-base dark:text-neutral-100">
                  Net: {pageTotalIn - pageTotalOut}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ReportPagination
          page={page}
          hasMore={hasMore}
          onPageChange={setPage}
          actions={exportButton}
        />
      </ReportState>
    </div>
  );
}
