import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, ProfitSummary } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { IconTrendingUp, IconDownload } from '@tabler/icons-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

interface ProfitReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
}

export function ProfitReportTab({ startDate, endDate, categoryId }: ProfitReportTabProps) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'sales' | 'profit'>('sales');
  const ITEMS_PER_PAGE = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'profit', startDate, endDate, categoryId, page],
    queryFn: () =>
      reportApi.getProfitReport(
        startDate || undefined,
        endDate || undefined,
        categoryId || undefined,
        { page, limit: ITEMS_PER_PAGE },
      ),
  });

  const profitSummary = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE) || 1;

  const handleExportCSV = async () => {
    try {
      const result = await reportApi.exportProfitReport(
        startDate || undefined,
        endDate || undefined,
        categoryId || undefined,
      );
      if (result.error || !result.data) {
        toast.error('Gagal mengekspor data');
        return;
      }

      const csvData = result.data.map((s: ProfitSummary) => [
        s.date,
        s.total_modal,
        s.total_penjualan,
        s.total_profit,
        s.margin_percentage.toFixed(2) + '%',
      ]);

      exportToCSV(
        csvData,
        ['Tanggal', 'Total Modal (HPP)', 'Total Penjualan', 'Profit', 'Margin %'],
        `report_profit_${new Date().toISOString().split('T')[0]}.csv`,
      );
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const chartData = useMemo(() => [...profitSummary].reverse(), [profitSummary]);
  const totalProfit = useMemo(
    () => profitSummary.reduce((sum, item) => sum + item.total_profit, 0),
    [profitSummary],
  );

  const pageTotalModal = useMemo(
    () => profitSummary.reduce((sum, item) => sum + item.total_modal, 0),
    [profitSummary],
  );
  const pageTotalPenjualan = useMemo(
    () => profitSummary.reduce((sum, item) => sum + item.total_penjualan, 0),
    [profitSummary],
  );
  const pageTotalProfit = useMemo(
    () => profitSummary.reduce((sum, item) => sum + item.total_profit, 0),
    [profitSummary],
  );
  const pageAvgMargin = pageTotalPenjualan > 0 ? (pageTotalProfit / pageTotalPenjualan) * 100 : 0;

  const exportButton = (
    <Button
      onClick={handleExportCSV}
      disabled={profitSummary.length === 0}
      variant="secondary"
      size="sm"
      className="h-[40px] w-full shrink-0 sm:w-auto"
    >
      <IconDownload size={18} />
      <span>Export CSV</span>
    </Button>
  );

  const renderSalesChart = () => (
    <div className="relative min-h-[150px] w-full flex-1 border-b border-neutral-100 pb-2 dark:border-neutral-800/50">
      <p className="absolute top-0 left-4 z-10 rounded-full bg-white/50 px-2 text-xs font-bold text-blue-500 shadow-sm backdrop-blur-sm dark:bg-neutral-800/50">
        Total Penjualan
      </p>
      <ResponsiveContainer width="100%" height="100%" minHeight={1}>
        <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
            tick={{ fontSize: '10px', fill: '#888' }}
            width={45}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(label) => {
              const d = new Date(label as string);
              return !isNaN(d.getTime())
                ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                : label;
            }}
            formatter={(value: any) => [formatCurrency(Number(value)), 'Penjualan']}
            labelStyle={{
              color: '#1f2937',
              fontWeight: 'bold',
              marginBottom: '8px',
              fontSize: '14px',
            }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid rgba(229,231,235,0.5)',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px',
            }}
            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
            position={{ y: 0 }}
            wrapperStyle={{ pointerEvents: 'none', fontSize: '12px' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="total_penjualan"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorSales)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderProfitChart = () => (
    <div className="relative min-h-[150px] w-full flex-1 pt-2">
      <p className="absolute top-0 left-4 z-10 rounded-full bg-white/50 px-2 text-xs font-bold text-emerald-500 shadow-sm backdrop-blur-sm dark:bg-neutral-800/50">
        Total Profit
      </p>
      <ResponsiveContainer width="100%" height="100%" minHeight={1}>
        <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: '10px', fill: '#888' }}
            tickLine={false}
            axisLine={false}
            dy={10}
            minTickGap={20}
            tickFormatter={(val) => {
              const date = new Date(val);
              return isNaN(date.getTime())
                ? val
                : date.toLocaleDateString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    day: 'numeric',
                    month: 'short',
                  });
            }}
          />
          <YAxis
            tickFormatter={(val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return val.toString();
            }}
            tick={{ fontSize: '10px', fill: '#888' }}
            width={45}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(label) => {
              const d = new Date(label as string);
              return !isNaN(d.getTime())
                ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                : label;
            }}
            formatter={(value: any) => [formatCurrency(Number(value)), 'Profit']}
            labelStyle={{
              color: '#1f2937',
              fontWeight: 'bold',
              marginBottom: '8px',
              fontSize: '14px',
            }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid rgba(229,231,235,0.5)',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              padding: '8px 12px',
            }}
            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
            position={{ y: 0 }}
            wrapperStyle={{ pointerEvents: 'none', fontSize: '12px' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="total_profit"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorProfit)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="mb-4 flex justify-end">{exportButton}</div>

      <ReportState
        loading={isLoading}
        error={error ? 'Gagal memuat laporan profit' : null}
        isEmpty={!isLoading && profitSummary.length === 0}
        emptyIcon={<IconTrendingUp className="h-16 w-16" />}
      >
        <div className="shadow-elevated mb-6 rounded-3xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl md:p-6 dark:border-white/10 dark:bg-neutral-900/60">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Total Profit (Halaman Ini)
          </p>
          <p
            className={`mt-1 text-3xl font-extrabold tracking-tight md:text-4xl ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {formatCurrency(totalProfit)}
          </p>
        </div>

        <div className="shadow-elevated mb-6 overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
          <h3 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">
            Tren Profit & Penjualan
          </h3>

          {/* Mobile Tabs */}
          <div className="mb-4 flex w-full rounded-xl bg-neutral-100/80 p-1 text-xs shadow-inner backdrop-blur md:hidden dark:bg-neutral-800/80">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 rounded-lg py-1.5 transition-all ${activeTab === 'sales' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Penjualan
            </button>
            <button
              onClick={() => setActiveTab('profit')}
              className={`flex-1 rounded-lg py-1.5 transition-all ${activeTab === 'profit' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Profit
            </button>
          </div>

          <div className="flex h-[350px] w-full flex-col pt-2 md:h-[450px]">
            {/* Mobile View (Tabbed) */}
            <div className="flex h-full w-full flex-col md:hidden">
              {activeTab === 'sales' ? renderSalesChart() : renderProfitChart()}
            </div>

            {/* Desktop View (Stacked) */}
            <div className="hidden h-full w-full flex-col gap-4 md:flex">
              {renderSalesChart()}
              {renderProfitChart()}
            </div>
          </div>
        </div>

        <div className="shadow-elevated overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Tanggal
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Total Modal (HPP)
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Total Penjualan
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Profit
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {profitSummary.map((item) => (
                  <tr
                    key={item.date}
                    className="transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {item.date}
                    </td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(item.total_modal)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(item.total_penjualan)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {formatCurrency(item.total_profit)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-bold ${item.margin_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {item.margin_percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50 font-bold dark:border-neutral-800 dark:bg-neutral-900">
                <tr>
                  <td className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100">
                    Total Halaman Ini
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(pageTotalModal)}
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(pageTotalPenjualan)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {formatCurrency(pageTotalProfit)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right ${pageAvgMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {pageAvgMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block divide-y divide-neutral-100 lg:hidden dark:divide-neutral-800">
            {profitSummary.map((item) => (
              <div key={item.date} className="flex flex-col gap-1.5 p-3 md:gap-2 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-neutral-900 md:text-base dark:text-neutral-100">
                    {item.date}
                  </div>
                  <div
                    className={`text-[10px] font-bold md:text-xs ${item.margin_percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    Margin: {item.margin_percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="mt-0.5 grid grid-cols-2 gap-1.5 md:mt-1 md:gap-2">
                  <div>
                    <span className="text-[10px] text-neutral-500 md:text-xs">Penjualan</span>
                    <div className="text-xs font-medium md:text-sm">
                      {formatCurrency(item.total_penjualan)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 md:text-xs">Profit</span>
                    <div
                      className={`text-sm font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {formatCurrency(item.total_profit)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 md:text-xs">Modal (HPP)</span>
                    <div className="text-[10px] text-neutral-600 md:text-xs dark:text-neutral-400">
                      {formatCurrency(item.total_modal)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-1.5 border-t border-neutral-200 bg-neutral-50 p-3 font-bold md:gap-2 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-0.5 border-b border-neutral-200 pb-1.5 text-xs text-neutral-900 md:mb-1 md:pb-2 md:text-sm dark:border-neutral-700 dark:text-neutral-100">
                Total Halaman Ini
              </div>
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                <div>
                  <span className="text-[10px] text-neutral-500 md:text-xs">Penjualan</span>
                  <div className="text-xs font-medium md:text-sm">
                    {formatCurrency(pageTotalPenjualan)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-500 md:text-xs">Profit</span>
                  <div
                    className={`text-sm font-bold ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
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
