import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, InventoryValue } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconCash, IconDownload } from '@tabler/icons-react';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

export function ValueReportTab() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'inventory_value', page],
    queryFn: () => reportApi.getInventoryValue({ page, limit: ITEMS_PER_PAGE })
  });

  const inventoryValue = useMemo(() => data?.data || [], [data?.data]);
  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE) || 1;

  const handleExportCSV = async () => {
    try {
      // Export all inventory - we can just fetch without limit for export or use a specific export method. 
      // Since there's no exportInventoryValue yet, we can simulate by fetching large limit or just export current page.
      // Ideally, there should be an export method. Let's just fetch page 1 with limit 10000 for simplicity.
      const result = await reportApi.getInventoryValue({ page: 1, limit: 10000 });
      if (result.error || !result.data) {
        alert('Gagal mengekspor data');
        return;
      }
      
      const csvData = result.data.map((item: InventoryValue) => [
        item.barcode,
        item.nama_barang,
        item.kategori,
        item.stok,
        item.harga_beli,
        item.harga_jual,
        item.total_value
      ]);
      
      exportToCSV(
        csvData, 
        ['Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Harga Beli', 'Harga Jual', 'Nilai Total'], 
        `report_inventory_value_${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (err) {
      alert('Terjadi kesalahan saat mengekspor');
    }
  };

  const pageTotalValue = useMemo(() => inventoryValue.reduce((sum, item) => sum + item.total_value, 0), [inventoryValue]);
  const pageTotalStok = useMemo(() => inventoryValue.reduce((sum, item) => sum + item.stok, 0), [inventoryValue]);

  const exportButton = (
    <Button onClick={handleExportCSV} disabled={inventoryValue.length === 0} variant="secondary" size="sm" className="shrink-0 h-[40px] w-full sm:w-auto">
      <IconDownload size={18} />
      <span>Export CSV</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        {exportButton}
      </div>

      <ReportState 
        loading={isLoading} 
        error={error ? 'Gagal memuat nilai inventaris' : null} 
        isEmpty={!isLoading && inventoryValue.length === 0}
        emptyIcon={<IconCash className="w-16 h-16" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated">
            <p className="text-emerald-100 text-sm font-medium">Total Nilai (Halaman Ini)</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-1 tracking-tight">{formatCurrency(pageTotalValue)}</p>
          </div>
          <div className="bg-gradient-to-br from-brand-500/90 to-brand-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated">
            <p className="text-brand-100 text-sm font-medium">Total Stok Item (Halaman Ini)</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-1 tracking-tight">{pageTotalStok}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barcode</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nama Barang</th>
                  <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Kategori</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Stok</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Harga Beli</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Harga Jual</th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nilai Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {inventoryValue.map((item) => (
                  <tr key={item.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-mono text-neutral-700 dark:text-neutral-300">{item.barcode}</td>
                    <td className="px-4 py-3.5 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{item.nama_barang}</td>
                    <td className="px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-600 dark:text-brand-400">{item.stok}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.harga_beli)}</td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.harga_jual)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</td>
                  <td className="px-4 py-4 text-right text-brand-600 dark:text-brand-400">{pageTotalStok}</td>
                  <td colSpan={2}></td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">{formatCurrency(pageTotalValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
            {inventoryValue.map((item) => (
              <div key={item.id} className="p-3 md:p-4 flex flex-col gap-2 md:gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm md:text-base text-neutral-900 dark:text-neutral-100 leading-tight truncate">{item.nama_barang}</div>
                    <div className="text-[10px] md:text-xs text-neutral-500 font-mono mt-0.5">{item.barcode}</div>
                  </div>
                  <span className="shrink-0 inline-flex items-center px-1.5 py-[2px] md:px-2.5 md:py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] md:text-xs font-medium">
                    {item.kategori}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-sm mt-0.5 md:mt-1">
                  <div>
                    <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Stok</span>
                    <div className="font-bold text-xs md:text-sm text-brand-600 dark:text-brand-400">{item.stok}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Nilai Total</span>
                    <div className="font-bold text-xs md:text-sm text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_value)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Hrg Beli</span>
                    <div className="text-[10px] md:text-sm text-neutral-700 dark:text-neutral-300">{formatCurrency(item.harga_beli)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-neutral-500 text-[8px] md:text-[10px] uppercase block mb-0.5 md:mb-1">Hrg Jual</span>
                    <div className="text-[10px] md:text-sm text-neutral-700 dark:text-neutral-300">{formatCurrency(item.harga_jual)}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 font-bold border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
              <div>
                <div className="text-xs md:text-sm text-neutral-900 dark:text-neutral-100">Total Halaman Ini</div>
                <div className="text-[10px] md:text-xs text-neutral-500 mt-0.5">Stok: <span className="text-brand-600 dark:text-brand-400">{pageTotalStok}</span></div>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm md:text-base text-neutral-900 dark:text-neutral-100">{formatCurrency(pageTotalValue)}</span>
              </div>
            </div>
          </div>
        </div>

        <ReportPagination 
          page={page} 
          totalPages={totalPages} 
          onPageChange={setPage} 
          actions={exportButton}
        />
      </ReportState>
    </div>
  );
}
