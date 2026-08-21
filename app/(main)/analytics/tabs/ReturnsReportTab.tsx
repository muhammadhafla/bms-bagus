import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, ReturnAnalytics } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IconRotateClockwise2, IconPackage, IconAlertCircle } from '@tabler/icons-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ReportState } from '@/components/analytics/ReportState';

interface ReturnsReportTabProps {
  startDate: string;
  endDate: string;
}

export function ReturnsReportTab({ startDate, endDate }: ReturnsReportTabProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'returns', startDate, endDate],
    queryFn: () =>
      analyticsApi
        .getReturnAnalytics(startDate || undefined, endDate || undefined)
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  });

  const returnData: ReturnAnalytics = data || {
    kpi: { total_revenue_returned: 0, total_transactions: 0 },
    top_items: [],
    reasons: [],
  };

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6'];

  const isEmpty = returnData.kpi.total_transactions === 0;

  return (
    <ReportState
      loading={isLoading}
      error={error ? (error as Error).message : null}
      isEmpty={isEmpty}
      emptyTitle="Tidak ada data retur"
      emptyDescription="Tidak ada data retur penjualan pada periode ini."
    >
      <div className="animate-fade-in-up space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <IconRotateClockwise2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Nominal Retur
              </p>
              <h3 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(returnData.kpi.total_revenue_returned)}
              </h3>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <IconAlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Transaksi Retur
              </p>
              <h3 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
                {returnData.kpi.total_transactions}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Returned Items */}
          <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <IconPackage className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                Barang Sering Diretur
              </h3>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase dark:bg-neutral-800/50 dark:text-neutral-400">
                  <tr>
                    <th className="rounded-l-lg px-4 py-3 font-medium">Nama Barang</th>
                    <th className="px-4 py-3 text-right font-medium">Qty</th>
                    <th className="rounded-r-lg px-4 py-3 text-right font-medium">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {returnData.top_items.map((item: any, idx: number) => (
                    <tr
                      key={item.inventory_id || idx}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">
                        {item.nama_barang}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {item.total_qty}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {formatCurrency(item.total_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reasons Distribution */}
          <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <IconAlertCircle className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">Alasan Retur</h3>
            </div>

            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={returnData.reasons}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="reason"
                  >
                    {returnData.reasons.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} transaksi`, 'Jumlah']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </ReportState>
  );
}
