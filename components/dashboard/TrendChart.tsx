import { TrendData } from '@/lib/api/dashboard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardTitle } from '@/components/ui';

interface TrendChartProps {
  data: TrendData[];
  isLoading: boolean;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const date = new Date(label as string);
  const formattedDate = date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="shadow-elevated min-w-[180px] rounded-xl border border-white/20 bg-white/90 p-3 backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/90">
      <p className="mb-2 border-b border-neutral-100 pb-2 text-xs font-medium tracking-wider text-neutral-500 uppercase dark:border-neutral-800 dark:text-neutral-400">
        {formattedDate}
      </p>
      <div className="flex flex-col gap-2">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm font-medium">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-neutral-500 capitalize dark:text-neutral-400">
                {entry.name}
              </span>
            </div>
            <span className="font-bold tracking-tight text-neutral-900 dark:text-white">
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
      <Card
        padding="lg"
        variant="flat"
        className="border border-white/20 bg-white/50 backdrop-blur dark:border-white/5 dark:bg-neutral-900/40"
      >
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-40 rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
          <div className="h-52 rounded-xl bg-neutral-200/50 dark:bg-neutral-700/50" />
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
    <Card
      padding="md"
      variant="flat"
      className="flex h-full flex-col border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
    >
      <CardTitle className="mb-4 shrink-0">Trend 7 Hari Terakhir</CardTitle>

      <div
        className="relative flex w-full min-w-[300px] flex-1 flex-col gap-2 pt-2 md:gap-4"
        style={{ minHeight: 350 }}
      >
        {/* Penjualan Chart */}
        <div className="relative min-h-[120px] w-full flex-1 border-b border-neutral-100 pb-2 dark:border-neutral-800/50">
          <p className="absolute top-0 left-4 z-10 rounded-full bg-white/50 px-2 text-xs font-bold text-teal-500 shadow-sm backdrop-blur-sm dark:bg-neutral-800/50">
            Penjualan
          </p>
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <AreaChart
              data={data}
              syncId="trendDashboard"
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-neutral-200 dark:text-neutral-800"
                opacity={0.3}
                vertical={false}
              />
              <XAxis dataKey="date" tick={false} tickLine={false} axisLine={false} height={10} />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: '10px', fill: '#888888' }}
                axisLine={false}
                tickLine={false}
                dx={-10}
                width={45}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
              />
              <Area
                type="monotone"
                dataKey="penjualan"
                name="Penjualan"
                stroke="#14B8A6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPenjualan)"
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: '#14B8A6',
                  className: 'animate-pulse-glow',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pembelian Chart */}
        <div className="relative min-h-[120px] w-full flex-1 pt-2">
          <p className="absolute top-0 left-4 z-10 rounded-full bg-white/50 px-2 text-xs font-bold text-orange-500 shadow-sm backdrop-blur-sm dark:bg-neutral-800/50">
            Pembelian
          </p>
          <ResponsiveContainer width="100%" height="100%" minHeight={1}>
            <AreaChart
              data={data}
              syncId="trendDashboard"
              margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorPembelian" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-neutral-200 dark:text-neutral-800"
                opacity={0.3}
                vertical={false}
              />
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
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
              />
              <Area
                type="monotone"
                dataKey="pembelian"
                name="Pembelian"
                stroke="#F59E0B"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorPembelian)"
                activeDot={{
                  r: 6,
                  strokeWidth: 0,
                  fill: '#F59E0B',
                  className: 'animate-pulse-glow',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

export default TrendChart;
