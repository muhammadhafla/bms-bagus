import { TrendData } from '@/lib/api/dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardTitle } from '@/components/ui';

interface TrendChartProps {
  data: TrendData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;

  const date = new Date(label as string);
  const formattedDate = date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-xl p-3 shadow-elevated border border-white/20 dark:border-white/10">
      <p className="text-neutral-500 dark:text-neutral-400 text-xs font-medium mb-2 uppercase tracking-wider">{formattedDate}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-neutral-600 dark:text-neutral-300 font-medium">{entry.name}:</span>
          <span className="text-neutral-900 dark:text-white font-bold tracking-tight">
            Rp {new Intl.NumberFormat('id-ID').format(entry.value)}
          </span>
        </div>
      ))}
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

      <div className="flex-1 w-full min-w-[300px]" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPembelian" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.05} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: '12px', fill: '#888888' }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: '12px', fill: '#888888' }}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#888888', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.2 }} />
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">{value}</span>}
            />
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
    </Card>
  );
}

export default TrendChart;