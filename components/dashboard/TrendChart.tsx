import { TrendData } from '@/lib/api/dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardTitle } from '@/components/ui';

interface TrendChartProps {
  data: TrendData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload || payload.length === 0) return null;

  const date = new Date(label as string);
  const formattedDate = date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-xl p-3 shadow-elevated border border-white/20 dark:border-white/10 min-w-[180px]">
      <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-2 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800 pb-2">{formattedDate}</p>
      <div className="flex flex-col gap-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-neutral-500 dark:text-neutral-400 capitalize">{entry.name}</span>
            </div>
            <span className="text-neutral-900 dark:text-white font-bold tracking-tight">
              Rp {new Intl.NumberFormat('id-ID').format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function TrendChart({ data, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <Card padding="lg" variant="flat" className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur border border-white/20 dark:border-white/5">
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-200/50 dark:bg-neutral-700/50 rounded w-40 mb-4" />
          <div className="h-52 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-xl" />
        </div>
      </Card>
    );
  }

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short' });
  };

  const formatValue = (value: number) => {
    if (value === 0) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
    return value.toString();
  };

  return (
    <Card padding="md" variant="flat" className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 h-full flex flex-col">
      <CardTitle className="mb-4 shrink-0">Trend 7 Hari Terakhir</CardTitle>

      <div className="flex-1 w-full min-w-[300px] flex flex-col gap-2 md:gap-4 relative pt-2" style={{ minHeight: 350 }}>
        
        {/* Penjualan Chart */}
        <div className="flex-1 min-h-[120px] w-full relative border-b border-neutral-100 dark:border-neutral-800/50 pb-2">
          <p className="absolute top-0 left-4 text-xs font-bold text-teal-500 z-10 bg-white/50 dark:bg-neutral-800/50 px-2 rounded-full backdrop-blur-sm shadow-sm">Penjualan</p>
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <AreaChart data={data} syncId="trendDashboard" margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" opacity={0.3} vertical={false} />
              <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} height={10} />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: '10px', fill: '#888888' }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />
              <Area
                type="monotone"
                dataKey="penjualan"
                name="Penjualan"
                stroke="#14B8A6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPenjualan)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#14B8A6', className: 'animate-pulse-glow' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pembelian Chart */}
        <div className="flex-1 min-h-[120px] w-full relative pt-2">
          <p className="absolute top-0 left-4 text-xs font-bold text-orange-500 z-10 bg-white/50 dark:bg-neutral-800/50 px-2 rounded-full backdrop-blur-sm shadow-sm">Pembelian</p>
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <AreaChart data={data} syncId="trendDashboard" margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorPembelian" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: '10px', fill: '#888888' }}
                axisLine={false}
                tickLine={false}
                dy={10}
                minTickGap={15}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: '10px', fill: '#888888' }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />
              <Area
                type="monotone"
                dataKey="pembelian"
                name="Pembelian"
                stroke="#F59E0B"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPembelian)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#F59E0B', className: 'animate-pulse-glow' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>
    </Card>
  );
}

export default TrendChart;