import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, TopSellingItem } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from "sonner";
import { IconChartBar, IconDownload } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

interface TopItemsReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
  topItemsSort: 'qty' | 'profit';
}

export function TopItemsReportTab({ startDate, endDate, categoryId, topItemsSort }: TopItemsReportTabProps) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  // We fetch a reasonable amount of top items, since the API only supports limit, not offset.
  const FETCH_LIMIT = 200;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'top_items', startDate, endDate, categoryId, topItemsSort],
    queryFn: () => reportApi.getTopSellingItems(startDate || undefined, endDate || undefined, categoryId || undefined, FETCH_LIMIT)
  });

  const rawTopItems = useMemo(() => data?.data || [], [data?.data]);
  
  // Sort client-side based on the selected sort criteria since the API might just sort by default
  const topItems = useMemo(() => {
    const items = [...rawTopItems];
    if (topItemsSort === 'qty') {
      return items.sort((a, b) => b.total_qty - a.total_qty);
    } else {
      return items.sort((a, b) => b.total_profit - a.total_profit);
    }
  }, [rawTopItems, topItemsSort]);

  const totalPages = Math.ceil(topItems.length / ITEMS_PER_PAGE) || 1;
  const pagedTopItems = useMemo(() => topItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [topItems, page]);

  const handleExportCSV = async () => {
    try {
      // Re-fetch with a higher limit for export
      const result = await reportApi.getTopSellingItems(startDate || undefined, endDate || undefined, categoryId || undefined, 1000);
      if (result.error || !result.data) {
        toast.error('Gagal mengekspor data');
        return;
      }
      
      let exportItems = result.data;
      if (topItemsSort === 'qty') {
        exportItems.sort((a, b) => b.total_qty - a.total_qty);
      } else {
        exportItems.sort((a, b) => b.total_profit - a.total_profit);
      }
      
      const csvData = exportItems.map((item: TopSellingItem, index: number) => [
        index + 1,
        item.inventory_id, // We don't have barcode in TopSellingItem right now, use ID or fetch it
        item.nama_barang,
        '-', // No category in TopSellingItem
        item.total_qty, 
        item.total_sales, 
        item.total_profit
      ]);
      
      exportToCSV(
        csvData, 
        ['Rank', 'ID', 'Nama Barang', 'Kategori', 'Qty Terjual', 'Total Penjualan', 'Total Profit'], 
        `report_top_items_${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const chartData = useMemo(() => topItems.slice(0, 10), [topItems]);

  const pageTotalQty = useMemo(() => pagedTopItems.reduce((sum: number, item: TopSellingItem) => sum + Number(item.total_qty), 0), [pagedTopItems]);
  const pageTotalSales = useMemo(() => pagedTopItems.reduce((sum: number, item: TopSellingItem) => sum + Number(item.total_sales), 0), [pagedTopItems]);
  const pageTotalProfit = useMemo(() => pagedTopItems.reduce((sum: number, item: TopSellingItem) => sum + Number(item.total_profit), 0), [pagedTopItems]);

  const exportButton = (
    <Button onClick={handleExportCSV} disabled={topItems.length === 0} variant="secondary" size="sm" className="shrink-0 h-[40px] w-full sm:w-auto">
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
        error={error ? 'Gagal memuat laporan top items' : null} 
        isEmpty={!isLoading && topItems.length === 0}
        emptyIcon={<IconChartBar className="w-16 h-16" />}
      >
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
          <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Top 10 Produk ({topItemsSort === 'qty' ? 'Kuantitas' : 'Profit'})</h3>
          <div className="h-[300px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} vertical={true} />
                <XAxis 
                  type="number"
                  tickFormatter={(val) => topItemsSort === 'qty' ? val : `Rp${val/1000}k`} 
                  tick={{fontSize: '11px'}} 
                />
                <YAxis 
                  dataKey="nama_barang"
                  type="category"
                  tick={{fontSize: '11px'}} 
                  width={140}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => {
                    if (name === 'total_qty') return [value, 'Qty Terjual'];
                    return [formatCurrency(Number(value)), name === 'total_sales' ? 'Penjualan' : 'Profit'];
                  }}
                  labelStyle={{color: '#1f2937', fontWeight: 'bold', marginBottom: '8px'}}
                  contentStyle={{
                    borderRadius: '12px', 
                    border: '1px solid rgba(229, 231, 235, 0.5)', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
                    backdropFilter: 'blur(8px)'
                  }}
                />
                <Legend wrapperStyle={{paddingTop: '10px'}} />
                {topItemsSort === 'qty' ? (
                  <Bar dataKey="total_qty" name="Qty Terjual" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={25} />
                ) : (
                  <>
                    <Bar dataKey="total_sales" name="Total Penjualan" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={15} />
                    <Bar dataKey="total_profit" name="Total Profit" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={15} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-4 py-4 text-center text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-16">Rank</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Produk</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Qty Terjual</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {pagedTopItems.map((item: TopSellingItem, index: number) => (
                  <tr key={item.inventory_id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        (page - 1) * ITEMS_PER_PAGE + index + 1 === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                        (page - 1) * ITEMS_PER_PAGE + index + 1 === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        (page - 1) * ITEMS_PER_PAGE + index + 1 === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400' :
                        'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}>
                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-600 dark:text-brand-400">{item.total_qty}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-neutral-700 dark:text-neutral-300">{formatCurrency(item.total_sales)}</td>
                    <td className={`px-4 py-3.5 text-right font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(item.total_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 font-bold">
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</td>
                  <td className="px-4 py-4 text-right text-brand-600 dark:text-brand-400">{pageTotalQty}</td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">{formatCurrency(pageTotalSales)}</td>
                  <td className={`px-4 py-4 text-right ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(pageTotalProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {pagedTopItems.map((item: TopSellingItem, index: number) => (
              <div key={item.inventory_id} className="p-3 md:p-4 flex gap-2 md:gap-3">
                <div className="pt-0.5">
                  <span className={`inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full text-[10px] md:text-xs font-bold ${
                    (page - 1) * ITEMS_PER_PAGE + index + 1 === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                    (page - 1) * ITEMS_PER_PAGE + index + 1 === 2 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                    (page - 1) * ITEMS_PER_PAGE + index + 1 === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}>
                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm md:text-base text-neutral-900 dark:text-neutral-100 leading-tight truncate">{item.nama_barang}</div>
                  <div className="grid grid-cols-3 gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div>
                      <div className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-semibold">Qty</div>
                      <div className="font-bold text-xs md:text-sm text-brand-600 dark:text-brand-400">{item.total_qty}</div>
                    </div>
                    <div>
                      <div className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-semibold">Penjualan</div>
                      <div className="font-medium text-[10px] md:text-sm">{formatCurrency(item.total_sales)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] md:text-[10px] text-neutral-500 uppercase font-semibold">Profit</div>
                      <div className={`font-bold text-[10px] md:text-sm ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(item.total_profit)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 font-bold border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-1.5 md:gap-2">
              <div className="text-xs md:text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-1.5 md:pb-2 mb-0.5 md:mb-1">Total Halaman Ini</div>
              <div className="grid grid-cols-3 gap-1.5 md:gap-2 text-sm">
                <div>
                  <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Qty</span>
                  <div className="font-bold text-xs md:text-sm text-brand-600 dark:text-brand-400">{pageTotalQty}</div>
                </div>
                <div>
                  <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Penjualan</span>
                  <div className="font-medium text-[10px] md:text-sm">{formatCurrency(pageTotalSales)}</div>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Profit</span>
                  <div className={`font-bold text-[10px] md:text-sm ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(pageTotalProfit)}
                  </div>
                </div>
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
