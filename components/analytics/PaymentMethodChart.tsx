import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { PaymentMethods } from '@/lib/api/analytics';
import { formatCurrency } from '@/lib/utils';

export function PaymentMethodChart({
  data,
  isLoading,
}: {
  data: PaymentMethods | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!data || (data.total_cash === 0 && data.total_qris === 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">Belum ada data pembayaran</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Cash', value: data.total_cash, color: '#10b981' }, // Green for cash
    { name: 'QRIS', value: data.total_qris, color: '#3b82f6' }, // Blue for QRIS
  ].filter((item) => item.value > 0);

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-2 text-base font-semibold text-neutral-900 md:mb-4 dark:text-white">
        Distribusi Metode Pembayaran
      </h3>
      <div className="h-[200px] w-full min-w-0 md:h-[250px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: any) => formatCurrency(value)}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
