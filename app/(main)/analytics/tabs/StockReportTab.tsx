import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, StockMutation } from '@/lib/api';
import { Button } from '@/components/ui';
import { toast } from "sonner";
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
    queryFn: () => reportApi.getStockMutations(startDate || undefined, endDate || undefined, { page, limit: ITEMS_PER_PAGE })
  });

  const stockMutations = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE) || 1;

  const handleExportCSV = async () => {
    try {
      const result = await reportApi.exportStockMutations(startDate || undefined, endDate || undefined);
      if (result.error || !result.data) {
        toast.error('Gagal mengekspor data');
        return;
      }
      
      const csvData = result.data.map((m: StockMutation) => [
        formatDateWIB(m.created_at),
        m.barcode || '', 
        m.nama_barang || '', 
        m.type === 'in' ? 'IN' : 'OUT', 
        m.qty_mutation
      ]);
      
      exportToCSV(csvData, ['Tanggal', 'Barcode', 'Nama Barang', 'Tipe', 'Qty'], `report_stock_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const pageTotalIn = useMemo(() => stockMutations.filter((m: StockMutation) => m.type === 'in').reduce((sum: number, m: StockMutation) => sum + m.qty_mutation, 0), [stockMutations]);
  const pageTotalOut = useMemo(() => stockMutations.filter((m: StockMutation) => m.type === 'out').reduce((sum: number, m: StockMutation) => sum + Math.abs(m.qty_mutation), 0), [stockMutations]);

  const exportButton = (
    <Button onClick={handleExportCSV} disabled={stockMutations.length === 0} variant="secondary" size="sm" className="shrink-0 h-[40px] w-full sm:w-auto">
      <IconDownload size={18} />
      <span>Export CSV</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        {exportButton}
      </div>

      <ReportState 
        loading={isLoading} 
        error={error ? 'Gagal memuat mutasi stock' : null} 
        isEmpty={!isLoading && stockMutations.length === 0}
        emptyIcon={<IconPackage className="w-16 h-16" />}
      >
        <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full min-w-[900px]">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barcode</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tipe</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stockMutations.map((mutation: StockMutation) => (
                  <tr key={mutation.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {formatDateWIB(mutation.created_at)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">{mutation.barcode}</td>
                    <td className="px-4 py-3.5 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{mutation.nama_barang}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        mutation.type === 'in' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                      }`}>
                        {mutation.type === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {mutation.qty_mutation > 0 ? `+${mutation.qty_mutation}` : mutation.qty_mutation}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100">Total Mutasi (Halaman Ini)</td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-emerald-600 dark:text-emerald-400 mr-2">IN: {pageTotalIn}</span>
                    <span className="text-rose-600 dark:text-rose-400">OUT: {pageTotalOut}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {pageTotalIn - pageTotalOut > 0 ? `+${pageTotalIn - pageTotalOut}` : pageTotalIn - pageTotalOut}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {stockMutations.map((mutation: StockMutation) => (
              <div key={mutation.id} className="p-3 md:p-4 flex flex-col gap-0.5 md:gap-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium text-sm md:text-base text-neutral-900 dark:text-neutral-100 leading-tight truncate flex-1">{mutation.nama_barang}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-1.5 py-[2px] rounded-md text-[8px] md:text-[10px] font-bold uppercase tracking-wider ${
                      mutation.type === 'in' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                    }`}>
                      {mutation.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm md:text-base">
                      {mutation.qty_mutation > 0 ? `+${mutation.qty_mutation}` : mutation.qty_mutation}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-neutral-500 mt-0.5">
                  <span className="font-mono">{mutation.barcode}</span>
                  <span>•</span>
                  <span>{formatDateWIB(mutation.created_at)}</span>
                </div>
              </div>
            ))}
            <div className="p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 font-bold border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div className="text-xs md:text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</div>
              <div className="text-right">
                <div className="text-[10px] md:text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">IN: {pageTotalIn}</span> • <span className="text-rose-600 dark:text-rose-400">OUT: {pageTotalOut}</span>
                </div>
                <div className="font-bold text-sm md:text-base text-neutral-900 dark:text-neutral-100 mt-0.5 md:mt-1">Net: {pageTotalIn - pageTotalOut}</div>
              </div>
            </div>
          </div>
        </div>
        
        <ReportPagination 
          page={page} 
          totalPages={totalPages} 
          onPageChange={setPage} 
          actions={exportButton}
        />
      </ReportState>
    </div>
  );
}
