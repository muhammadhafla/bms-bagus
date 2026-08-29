import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { CategoryPerformance } from '@/lib/api/analytics';
import { formatCurrency } from '@/lib/utils';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

export function CategoryPieChart({
  data,
  isLoading,
}: {
  data: CategoryPerformance[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">Belum ada data kategori</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="mb-2 text-base font-semibold text-neutral-900 md:mb-4 dark:text-white">
        Kategori Terlaris (Berdasarkan Pendapatan)
      </h3>
      <div className="h-[200px] w-full min-w-0 md:h-[250px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="total_revenue"
              nameKey="category_name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
