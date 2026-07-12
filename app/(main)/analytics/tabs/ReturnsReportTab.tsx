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
    queryFn: () => analyticsApi.getReturnAnalytics(startDate || undefined, endDate || undefined).then(res => res.data)
  });

  const returnData: ReturnAnalytics = data || {
    kpi: { total_revenue_returned: 0, total_transactions: 0 },
    top_items: [],
    reasons: []
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
      <div className="space-y-6 animate-fade-in-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shrink-0">
            <IconRotateClockwise2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Total Nominal Retur</p>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
              {formatCurrency(returnData.kpi.total_revenue_returned)}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center shrink-0">
            <IconAlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Total Transaksi Retur</p>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
              {returnData.kpi.total_transactions}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Returned Items */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <IconPackage className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Barang Sering Diretur</h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 uppercase">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg font-medium">Nama Barang</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 rounded-r-lg font-medium text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {returnData.top_items.map((item: any, idx: number) => (
                  <tr key={item.inventory_id || idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3 text-neutral-900 dark:text-white font-medium">{item.nama_barang}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 text-right">{item.total_qty}</td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 text-right">{formatCurrency(item.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reasons Distribution */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <IconAlertCircle className="w-4 h-4" />
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
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>
    </ReportState>
  );
}
