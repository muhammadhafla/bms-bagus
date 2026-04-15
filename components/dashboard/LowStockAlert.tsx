import { LowStockItem } from '@/lib/api/dashboard';
import { IconAlertTriangle, IconCirclePlus, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { inventoryApi } from '@/lib/api/inventory';
import { useState } from 'react';

interface LowStockAlertProps {
  items: LowStockItem[];
  isLoading: boolean;
}

function LowStockItemRow({ item }: { item: LowStockItem }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDiscontinue = async () => {
    setIsLoading(true);
    await inventoryApi.toggleDiscontinued(item.id);
    setIsLoading(false);
    window.location.reload();
  };

  return (
    <div
      className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
    >
      <span className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[140px]">
        {item.nama_barang}
      </span>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mr-2">
          {item.stok} / {item.minimum_stock}
        </span>
        
        <button
          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
          title="Tambah Stok"
          onClick={() => alert(`Tambah stok untuk ${item.nama_barang}`)}
        >
          <IconCirclePlus size={18} stroke={2} />
        </button>
        
        <button
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
          title="Tandai Discontinue"
          onClick={handleDiscontinue}
          disabled={isLoading}
        >
          <IconX size={18} stroke={2.5} />
        </button>
      </div>
    </div>
  );
}

export function LowStockAlert({ items, isLoading }: LowStockAlertProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-48" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm">
      <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
        <IconAlertTriangle size={18} className="text-yellow-500" />
        Peringatan Stok Minimum
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
          Semua stok dalam batas aman
        </p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <LowStockItemRow key={item.id} item={item} />
          ))}

          {items.length > 5 && (
            <Link
              href="/inventory"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline block text-center mt-2"
            >
              Lihat {items.length - 5} barang lainnya
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
