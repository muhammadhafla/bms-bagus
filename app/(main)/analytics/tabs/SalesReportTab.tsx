import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { reportApi, SalesSummary } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { IconShoppingCart, IconDownload } from '@tabler/icons-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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

  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    total_cash: true,
    total_qris: true,
    total_sales: true,
  });

  const toggleSeries = (e: any) => {
    if (e.dataKey) {
      setActiveSeries((prev) => ({
        ...prev,
        [e.dataKey]: !prev[e.dataKey],
      }));
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'sales', startDate, endDate, categoryId, page],
    queryFn: () =>
      reportApi.getSalesReport(
        startDate || undefined,
        endDate || undefined,
        categoryId || undefined,
        { page, limit: ITEMS_PER_PAGE },
      ),
    staleTime: 1000 * 60 * 5,
  });

  const salesSummary = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE) || 1;
  const grandTotal = data?.grandTotal || { sales: 0, cash: 0, qris: 0 };

  const handleExportCSV = async () => {
    try {
      const result = await reportApi.exportSalesReport(
        startDate || undefined,
        endDate || undefined,
        categoryId || undefined,
      );
      if (result.error || !result.data) {
        toast.error('Gagal mengekspor data');
        return;
      }

      const csvData = result.data.map((s: SalesSummary) => [
        s.date,
        s.transaction_count,
        s.total_cash,
        s.total_qris,
        s.total_sales,
      ]);

      exportToCSV(
        csvData,
        ['Tanggal', 'Jumlah Transaksi', 'Cash', 'QRIS', 'Total Penjualan'],
        `report_sales_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      );
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const chartData = useMemo(() => [...salesSummary].reverse(), [salesSummary]);

  const pageTotalSales = useMemo(
    () => salesSummary.reduce((sum, item) => sum + item.total_sales, 0),
    [salesSummary],
  );
  const pageTotalCash = useMemo(
    () => salesSummary.reduce((sum, item) => sum + (item.total_cash || 0), 0),
    [salesSummary],
  );
  const pageTotalQris = useMemo(
    () => salesSummary.reduce((sum, item) => sum + (item.total_qris || 0), 0),
    [salesSummary],
  );
  const pageTotalTx = useMemo(
    () => salesSummary.reduce((sum, item) => sum + item.transaction_count, 0),
    [salesSummary],
  );

  const exportButton = (
    <Button
      onClick={handleExportCSV}
      disabled={salesSummary.length === 0}
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
        error={error ? 'Gagal memuat laporan penjualan' : null}
        isEmpty={!isLoading && salesSummary.length === 0}
        emptyIcon={<IconShoppingCart className="h-16 w-16" />}
      >
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 md:p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
            <div>
              <p className="text-xs font-bold text-neutral-600 md:text-sm dark:text-neutral-400">
                Grand Total Penjualan
              </p>
              <p className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-4xl dark:text-white">
                {formatCurrency(grandTotal.sales)}
              </p>
            </div>

            <div className="hidden h-px w-full bg-neutral-200 sm:block md:mx-4 md:h-12 md:w-px dark:bg-neutral-800" />
            <div className="my-0.5 h-px w-full bg-neutral-200 sm:hidden dark:bg-neutral-800" />

            <div className="grid grid-cols-2 gap-3 md:flex md:gap-8">
              <div>
                <p className="text-xs font-bold text-neutral-500 md:text-sm dark:text-neutral-400">
                  Total Cash
                </p>
                <p className="text-base font-bold text-emerald-600 md:text-xl dark:text-emerald-400">
                  {formatCurrency(grandTotal.cash)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 md:text-sm dark:text-neutral-400">
                  Total QRIS
                </p>
                <p className="text-base font-bold text-purple-600 md:text-xl dark:text-purple-400">
                  {formatCurrency(grandTotal.qris)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">
            Tren Penjualan
          </h3>
          <div className="h-[250px] w-full min-w-0 md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorQris" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: '12px', fill: '#6b7280' }}
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
                  tick={{ fontSize: '11px', fill: '#6b7280' }}
                  width={45}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                  labelStyle={{ color: '#1f2937', fontWeight: 'bold', marginBottom: '8px' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(229,231,235,0.5)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(8px)',
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  onClick={toggleSeries}
                  formatter={(value, entry) => {
                    const { dataKey } = entry as any;
                    const isActive = activeSeries[dataKey as string];
                    return (
                      <span
                        className={`cursor-pointer transition-colors ${isActive ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400 line-through dark:text-neutral-600'}`}
                      >
                        {value}
                      </span>
                    );
                  }}
                />
                <Area
                  hide={!activeSeries.total_cash}
                  type="monotone"
                  dataKey="total_cash"
                  name="Cash"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCash)"
                />
                <Area
                  hide={!activeSeries.total_qris}
                  type="monotone"
                  dataKey="total_qris"
                  name="QRIS"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorQris)"
                />
                <Area
                  hide={!activeSeries.total_sales}
                  type="monotone"
                  dataKey="total_sales"
                  name="Penjualan"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={0}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Tanggal
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Jumlah Transaksi
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Cash
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    QRIS
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Total Penjualan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {salesSummary.map((item) => (
                  <tr
                    key={item.date}
                    className="transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {item.date}
                    </td>
                    <td className="px-4 py-3.5 text-right text-neutral-700 dark:text-neutral-300">
                      {item.transaction_count}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.total_cash)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-purple-600 dark:text-purple-400">
                      {formatCurrency(item.total_qris)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(item.total_sales)}
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
                    {pageTotalTx}
                  </td>
                  <td className="px-4 py-4 text-right text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(pageTotalCash)}
                  </td>
                  <td className="px-4 py-4 text-right text-purple-600 dark:text-purple-400">
                    {formatCurrency(pageTotalQris)}
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(pageTotalSales)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block divide-y divide-neutral-100 lg:hidden dark:divide-neutral-800">
            {salesSummary.map((item) => (
              <div key={item.date} className="flex items-center justify-between p-3 md:p-4">
                <div>
                  <div className="text-sm font-medium text-neutral-900 md:text-base dark:text-neutral-100">
                    {item.date}
                  </div>
                  <div className="text-xs text-neutral-500 md:text-sm">
                    {item.transaction_count} Transaksi
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-brand-600 dark:text-brand-400 text-sm font-bold md:text-base">
                    {formatCurrency(item.total_sales)}
                  </span>
                  <div className="mt-0.5 flex flex-col items-end text-[10px] text-neutral-500 md:text-xs">
                    <span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        C: {formatCurrency(item.total_cash)}
                      </span>{' '}
                      •{' '}
                      <span className="text-purple-600 dark:text-purple-400">
                        Q: {formatCurrency(item.total_qris)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 p-3 font-bold md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <div className="text-xs text-neutral-900 md:text-sm dark:text-neutral-100">
                  Total Halaman Ini
                </div>
                <div className="text-[10px] text-neutral-500 md:text-xs">
                  {pageTotalTx} Transaksi
                </div>
              </div>
              <div className="text-right">
                <span className="text-brand-600 dark:text-brand-400 text-sm font-bold md:text-base">
                  {formatCurrency(pageTotalSales)}
                </span>
                <div className="mt-0.5 flex flex-col items-end text-[10px] md:text-xs">
                  <span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      C: {formatCurrency(pageTotalCash)}
                    </span>{' '}
                    •{' '}
                    <span className="text-purple-600 dark:text-purple-400">
                      Q: {formatCurrency(pageTotalQris)}
                    </span>
                  </span>
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
