import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, TopSellingItem } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { IconChartBar, IconDownload } from '@tabler/icons-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

interface TopItemsReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
  topItemsSort: 'qty' | 'profit';
}

export function TopItemsReportTab({
  startDate,
  endDate,
  categoryId,
  topItemsSort,
}: TopItemsReportTabProps) {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  // We fetch a reasonable amount of top items, since the API only supports limit, not offset.
  const FETCH_LIMIT = 200;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'top_items', startDate, endDate, categoryId, topItemsSort],
    queryFn: () =>
      reportApi.getTopSellingItems(
        startDate || undefined,
        endDate || undefined,
        categoryId || undefined,
        FETCH_LIMIT,
      ),
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
  const pagedTopItems = useMemo(
    () => topItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [topItems, page],
  );

  const handleExportCSV = async () => {
    try {
      // Re-fetch with a higher limit for export
      const result = await reportApi.getTopSellingItems(
        startDate || undefined,
        endDate || undefined,
        categoryId || undefined,
        1000,
      );
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
        item.total_profit,
      ]);

      exportToCSV(
        csvData,
        ['Rank', 'ID', 'Nama Barang', 'Kategori', 'Qty Terjual', 'Total Penjualan', 'Total Profit'],
        `report_top_items_${new Date().toISOString().split('T')[0]}.csv`,
      );
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const chartData = useMemo(() => topItems.slice(0, 10), [topItems]);

  const pageTotalQty = useMemo(
    () =>
      pagedTopItems.reduce((sum: number, item: TopSellingItem) => sum + Number(item.total_qty), 0),
    [pagedTopItems],
  );
  const pageTotalSales = useMemo(
    () =>
      pagedTopItems.reduce(
        (sum: number, item: TopSellingItem) => sum + Number(item.total_sales),
        0,
      ),
    [pagedTopItems],
  );
  const pageTotalProfit = useMemo(
    () =>
      pagedTopItems.reduce(
        (sum: number, item: TopSellingItem) => sum + Number(item.total_profit),
        0,
      ),
    [pagedTopItems],
  );

  const exportButton = (
    <Button
      onClick={handleExportCSV}
      disabled={topItems.length === 0}
      variant="secondary"
      size="sm"
      className="h-[40px] w-full shrink-0 sm:w-auto"
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
        error={error ? 'Gagal memuat laporan top items' : null}
        isEmpty={!isLoading && topItems.length === 0}
        emptyIcon={<IconChartBar className="h-16 w-16" />}
      >
        <div className="shadow-elevated mb-6 rounded-3xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
          <h3 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-200">
            Top 10 Produk ({topItemsSort === 'qty' ? 'Kuantitas' : 'Profit'})
          </h3>
          <div className="h-[300px] w-full md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.2}
                  horizontal={false}
                  vertical={true}
                />
                <XAxis
                  type="number"
                  tickFormatter={(val) => (topItemsSort === 'qty' ? val : `Rp${val / 1000}k`)}
                  tick={{ fontSize: '11px' }}
                />
                <YAxis
                  dataKey="nama_barang"
                  type="category"
                  tick={{ fontSize: '11px' }}
                  width={140}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: any, name: any) => {
                    if (name === 'total_qty') return [value, 'Qty Terjual'];
                    return [
                      formatCurrency(Number(value)),
                      name === 'total_sales' ? 'Penjualan' : 'Profit',
                    ];
                  }}
                  labelStyle={{
                    color: '#1f2937',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    fontSize: '14px',
                  }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 12px',
                  }}
                  cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
                  position={{ x: 0, y: 0 }}
                  wrapperStyle={{ pointerEvents: 'none', fontSize: '12px' }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {topItemsSort === 'qty' ? (
                  <Bar
                    dataKey="total_qty"
                    name="Qty Terjual"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={25}
                  />
                ) : (
                  <>
                    <Bar
                      dataKey="total_sales"
                      name="Total Penjualan"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={15}
                    />
                    <Bar
                      dataKey="total_profit"
                      name="Total Profit"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={15}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="shadow-elevated overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="w-16 px-4 py-4 text-center text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Rank
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Produk
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Qty Terjual
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Total Penjualan
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Total Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {pagedTopItems.map((item: TopSellingItem, index: number) => (
                  <tr
                    key={item.inventory_id}
                    className="transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          (page - 1) * ITEMS_PER_PAGE + index + 1 === 1
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            : (page - 1) * ITEMS_PER_PAGE + index + 1 === 2
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : (page - 1) * ITEMS_PER_PAGE + index + 1 === 3
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}
                      >
                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {item.nama_barang}
                      </div>
                    </td>
                    <td className="text-brand-600 dark:text-brand-400 px-4 py-3.5 text-right font-bold">
                      {item.total_qty}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(item.total_sales)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-bold ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {formatCurrency(item.total_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50 font-bold dark:border-neutral-800 dark:bg-neutral-900">
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    Total Halaman Ini
                  </td>
                  <td className="text-brand-600 dark:text-brand-400 px-4 py-4 text-right">
                    {pageTotalQty}
                  </td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(pageTotalSales)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {formatCurrency(pageTotalProfit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block divide-y divide-neutral-100 lg:hidden dark:divide-neutral-800">
            {pagedTopItems.map((item: TopSellingItem, index: number) => (
              <div key={item.inventory_id} className="flex gap-2 p-3 md:gap-3 md:p-4">
                <div className="pt-0.5">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold md:h-6 md:w-6 md:text-xs ${
                      (page - 1) * ITEMS_PER_PAGE + index + 1 === 1
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        : (page - 1) * ITEMS_PER_PAGE + index + 1 === 2
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : (page - 1) * ITEMS_PER_PAGE + index + 1 === 3
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                  >
                    {(page - 1) * ITEMS_PER_PAGE + index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm leading-tight font-medium text-neutral-900 md:text-base dark:text-neutral-100">
                    {item.nama_barang}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-neutral-100 pt-2 md:mt-3 md:gap-2 md:pt-3 dark:border-neutral-800">
                    <div>
                      <div className="text-[8px] font-semibold text-neutral-500 uppercase md:text-[10px]">
                        Qty
                      </div>
                      <div className="text-brand-600 dark:text-brand-400 text-xs font-bold md:text-sm">
                        {item.total_qty}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-semibold text-neutral-500 uppercase md:text-[10px]">
                        Penjualan
                      </div>
                      <div className="text-[10px] font-medium md:text-sm">
                        {formatCurrency(item.total_sales)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-semibold text-neutral-500 uppercase md:text-[10px]">
                        Profit
                      </div>
                      <div
                        className={`text-[10px] font-bold md:text-sm ${item.total_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                      >
                        {formatCurrency(item.total_profit)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-1.5 border-t border-neutral-200 bg-neutral-50 p-3 font-bold md:gap-2 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-0.5 border-b border-neutral-200 pb-1.5 text-xs text-neutral-900 md:mb-1 md:pb-2 md:text-sm dark:border-neutral-700 dark:text-neutral-100">
                Total Halaman Ini
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-sm md:gap-2">
                <div>
                  <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                    Qty
                  </span>
                  <div className="text-brand-600 dark:text-brand-400 text-xs font-bold md:text-sm">
                    {pageTotalQty}
                  </div>
                </div>
                <div>
                  <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                    Penjualan
                  </span>
                  <div className="text-[10px] font-medium md:text-sm">
                    {formatCurrency(pageTotalSales)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                    Profit
                  </span>
                  <div
                    className={`text-[10px] font-bold md:text-sm ${pageTotalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
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
