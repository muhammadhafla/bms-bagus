import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, SalesSummary } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from "sonner";
import { IconShoppingCart, IconDownload } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

interface SalesReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
}

export function SalesReportTab({ startDate, endDate, categoryId }: SalesReportTabProps) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'sales', startDate, endDate, categoryId, page],
    queryFn: () => reportApi.getSalesReport(startDate || undefined, endDate || undefined, categoryId || undefined, { page, limit: ITEMS_PER_PAGE })
  });

  const salesSummary = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE) || 1;

  const handleExportCSV = async () => {
    try {
      const result = await reportApi.exportSalesReport(startDate || undefined, endDate || undefined, categoryId || undefined);
      if (result.error || !result.data) {
        toast.error('Gagal mengekspor data');
        return;
      }
      
      const csvData = result.data.map((s: SalesSummary) => [
        s.date, 
        s.transaction_count, 
        s.total_cash, 
        s.total_qris, 
        s.total_sales
      ]);
      
      exportToCSV(csvData, ['Tanggal', 'Jumlah Transaksi', 'Cash', 'QRIS', 'Total Penjualan'], `report_sales_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const chartData = useMemo(() => [...salesSummary].reverse(), [salesSummary]);
  
  const totalSales = useMemo(() => salesSummary.reduce((sum, item) => sum + item.total_sales, 0), [salesSummary]);
  const totalCash = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.total_cash || 0), 0), [salesSummary]);
  const totalQris = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.total_qris || 0), 0), [salesSummary]);

  const pageTotalSales = useMemo(() => salesSummary.reduce((sum, item) => sum + item.total_sales, 0), [salesSummary]);
  const pageTotalCash = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.total_cash || 0), 0), [salesSummary]);
  const pageTotalQris = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.total_qris || 0), 0), [salesSummary]);
  const pageTotalTx = useMemo(() => salesSummary.reduce((sum, item) => sum + item.transaction_count, 0), [salesSummary]);

  const exportButton = (
    <Button onClick={handleExportCSV} disabled={salesSummary.length === 0} variant="secondary" size="sm" className="shrink-0 h-[40px] w-full sm:w-auto">
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
        error={error ? 'Gagal memuat laporan penjualan' : null} 
        isEmpty={!isLoading && salesSummary.length === 0}
        emptyIcon={<IconShoppingCart className="w-16 h-16" />}
      >
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 md:p-6 shadow-elevated mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Total Penjualan (Halaman Ini)</p>
              <p className="text-3xl md:text-4xl font-extrabold mt-1 text-neutral-900 dark:text-white tracking-tight">{formatCurrency(totalSales)}</p>
            </div>
            
            <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800 hidden sm:block md:w-px md:h-12 md:mx-4" />
            <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800 sm:hidden my-1" />

            <div className="grid grid-cols-2 gap-4 md:flex md:gap-8">
              <div>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm font-medium">Total Cash</p>
                <p className="text-lg md:text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCash)}</p>
              </div>
              <div>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm font-medium">Total QRIS</p>
                <p className="text-lg md:text-xl font-bold mt-0.5 text-brand-600 dark:text-brand-400">{formatCurrency(totalQris)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
          <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Tren Penjualan</h3>
          <div className="h-[250px] md:h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQris" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{fontSize: '12px', fill: '#6b7280'}} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                  minTickGap={20}
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return isNaN(date.getTime()) ? val : date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis 
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return val.toString();
                  }}
                  tick={{fontSize: '11px', fill: '#6b7280'}} 
                  width={45} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]} 
                  labelStyle={{color: '#1f2937', fontWeight: 'bold', marginBottom: '8px'}}
                  contentStyle={{borderRadius: '12px', border: '1px solid rgba(229,231,235,0.5)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)'}}
                />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
                <Area type="monotone" dataKey="total_cash" name="Cash" stackId="1" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCash)" />
                <Area type="monotone" dataKey="total_qris" name="QRIS" stackId="1" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorQris)" />
                <Area type="monotone" dataKey="total_sales" name="Penjualan" stroke="#3b82f6" strokeWidth={3} fillOpacity={0} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Jumlah Transaksi</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Cash</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">QRIS</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {salesSummary.map((item) => (
                  <tr key={item.date} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-700 dark:text-neutral-300">{item.transaction_count}</td>
                    <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(item.total_cash)}</td>
                    <td className="px-4 py-3.5 text-right text-purple-600 dark:text-purple-400 font-medium">{formatCurrency(item.total_qris)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_sales)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 font-bold">
                <tr>
                  <td className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">{pageTotalTx}</td>
                  <td className="px-4 py-4 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(pageTotalCash)}</td>
                  <td className="px-4 py-4 text-right text-purple-600 dark:text-purple-400">{formatCurrency(pageTotalQris)}</td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">{formatCurrency(pageTotalSales)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {salesSummary.map((item) => (
              <div key={item.date} className="p-3 md:p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm md:text-base text-neutral-900 dark:text-neutral-100">{item.date}</div>
                  <div className="text-xs md:text-sm text-neutral-500">{item.transaction_count} Transaksi</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm md:text-base text-brand-600 dark:text-brand-400">{formatCurrency(item.total_sales)}</span>
                  <div className="text-[10px] md:text-xs text-neutral-500 mt-0.5 flex flex-col items-end">
                    <span><span className="text-emerald-600 dark:text-emerald-400">C: {formatCurrency(item.total_cash)}</span> • <span className="text-purple-600 dark:text-purple-400">Q: {formatCurrency(item.total_qris)}</span></span>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 font-bold border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-xs md:text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</div>
                <div className="text-[10px] md:text-xs text-neutral-500">{pageTotalTx} Transaksi</div>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm md:text-base text-brand-600 dark:text-brand-400">{formatCurrency(pageTotalSales)}</span>
                <div className="text-[10px] md:text-xs mt-0.5 flex flex-col items-end">
                  <span><span className="text-emerald-600 dark:text-emerald-400">C: {formatCurrency(pageTotalCash)}</span> • <span className="text-purple-600 dark:text-purple-400">Q: {formatCurrency(pageTotalQris)}</span></span>
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
