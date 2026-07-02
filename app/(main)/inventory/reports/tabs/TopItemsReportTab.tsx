import { useState, useEffect } from 'react';
import { reportApi, TopSellingItem } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconChartBar, IconDownload } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopItemsReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
  filterButton?: React.ReactNode;
  filterBadges?: React.ReactNode;
  topItemsSort: 'qty' | 'profit';
}

export function TopItemsReportTab({ startDate, endDate, categoryId, filterButton, filterBadges, topItemsSort }: TopItemsReportTabProps) {
  const [topItems, setTopItems] = useState<TopSellingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await reportApi.getTopSellingItems(startDate || undefined, endDate || undefined, categoryId || undefined, 20);
        if (result.error) {
          setError('Gagal memuat barang terlaris');
        } else {
          setTopItems(result.data || []);
        }
      } catch (err) {
        setError('Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, categoryId]);

  const handleExportCSV = () => {
    const sorted = [...topItems].sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit);
    
    const arrayToCsv = (headers: string[], rows: any[][]) => {
      return [
        headers.join(','),
        ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
    };

    const csvData = arrayToCsv(
      ['Barang', 'Qty Terjual', 'Total Penjualan', 'Total Profit'],
      sorted.map(t => [t.nama_barang, t.total_qty, t.total_sales, t.total_profit])
    );

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_top_items_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loading && topItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-700 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 p-4 bg-danger-50 text-danger-600 rounded-xl text-sm border border-danger-100 flex items-center gap-2">
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (topItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <IconChartBar className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Tidak ada data penjualan barang</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between w-full gap-2 mb-4">
        {filterButton}
        
        <div className="flex-1 min-w-0">
          {filterBadges}
        </div>

        <Button onClick={handleExportCSV} variant="secondary" size="sm" className="shrink-0 h-[40px]">
          <IconDownload size={18} />
          <span className="hidden sm:inline">Export CSV Semua Data</span>
        </Button>
      </div>
      
      <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-4 mb-4 shadow-elevated">
        <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">10 Barang Terlaris ({topItemsSort === 'qty' ? 'Kuantitas' : 'Profit'})</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={[...topItems].sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit).slice(0, 10)} 
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="nama_barang" tick={{fontSize: 11}} width={150} tickFormatter={(val) => val.length > 15 ? val.substring(0,15) + '...' : val} />
              <YAxis tick={{fontSize: 12}} tickFormatter={(val) => topItemsSort === 'profit' ? `Rp ${val / 1000}k` : val} />
              <Tooltip formatter={(value: any) => topItemsSort === 'profit' ? formatCurrency(Number(value)) : value} />
              <Bar 
                dataKey={topItemsSort === 'qty' ? 'total_qty' : 'total_profit'} 
                name={topItemsSort === 'qty' ? 'Qty Terjual' : 'Total Profit'} 
                fill="#8b5cf6" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Qty Terjual</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[...topItems]
                .sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit)
                .map((item) => (
                  <tr key={item.inventory_id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.nama_barang}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">{item.total_qty}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.total_sales)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-600 dark:text-brand-400">{formatCurrency(item.total_profit)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {[...topItems]
            .sort((a, b) => topItemsSort === 'qty' ? b.total_qty - a.total_qty : b.total_profit - a.total_profit)
            .map((item) => (
              <div key={item.inventory_id} className="p-4 flex flex-col gap-2">
                <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">{item.nama_barang}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-neutral-500 text-xs">Qty Terjual</span>
                    <div className="font-semibold">{item.total_qty}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 text-xs">Total Profit</span>
                    <div className="font-bold text-brand-600 dark:text-brand-400">{formatCurrency(item.total_profit)}</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
