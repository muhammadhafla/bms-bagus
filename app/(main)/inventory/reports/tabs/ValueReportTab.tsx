import { InventoryValue } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconCash } from '@tabler/icons-react';

interface ValueReportTabProps {
  inventoryValue: InventoryValue[];
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  getTotalValue: () => number;
}

export function ValueReportTab({ inventoryValue, page, totalPages, setPage, getTotalValue }: ValueReportTabProps) {
  if (inventoryValue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <IconCash className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">Tidak ada data inventory</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-500/90 to-emerald-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated">
          <p className="text-emerald-100 text-sm font-medium">Total Nilai Inventory</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(getTotalValue())}</p>
        </div>
        <div className="bg-gradient-to-br from-brand-500/90 to-brand-600/90 backdrop-blur-md border border-white/20 rounded-3xl p-5 text-white shadow-elevated">
          <p className="text-brand-100 text-sm font-medium">Total Item</p>
          <p className="text-3xl font-bold mt-1">{inventoryValue.length}</p>
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
                  <td className="px-4 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">{item.stok}</td>
                  <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.harga_beli)}</td>
                  <td className="px-4 py-3.5 text-right text-neutral-600 dark:text-neutral-400">{formatCurrency(item.harga_jual)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(item.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {inventoryValue.map((item) => (
            <div key={item.id} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</div>
                  <div className="text-xs text-neutral-500 font-mono mt-0.5">{item.barcode}</div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium">
                  {item.kategori}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                <div>
                  <span className="text-neutral-500 text-xs">Stok</span>
                  <div className="font-semibold">{item.stok}</div>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 text-xs">Nilai Total</span>
                  <div className="font-bold text-brand-600 dark:text-brand-400">{formatCurrency(item.total_value)}</div>
                </div>
                <div>
                  <span className="text-neutral-500 text-xs">Hrg Beli</span>
                  <div className="text-neutral-700 dark:text-neutral-300">{formatCurrency(item.harga_beli)}</div>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 text-xs">Hrg Jual</span>
                  <div className="text-neutral-700 dark:text-neutral-300">{formatCurrency(item.harga_jual)}</div>
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
}
