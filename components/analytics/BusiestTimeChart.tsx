import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { analyticsApi } from '@/lib/api';

const formatRupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const CustomTooltip = ({ active, payload, label, groupBy }: any) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    if (groupBy === 'hour') formattedLabel = `Pukul ${label}`;
    else if (groupBy === 'day') formattedLabel = `Hari ${label}`;
    else if (groupBy === 'date') {
      const d = new Date(label);
      if (!isNaN(d.getTime()))
        formattedLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }

    return (
      <div
        className="rounded-xl border border-neutral-200/50 bg-white/90 p-2 shadow-xl backdrop-blur-md md:p-4 dark:border-neutral-700/50 dark:bg-neutral-900/90"
        style={{ willChange: 'transform' }}
      >
        <p className="mb-2 border-b border-neutral-100 pb-1 text-xs font-semibold text-neutral-900 md:mb-3 md:pb-2 md:text-sm dark:border-neutral-800 dark:text-white">
          {formattedLabel}
        </p>
        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 text-sm font-medium"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-neutral-500 capitalize dark:text-neutral-400">
                  {entry.name}
                </span>
              </div>
              <span className="text-neutral-900 dark:text-white">
                {entry.dataKey === 'total_revenue' ? formatRupiah(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function BusiestTimeChart({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'date'>('hour');
  const [activeTab, setActiveTab] = useState<'revenue' | 'transaction'>('revenue');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'salesTrend', startDate, endDate, groupBy],
    queryFn: () => analyticsApi.getSalesTrend(startDate, endDate, groupBy).then((res) => res.data),
  });

  const getTitle = () => {
    const groupStr =
      groupBy === 'hour' ? 'per Jam' : groupBy === 'day' ? 'per Hari' : 'per Tanggal';
    return `Tren Transaksi & Pendapatan ${groupStr}`;
  };

  const renderRevenueChart = () => (
    <div className="relative min-h-[150px] w-full flex-1 border-b border-neutral-100 pb-2 dark:border-neutral-800/50">
      <p className="text-accent-teal-500 absolute top-0 left-4 z-10 rounded-full bg-white/50 px-2 text-xs font-bold shadow-sm backdrop-blur-sm dark:bg-neutral-800/50">
        Pendapatan
      </p>
      <ResponsiveContainer width="100%" height="100%" minHeight={1}>
        <AreaChart data={data} margin={{ top: 20, right: 10, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-neutral-200 dark:text-neutral-800"
            opacity={0.5}
          />
          <XAxis dataKey="label_waktu" tick={false} tickLine={false} axisLine={false} height={10} />
          <YAxis
            tick={{ fontSize: '10px', fill: '#888' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return val.toString();
            }}
            width={45}
          />
          <RechartsTooltip
            content={<CustomTooltip groupBy={groupBy} />}
            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
            position={{ y: 0 }}
            wrapperStyle={{ pointerEvents: 'none' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="total_revenue"
            name="Pendapatan"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorRev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTransactionChart = () => (
    <div className="relative min-h-[150px] w-full flex-1 pt-2">
      <p className="text-brand-500 absolute top-0 left-4 z-10 rounded-full bg-white/50 px-2 text-xs font-bold shadow-sm backdrop-blur-sm dark:bg-neutral-800/50">
        Transaksi
      </p>
      <ResponsiveContainer width="100%" height="100%" minHeight={1}>
        <AreaChart data={data} margin={{ top: 20, right: 10, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-neutral-200 dark:text-neutral-800"
            opacity={0.5}
          />
          <XAxis
            dataKey="label_waktu"
            tick={{ fontSize: '10px', fill: '#888' }}
            tickLine={false}
            axisLine={false}
            dy={10}
            minTickGap={15}
            tickFormatter={(val) => {
              if (groupBy === 'date') {
                const d = new Date(val);
                if (!isNaN(d.getTime()))
                  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              }
              return val;
            }}
          />
          <YAxis
            tick={{ fontSize: '10px', fill: '#888' }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <RechartsTooltip
            content={<CustomTooltip groupBy={groupBy} />}
            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }}
            position={{ y: 0 }}
            wrapperStyle={{ pointerEvents: 'none' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="transaction_count"
            name="Transaksi"
            stroke="#3b82f6"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTx)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderSynchronizedCharts = () => {
    return (
      <div className="absolute inset-0 flex flex-col pt-2">
        {/* Mobile View (Tabbed) */}
        <div className="flex h-full w-full flex-col md:hidden">
          {activeTab === 'revenue' ? renderRevenueChart() : renderTransactionChart()}
        </div>

        {/* Desktop View (Stacked) */}
        <div className="hidden h-full w-full flex-col gap-4 md:flex">
          {renderRevenueChart()}
          {renderTransactionChart()}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[350px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 md:min-h-[450px] md:p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <h3 className="shrink-0 text-base leading-tight font-bold text-neutral-900 md:text-lg dark:text-white">
          {getTitle()}
        </h3>

        <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
          {/* GroupBy Toggle */}
          <div className="flex rounded-xl bg-neutral-100/80 p-1 text-[10px] shadow-inner backdrop-blur md:text-sm dark:bg-neutral-800/80">
            <button
              onClick={() => setGroupBy('hour')}
              className={`rounded-lg px-2 py-1 transition-all md:px-3 md:py-1.5 ${groupBy === 'hour' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Jam
            </button>
            <button
              onClick={() => setGroupBy('day')}
              className={`rounded-lg px-2 py-1 transition-all md:px-3 md:py-1.5 ${groupBy === 'day' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Hari
            </button>
            <button
              onClick={() => setGroupBy('date')}
              className={`rounded-lg px-2 py-1 transition-all md:px-3 md:py-1.5 ${groupBy === 'date' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Tanggal
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="mb-2 flex w-full rounded-xl bg-neutral-100/80 p-1 text-xs shadow-inner backdrop-blur md:hidden dark:bg-neutral-800/80">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex-1 rounded-lg py-1.5 transition-all ${activeTab === 'revenue' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Pendapatan
        </button>
        <button
          onClick={() => setActiveTab('transaction')}
          className={`flex-1 rounded-lg py-1.5 transition-all ${activeTab === 'transaction' ? 'bg-white font-semibold text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Transaksi
        </button>
      </div>

      <div className="relative mt-1 w-full flex-1">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center rounded-2xl bg-white/50 backdrop-blur-sm dark:bg-neutral-900/50">
            <div className="flex flex-col items-center gap-3">
              <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
              <p className="font-medium text-neutral-500">Memuat data...</p>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/50">
            <p className="font-medium text-neutral-500">Belum ada data transaksi</p>
          </div>
        ) : (
          renderSynchronizedCharts()
        )}
      </div>
    </div>
  );
}
