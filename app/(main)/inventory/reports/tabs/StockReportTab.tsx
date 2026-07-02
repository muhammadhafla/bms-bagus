import { useState, useEffect } from 'react';
import { reportApi, StockMutation } from '@/lib/api';
import { Button } from '@/components/ui';
import { IconPackage, IconDownload } from '@tabler/icons-react';

interface StockReportTabProps {
  startDate: string;
  endDate: string;
  filterButton?: React.ReactNode;
  filterBadges?: React.ReactNode;
}

export function StockReportTab({ startDate, endDate, filterButton, filterBadges }: StockReportTabProps) {
  const [stockMutations, setStockMutations] = useState<StockMutation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await reportApi.getStockMutations(startDate || undefined, endDate || undefined, { page, limit: ITEMS_PER_PAGE });
        if (result.error) {
          setError('Gagal memuat mutasi stock');
        } else {
          setStockMutations(result.data || []);
          setTotalPages(Math.ceil((result.total || 0) / ITEMS_PER_PAGE) || 1);
        }
      } catch (err) {
        setError('Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, page]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const result = await reportApi.exportStockMutations(startDate || undefined, endDate || undefined);
      if (result.error || !result.data) {
        alert('Gagal mengekspor data');
        return;
      }
      
      const arrayToCsv = (headers: string[], rows: any[][]) => {
        return [
          headers.join(','),
          ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
      };

      const csvData = arrayToCsv(
        ['Tanggal', 'Barcode', 'Nama Barang', 'Tipe', 'Qty', 'Transaksi'],
        result.data.map((m: StockMutation) => [
          new Date(m.created_at).toLocaleDateString('id-ID'), 
          m.barcode || '', 
          m.nama_barang || '', 
          m.tipe, 
          m.qty_mutation, 
          m.transaction_type
        ])
      );

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `report_stock_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Terjadi kesalahan saat mengekspor');
    } finally {
      setExporting(false);
    }
  };

  if (loading && stockMutations.length === 0) {
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

  if (stockMutations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <IconPackage className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Tidak ada data mutasi stock</p>
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

        <Button onClick={handleExportCSV} disabled={exporting} variant="secondary" size="sm" className="shrink-0 h-[40px]">
          <IconDownload size={18} />
          <span className="hidden sm:inline">{exporting ? 'Mengekspor...' : 'Export CSV Semua Data'}</span>
        </Button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
        <div className="overflow-x-auto hidden lg:block">
          <table className="w-full min-w-[900px]">
            <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barcode</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                <th className="px-4 py-4 text-center text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tipe</th>
                <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {stockMutations.map((mutation) => (
                <tr key={mutation.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                    {new Date(mutation.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">{mutation.barcode}</td>
                  <td className="px-4 py-3.5 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{mutation.nama_barang}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      mutation.type === 'in' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                    }`}>
                      {mutation.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    {mutation.qty_mutation > 0 ? `+${mutation.qty_mutation}` : mutation.qty_mutation}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-400">{mutation.transaction_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {stockMutations.map((mutation) => (
            <div key={mutation.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{mutation.nama_barang}</div>
                  <div className="text-xs text-neutral-500 font-mono mt-0.5">{mutation.barcode}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                  mutation.type === 'in' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                }`}>
                  {mutation.type === 'in' ? 'IN' : 'OUT'}
                </span>
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-500">{new Date(mutation.created_at).toLocaleDateString('id-ID')}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{mutation.transaction_type}</span>
                </div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-lg">
                  {mutation.qty_mutation > 0 ? `+${mutation.qty_mutation}` : mutation.qty_mutation}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 gap-4">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
              <Button variant="secondary" size="sm" className="flex-1 sm:flex-none justify-center" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
