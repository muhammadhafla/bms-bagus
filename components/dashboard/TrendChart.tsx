import { TrendData } from '@/lib/api/dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendChartProps {
  data: TrendData[];
  isLoading: boolean;
}

export function TrendChart({ data, isLoading }: TrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { weekday: 'short' });
  };

  const formatValue = (value: number) => {
    if (value === 0) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        Trend 7 Hari Terakhir
      </h3>

      <div style={{ height: 260, width: '100%', minWidth: 300 }}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#374151', opacity: 0.2 }}
            />
            <YAxis
              tickFormatter={formatValue}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#374151', opacity: 0.2 }}
            />
            <Tooltip
              formatter={(value: any) => {
                const numValue = typeof value === 'number' ? value : 0;
                return [`Rp ${new Intl.NumberFormat('id-ID').format(numValue)}`, ''];
              }}
              labelFormatter={(label) => new Date(label as string).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              contentStyle={{
                backgroundColor: 'var(--tw-bg-opacity, 1) var(--tw-bg-gray-800)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="penjualan"
              name="Penjualan"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="pembelian"
              name="Pembelian"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
