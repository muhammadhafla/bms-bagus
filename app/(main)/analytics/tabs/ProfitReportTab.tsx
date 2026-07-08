import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, ProfitSummary } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconTrendingUp, IconDownload } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

interface ProfitReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
}

export function ProfitReportTab({ startDate, endDate, categoryId }: ProfitReportTabProps) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'profit', startDate, endDate, categoryId, page],
    queryFn: () => reportApi.getProfitReport(startDate || undefined, endDate || undefined, categoryId || undefined, { page, limit: ITEMS_PER_PAGE })
  });

  const profitSummary = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE) || 1;

  const handleExportCSV = async () => {
    try {
      const result = await reportApi.exportProfitReport(startDate || undefined, endDate || undefined, categoryId || undefined);
      if (result.error || !result.data) {
        alert('Gagal mengekspor data');
        return;
      }
      
      const csvData = result.data.map((s: ProfitSummary) => [
        s.date, 
        s.total_modal, 
        s.total_penjualan, 
        s.total_profit, 
        s.margin_percentage.toFixed(2) + '%'
      ]);
      
      exportToCSV(csvData, ['Tanggal', 'Total Modal (HPP)', 'Total Penjualan', 'Profit', 'Margin %'], `report_profit_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      alert('Terjadi kesalahan saat mengekspor');
    }
  };

  const chartData = useMemo(() => [...profitSummary].reverse(), [profitSummary]);
  const totalProfit = useMemo(() => profitSummary.reduce((sum, item) => sum + item.total_profit, 0), [profitSummary]);

  const pageTotalModal = useMemo(() => profitSummary.reduce((sum, item) => sum + item.total_modal, 0), [profitSummary]);
  const pageTotalPenjualan = useMemo(() => profitSummary.reduce((sum, item) => sum + item.total_penjualan, 0), [profitSummary]);
  const pageTotalProfit = useMemo(() => profitSummary.reduce((sum, item) => sum + item.total_profit, 0), [profitSummary]);
  const pageAvgMargin = pageTotalPenjualan > 0 ? (pageTotalProfit / pageTotalPenjualan) * 100 : 0;

  const exportButton = (
    <Button onClick={handleExportCSV} disabled={profitSummary.length === 0} variant="secondary" size="sm" className="shrink-0 h-[40px] w-full sm:w-auto">
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
        error={error ? 'Gagal memuat laporan profit' : null} 
        isEmpty={!isLoading && profitSummary.length === 0}
        emptyIcon={<IconTrendingUp className="w-16 h-16" />}
      >
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 md:p-6 shadow-elevated mb-6">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Total Profit (Halaman Ini)</p>
          <p className={`text-3xl md:text-4xl font-extrabold mt-1 tracking-tight ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(totalProfit)}
          </p>
        </div>

        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
          <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Tren Profit & Penjualan</h3>
          <div className="flex flex-col h-[350px] md:h-[450px] w-full gap-2 md:gap-4">
            
            {/* Grafik Atas: Penjualan */}
            <div className="flex-1 min-h-[150px] w-full relative border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
              <p className="absolute top-0 left-4 text-xs font-bold text-blue-500 z-10 bg-white/50 dark:bg-neutral-800/50 px-2 rounded-full backdrop-blur-sm shadow-sm">Total Penjualan</p>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} syncId="profitTrend" margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} height={10} />
                  <YAxis 
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val.toString();
                    }}
                    tick={{fontSize: '10px', fill: '#888'}} 
                    width={45}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Penjualan']} 
                    labelStyle={{color: '#1f2937', fontWeight: 'bold', marginBottom: '8px'}}
                    contentStyle={{borderRadius: '12px', border: '1px solid rgba(229,231,235,0.5)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)'}}
                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="total_penjualan" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Grafik Bawah: Profit */}
            <div className="flex-1 min-h-[150px] w-full relative pt-2">
              <p className="absolute top-0 left-4 text-xs font-bold text-emerald-500 z-10 bg-white/50 dark:bg-neutral-800/50 px-2 rounded-full backdrop-blur-sm shadow-sm">Total Profit</p>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} syncId="profitTrend" margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{fontSize: '10px', fill: '#888'}} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                    minTickGap={20}
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return isNaN(date.getTime()) ? val : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    }}
                  />
                  <YAxis 
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                      if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                      return val.toString();
                    }}
                    tick={{fontSize: '10px', fill: '#888'}} 
                    width={45}
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Profit']} 
                    labelStyle={{color: '#1f2937', fontWeight: 'bold', marginBottom: '8px'}}
                    contentStyle={{borderRadius: '12px', border: '1px solid rgba(229,231,235,0.5)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)'}}
                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Area type="monotone" dataKey="total_profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Modal (HPP)</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {profitSummary.map((item) => (
                  <tr key={item.date} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_modal)}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_penjualan)}</td>
                    <td className={`px-4 py-3.5 text-right font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(item.total_profit)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-bold ${item.margin_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {item.margin_percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 font-bold">
                <tr>
                  <td className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">{formatCurrency(pageTotalModal)}</td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">{formatCurrency(pageTotalPenjualan)}</td>
                  <td className={`px-4 py-4 text-right ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(pageTotalProfit)}
                  </td>
                  <td className={`px-4 py-4 text-right ${pageAvgMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {pageAvgMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {profitSummary.map((item) => (
              <div key={item.date} className="p-3 md:p-4 flex flex-col gap-1.5 md:gap-2">
                <div className="flex justify-between items-center">
                  <div className="font-medium text-sm md:text-base text-neutral-900 dark:text-neutral-100">{item.date}</div>
                  <div className={`font-bold text-[10px] md:text-xs ${item.margin_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    Margin: {item.margin_percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                  <div>
                    <span className="text-neutral-500 text-[10px] md:text-xs">Penjualan</span>
                    <div className="font-medium text-xs md:text-sm">{formatCurrency(item.total_penjualan)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 text-[10px] md:text-xs">Profit</span>
                    <div className={`font-bold text-sm ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(item.total_profit)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[10px] md:text-xs">Modal (HPP)</span>
                    <div className="text-neutral-600 dark:text-neutral-400 text-[10px] md:text-xs">{formatCurrency(item.total_modal)}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 font-bold border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-1.5 md:gap-2">
              <div className="text-xs md:text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-1.5 md:pb-2 mb-0.5 md:mb-1">Total Halaman Ini</div>
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                <div>
                  <span className="text-neutral-500 text-[10px] md:text-xs">Penjualan</span>
                  <div className="font-medium text-xs md:text-sm">{formatCurrency(pageTotalPenjualan)}</div>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 text-[10px] md:text-xs">Profit</span>
                  <div className={`font-bold text-sm ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
