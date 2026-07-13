import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { analyticsApi } from '@/lib/api';

const formatRupiah = (value: number) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const CustomTooltip = ({ active, payload, label, groupBy }: any) => {
  if (active && payload && payload.length) {
    let formattedLabel = label;
    if (groupBy === 'hour') formattedLabel = `Pukul ${label}`;
    else if (groupBy === 'day') formattedLabel = `Hari ${label}`;

    return (
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md p-4 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-xl min-w-[200px]" style={{ willChange: 'transform' }}>
        <p className="font-semibold text-neutral-900 dark:text-white mb-3 text-sm pb-2 border-b border-neutral-100 dark:border-neutral-800">
          {formattedLabel}
        </p>
        <div className="flex flex-col gap-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-neutral-500 dark:text-neutral-400 capitalize">{entry.name}</span>
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

export function BusiestTimeChart({ startDate, endDate }: { startDate: string, endDate: string }) {
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'date'>('hour');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'salesTrend', startDate, endDate, groupBy],
    queryFn: () => analyticsApi.getSalesTrend(startDate, endDate, groupBy).then(res => res.data),
  });

  const getTitle = () => {
    const groupStr = groupBy === 'hour' ? 'per Jam' : groupBy === 'day' ? 'per Hari' : 'per Tanggal';
    return `Tren Transaksi & Pendapatan ${groupStr}`;
  };

  // Komponen Synchronized Charts (Tampilan Utama)
  const renderSynchronizedCharts = () => {
    return (
      <div className="absolute inset-0 flex flex-col gap-2 md:gap-4 pt-2">
        <div className="flex-1 min-h-[100px] md:min-h-[150px] w-full relative border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
          <p className="absolute top-0 left-4 text-xs font-bold text-accent-teal-500 z-10 bg-white/50 dark:bg-neutral-800/50 px-2 rounded-full backdrop-blur-sm shadow-sm">Pendapatan</p>
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <AreaChart data={data} syncId="busiestTime" margin={{ top: 20, right: 10, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" opacity={0.5} />
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
              <RechartsTooltip content={<CustomTooltip groupBy={groupBy} />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }} />
              <Area type="monotone" dataKey="total_revenue" name="Pendapatan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-1 min-h-[100px] md:min-h-[150px] w-full relative pt-2">
          <p className="absolute top-0 left-4 text-xs font-bold text-brand-500 z-10 bg-white/50 dark:bg-neutral-800/50 px-2 rounded-full backdrop-blur-sm shadow-sm">Transaksi</p>
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <AreaChart data={data} syncId="busiestTime" margin={{ top: 20, right: 10, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" opacity={0.5} />
              <XAxis dataKey="label_waktu" tick={{ fontSize: '10px', fill: '#888' }} tickLine={false} axisLine={false} dy={10} minTickGap={15} />
              <YAxis 
                tick={{ fontSize: '10px', fill: '#888' }} 
                tickLine={false} 
                axisLine={false}
                width={45}
              />
              <RechartsTooltip content={<CustomTooltip groupBy={groupBy} />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '5 5' }} />
              <Area type="monotone" dataKey="transaction_count" name="Transaksi" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTx)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-3 md:p-5 shadow-elevated h-full flex flex-col min-h-[350px] md:min-h-[450px] overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 dark:text-white shrink-0 leading-tight">{getTitle()}</h3>
        
          <div className="flex items-center gap-2 md:gap-3 ml-auto md:ml-0">
            {/* GroupBy Toggle */}
            <div className="flex bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur p-1 rounded-xl shadow-inner text-[10px] md:text-sm">
              <button 
                onClick={() => setGroupBy('hour')}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all ${groupBy === 'hour' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                Jam
              </button>
              <button 
                onClick={() => setGroupBy('day')}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all ${groupBy === 'day' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                Hari
              </button>
              <button 
                onClick={() => setGroupBy('date')}
                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all ${groupBy === 'date' ? 'bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
              >
                Tanggal
              </button>
            </div>
          </div>
      </div>

      <div className="w-full flex-1 relative mt-1">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-900/50 rounded-2xl animate-pulse z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-500 font-medium">Memuat data...</p>
            </div>
          </div>
        ) : (!data || data.length === 0) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50/50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
            <p className="text-neutral-500 font-medium">Belum ada data transaksi</p>
          </div>
        ) : (
          renderSynchronizedCharts()
        )}
      </div>
    </div>
  );
}
