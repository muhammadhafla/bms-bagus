import { TrendData } from '@/lib/api/dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardTitle } from '@/components/ui';

interface TrendChartProps {
  data: TrendData[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload) return null;

  const date = new Date(label as string);
  const formattedDate = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-neutral-900 dark:bg-neutral-800 rounded-lg p-3 shadow-lg border border-neutral-700">
      <p className="text-neutral-200 text-sm mb-2">{formattedDate}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-neutral-400">{entry.name}:</span>
          <span className="text-white font-medium">
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
      <Card padding="lg" className="border border-neutral-200 dark:border-neutral-800">
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-40 mb-4" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </Card>
    );
  }

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { weekday: 'short' });
  };

  const formatValue = (value: number) => {
    if (value === 0) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
    return value.toString();
  };

  return (
    <Card padding="lg" className="border border-neutral-200 dark:border-neutral-800">
      <CardTitle>Trend 7 Hari Terakhir</CardTitle>

      <div style={{ height: 260, width: '100%', minWidth: 300 }}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#374151', opacity: 0.2 }}
              tickLine={{ stroke: '#374151', opacity: 0.2 }}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#374151', opacity: 0.2 }}
              tickLine={{ stroke: '#374151', opacity: 0.2 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value) => <span className="text-neutral-600 dark:text-neutral-400 text-sm">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="penjualan"
              name="Penjualan"
              stroke="#14B8A6"
              strokeWidth={2.5}
              dot={{ fill: '#14B8A6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="pembelian"
              name="Pembelian"
              stroke="#F59E0B"
              strokeWidth={2.5}
              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default TrendChart;