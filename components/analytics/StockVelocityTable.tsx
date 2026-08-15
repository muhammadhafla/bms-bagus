import React from 'react';
import { StockVelocity } from '@/lib/api/analytics';
import { HorizontalScrollArea } from '@/components/ui';

export function StockVelocityTable({
  data,
  isLoading,
}: {
  data: StockVelocity[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-white dark:bg-neutral-800">
        <p className="text-neutral-500">Belum ada data penjualan</p>
      </div>
    );
  }

  // Split into fast moving and slow moving (just top 5 and bottom 5 for simplicity)
  const fastMoving = [...data].sort((a, b) => b.sales_velocity - a.sales_velocity).slice(0, 10);
  // Only include items with velocity > 0 in slow moving, but the lowest ones
  const slowMoving = [...data].sort((a, b) => a.sales_velocity - b.sales_velocity).slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Fast Moving */}
      <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 font-semibold text-neutral-900 md:mb-4 dark:text-white">
          Fast Moving Items (Cepat Habis)
        </h3>
        <HorizontalScrollArea>
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-neutral-50 text-[10px] text-neutral-500 uppercase md:text-xs dark:bg-neutral-700/50 dark:text-neutral-400">
              <tr>
                <th className="rounded-l-lg px-3 py-2 md:px-4 md:py-3">Barang</th>
                <th className="px-3 py-2 text-right md:px-4 md:py-3">Terjual</th>
                <th className="rounded-r-lg px-3 py-2 text-right md:px-4 md:py-3">Velocity/Hari</th>
              </tr>
            </thead>
            <tbody>
              {fastMoving.map((item) => (
                <tr
                  key={item.inventory_id}
                  className="border-b last:border-0 dark:border-neutral-700"
                >
                  <td className="max-w-[120px] truncate px-3 py-2 font-medium text-neutral-900 md:max-w-[150px] md:px-4 md:py-3 dark:text-white">
                    {item.nama_barang}
                  </td>
                  <td className="px-3 py-2 text-right md:px-4 md:py-3">{item.total_sold}</td>
                  <td className="text-accent-teal-600 px-3 py-2 text-right font-semibold md:px-4 md:py-3">
                    {item.sales_velocity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HorizontalScrollArea>
      </div>

      {/* Slow Moving */}
      <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="mb-3 font-semibold text-neutral-900 md:mb-4 dark:text-white">
          Slow Moving Items (Lambat Terjual)
        </h3>
        <HorizontalScrollArea>
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-neutral-50 text-[10px] text-neutral-500 uppercase md:text-xs dark:bg-neutral-700/50 dark:text-neutral-400">
              <tr>
                <th className="rounded-l-lg px-3 py-2 md:px-4 md:py-3">Barang</th>
                <th className="px-3 py-2 text-right md:px-4 md:py-3">Terjual</th>
                <th className="rounded-r-lg px-3 py-2 text-right md:px-4 md:py-3">Velocity/Hari</th>
              </tr>
            </thead>
            <tbody>
              {slowMoving.map((item) => (
                <tr
                  key={item.inventory_id}
                  className="border-b last:border-0 dark:border-neutral-700"
                >
                  <td className="max-w-[120px] truncate px-3 py-2 font-medium text-neutral-900 md:max-w-[150px] md:px-4 md:py-3 dark:text-white">
                    {item.nama_barang}
                  </td>
                  <td className="px-3 py-2 text-right md:px-4 md:py-3">{item.total_sold}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-500 md:px-4 md:py-3">
                    {item.sales_velocity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HorizontalScrollArea>
      </div>
    </div>
  );
}
