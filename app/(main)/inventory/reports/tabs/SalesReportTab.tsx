import { useState, useEffect, useMemo } from 'react';
import { reportApi, SalesSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconShoppingCart, IconDownload } from '@tabler/icons-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SalesReportTabProps {
  startDate: string;
  endDate: string;
  categoryId: string;
  filterButton?: React.ReactNode;
  filterBadges?: React.ReactNode;
}

export function SalesReportTab({ startDate, endDate, categoryId, filterButton, filterBadges }: SalesReportTabProps) {
  const [salesSummary, setSalesSummary] = useState<SalesSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, categoryId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await reportApi.getSalesReport(startDate || undefined, endDate || undefined, categoryId || undefined, { page, limit: ITEMS_PER_PAGE });
        if (result.error) {
          setError('Gagal memuat laporan penjualan');
        } else {
          setSalesSummary(result.data || []);
          setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE) || 1);
        }
      } catch (err) {
        setError('Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, categoryId, page]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const result = await reportApi.exportSalesReport(startDate || undefined, endDate || undefined, categoryId || undefined);
      if (result.error || !result.data) {
        alert('Gagal mengekspor data');
        return;
      }
      
      const arrayToCsv = (headers: string[], rows: (string | number)[][]) => {
        return [
          headers.join(','),
          ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
      };

      const csvData = arrayToCsv(
        ['Tanggal', 'Jumlah Transaksi', 'Cash', 'QRIS', 'Total Penjualan'],
        result.data.map((s: SalesSummary) => [
          s.date, 
          s.transaction_count, 
          s.total_cash, 
          s.total_qris, 
          s.total_sales
        ])
      );

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `report_sales_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Terjadi kesalahan saat mengekspor');
    } finally {
      setExporting(false);
    }
  };

  const chartData = useMemo(() => [...salesSummary].reverse(), [salesSummary]);
  
  const totalSales = useMemo(() => salesSummary.reduce((sum, item) => sum + item.total_sales, 0), [salesSummary]);
  const totalCash = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.total_cash || 0), 0), [salesSummary]);
  const totalQris = useMemo(() => salesSummary.reduce((sum, item) => sum + (item.total_qris || 0), 0), [salesSummary]);

  const renderContent = () => {
    if (loading && salesSummary.length === 0) {
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

    if (salesSummary.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
          <IconShoppingCart className="w-16 h-16 mb-4" />
          <p className="text-lg font-medium">Tidak ada data penjualan</p>
        </div>
      );
    }

    return (
      <>
      <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 md:p-6 shadow-elevated mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">Total Penjualan</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-1 text-neutral-900 dark:text-white tracking-tight">{formatCurrency(totalSales)}</p>
          </div>
          
          <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800 hidden sm:block md:w-px md:h-12 md:mx-4" />
          <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800 sm:hidden my-1" />

          <div className="grid grid-cols-2 gap-4 md:flex md:gap-8">
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm font-medium">Total Cash</p>
              <p className="text-lg md:text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">{formatCurrency(totalCash)}</p>
            </div>
            <div>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm font-medium">Total QRIS</p>
              <p className="text-lg md:text-xl font-bold mt-0.5 text-brand-600 dark:text-brand-400">{formatCurrency(totalQris)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 mb-6 shadow-elevated">
        <h3 className="text-lg font-bold mb-4 text-neutral-800 dark:text-neutral-200">Tren Penjualan</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tickFormatter={(val) => `Rp ${val / 1000}k`} tick={{fontSize: 12}} width={80} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="total_sales" name="Total Penjualan" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="total_cash" name="Total Cash" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="total_qris" name="Total QRIS" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full">
            <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Jumlah Transaksi</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Cash</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">QRIS</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Penjualan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {salesSummary.map((item) => (
                <tr key={item.date} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 font-medium">{item.date}</td>
                  <td className="px-4 py-3.5 text-right text-neutral-700 dark:text-neutral-300">{item.transaction_count}</td>
                  <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(item.total_cash)}</td>
                  <td className="px-4 py-3.5 text-right text-purple-600 dark:text-purple-400 font-medium">{formatCurrency(item.total_qris)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_sales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {salesSummary.map((item) => (
            <div key={item.date} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.date}</div>
                <div className="text-sm text-neutral-500">{item.transaction_count} Transaksi</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-brand-600 dark:text-brand-400">{formatCurrency(item.total_sales)}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">Cash: {formatCurrency(item.total_cash)}</span> • <span className="text-purple-600 dark:text-purple-400">QRIS: {formatCurrency(item.total_qris)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 mt-4 rounded-3xl gap-4">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between w-full gap-2 mb-4">
        {filterButton}
        
        <div className="flex-1 min-w-0">
          {filterBadges}
        </div>

        <Button onClick={handleExportCSV} disabled={exporting || (salesSummary.length === 0 && !loading)} variant="secondary" size="sm" className="shrink-0 h-[40px]">
          <IconDownload size={18} />
          <span className="hidden sm:inline">{exporting ? 'Mengekspor...' : 'Export CSV Semua Data'}</span>
        </Button>
      </div>

      {renderContent()}
    </div>
  );
}
