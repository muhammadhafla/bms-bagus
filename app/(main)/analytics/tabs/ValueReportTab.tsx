import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, InventoryValue } from '@/lib/api';
import { formatCurrency, exportToCSV } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { IconCash, IconDownload, IconPackage } from '@tabler/icons-react';
import { ReportState } from '@/components/analytics/ReportState';
import { ReportPagination } from '@/components/analytics/ReportPagination';

export function ValueReportTab() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', 'inventory_value', page],
    queryFn: () => reportApi.getInventoryValue({ page, limit: ITEMS_PER_PAGE }),
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
        toast.error('Gagal mengekspor data');
        return;
      }

      const csvData = result.data.map((item: InventoryValue) => [
        item.barcode,
        item.nama_barang,
        item.kategori,
        item.stok,
        item.harga_beli,
        item.harga_jual,
        item.total_value,
      ]);

      exportToCSV(
        csvData,
        ['Barcode', 'Nama Barang', 'Kategori', 'Stok', 'Harga Beli', 'Harga Jual', 'Nilai Total'],
        `report_inventory_value_${new Date().toISOString().split('T')[0]}.csv`,
      );
    } catch (err) {
      toast.error('Terjadi kesalahan saat mengekspor');
    }
  };

  const pageTotalValue = useMemo(
    () => inventoryValue.reduce((sum, item) => sum + item.total_value, 0),
    [inventoryValue],
  );
  const pageTotalStok = useMemo(
    () => inventoryValue.reduce((sum, item) => sum + item.stok, 0),
    [inventoryValue],
  );

  const exportButton = (
    <Button
      onClick={handleExportCSV}
      disabled={inventoryValue.length === 0}
      variant="secondary"
      size="sm"
      className="h-[40px] w-full shrink-0 sm:w-auto"
    >
      <IconDownload size={18} />
      <span>Export CSV</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="mb-4 flex justify-end">{exportButton}</div>

      <ReportState
        loading={isLoading}
        error={error ? 'Gagal memuat nilai inventaris' : null}
        isEmpty={!isLoading && inventoryValue.length === 0}
        emptyIcon={<IconCash className="h-16 w-16" />}
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-center gap-2 md:gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <IconCash className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <h3 className="text-xs font-semibold leading-tight text-neutral-900 md:text-sm dark:text-white">
                Total Nilai (Halaman Ini)
              </h3>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl dark:text-white">
                {formatCurrency(pageTotalValue)}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 md:p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-center gap-2 md:gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                <IconPackage className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <h3 className="text-xs font-semibold leading-tight text-neutral-900 md:text-sm dark:text-white">
                Total Stok Item (Halaman Ini)
              </h3>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl dark:text-white">
                {pageTotalStok}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Barcode
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Nama Barang
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Kategori
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Stok
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Harga Beli
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Harga Jual
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Nilai Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {inventoryValue.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-white/50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3.5 font-mono text-sm text-neutral-700 dark:text-neutral-300">
                      {item.barcode}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {item.nama_barang}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="text-brand-600 dark:text-brand-400 px-4 py-3.5 text-right font-bold">
                      {item.stok}
                    </td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(item.harga_beli)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(item.harga_jual)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(item.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50 font-bold dark:border-neutral-800 dark:bg-neutral-900">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    Total Halaman Ini
                  </td>
                  <td className="text-brand-600 dark:text-brand-400 px-4 py-4 text-right">
                    {pageTotalStok}
                  </td>
                  <td colSpan={2}></td>
                  <td className="px-4 py-4 text-right text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(pageTotalValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="block divide-y divide-neutral-100 lg:hidden dark:divide-neutral-800">
            {inventoryValue.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 p-3 md:gap-3 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm leading-tight font-medium text-neutral-900 md:text-base dark:text-neutral-100">
                      {item.nama_barang}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-neutral-500 md:text-xs">
                      {item.barcode}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-1.5 py-[2px] text-[10px] font-medium text-neutral-600 md:px-2.5 md:py-1 md:text-xs dark:bg-neutral-800 dark:text-neutral-400">
                    {item.kategori}
                  </span>
                </div>

                <div className="mt-0.5 grid grid-cols-2 gap-1.5 text-sm md:mt-1 md:gap-2">
                  <div>
                    <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                      Stok
                    </span>
                    <div className="text-brand-600 dark:text-brand-400 text-xs font-bold md:text-sm">
                      {item.stok}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                      Nilai Total
                    </span>
                    <div className="text-xs font-bold text-neutral-900 md:text-sm dark:text-neutral-100">
                      {formatCurrency(item.total_value)}
                    </div>
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                      Hrg Beli
                    </span>
                    <div className="text-[10px] text-neutral-700 md:text-sm dark:text-neutral-300">
                      {formatCurrency(item.harga_beli)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="mb-0.5 block text-[8px] text-neutral-500 uppercase md:mb-1 md:text-[10px]">
                      Hrg Jual
                    </span>
                    <div className="text-[10px] text-neutral-700 md:text-sm dark:text-neutral-300">
                      {formatCurrency(item.harga_jual)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 p-3 font-bold md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <div className="text-xs text-neutral-900 md:text-sm dark:text-neutral-100">
                  Total Halaman Ini
                </div>
                <div className="mt-0.5 text-[10px] text-neutral-500 md:text-xs">
                  Stok: <span className="text-brand-600 dark:text-brand-400">{pageTotalStok}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-neutral-900 md:text-base dark:text-neutral-100">
                  {formatCurrency(pageTotalValue)}
                </span>
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
