import React from 'react';
import { StockVelocity } from '@/lib/api/analytics';

export function StockVelocityTable({ data, isLoading }: { data: StockVelocity[], isLoading: boolean }) {
  if (isLoading) {
    return <div className="h-64 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-xl animate-pulse"><p className="text-neutral-500">Loading...</p></div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-xl"><p className="text-neutral-500">Belum ada data penjualan</p></div>;
  }

  // Split into fast moving and slow moving (just top 5 and bottom 5 for simplicity)
  const fastMoving = [...data].sort((a, b) => b.sales_velocity - a.sales_velocity).slice(0, 10);
  // Only include items with velocity > 0 in slow moving, but the lowest ones
  const slowMoving = [...data].sort((a, b) => a.sales_velocity - b.sales_velocity).slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Fast Moving */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-4 shadow-sm flex flex-col">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 md:mb-4">Fast Moving Items (Cepat Habis)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="text-[10px] md:text-xs text-neutral-500 uppercase bg-neutral-50 dark:bg-neutral-700/50 dark:text-neutral-400">
              <tr>
                <th className="px-3 md:px-4 py-2 md:py-3 rounded-l-lg">Barang</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-right">Terjual</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-right rounded-r-lg">Velocity/Hari</th>
              </tr>
            </thead>
            <tbody>
              {fastMoving.map((item) => (
                <tr key={item.inventory_id} className="border-b dark:border-neutral-700 last:border-0">
                  <td className="px-3 md:px-4 py-2 md:py-3 font-medium text-neutral-900 dark:text-white truncate max-w-[120px] md:max-w-[150px]">{item.nama_barang}</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-right">{item.total_sold}</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-right text-emerald-600 font-semibold">{item.sales_velocity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slow Moving */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-4 shadow-sm flex flex-col">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 md:mb-4">Slow Moving Items (Lambat Terjual)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-left">
            <thead className="text-[10px] md:text-xs text-neutral-500 uppercase bg-neutral-50 dark:bg-neutral-700/50 dark:text-neutral-400">
              <tr>
                <th className="px-3 md:px-4 py-2 md:py-3 rounded-l-lg">Barang</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-right">Terjual</th>
                <th className="px-3 md:px-4 py-2 md:py-3 text-right rounded-r-lg">Velocity/Hari</th>
              </tr>
            </thead>
            <tbody>
              {slowMoving.map((item) => (
                <tr key={item.inventory_id} className="border-b dark:border-neutral-700 last:border-0">
                  <td className="px-3 md:px-4 py-2 md:py-3 font-medium text-neutral-900 dark:text-white truncate max-w-[120px] md:max-w-[150px]">{item.nama_barang}</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-right">{item.total_sold}</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-right text-rose-500 font-semibold">{item.sales_velocity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
