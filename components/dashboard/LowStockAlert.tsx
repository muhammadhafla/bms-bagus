import { LowStockItem } from '@/lib/api/dashboard';
import { IconAlertTriangle, IconCirclePlus, IconSwitch } from '@tabler/icons-react';
import Link from 'next/link';
import { inventoryApi } from '@/lib/api/inventory';
import { useState } from 'react';

interface LowStockAlertProps {
  items: LowStockItem[];
  isLoading: boolean;
}

function LowStockItemRow({ item }: { item: LowStockItem }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDiscontinue = async () => {
    setIsLoading(true);
    await inventoryApi.toggleDiscontinued(item.id);
    setIsLoading(false);
    setShowConfirm(false);
    window.location.reload();
  };

  return (
    <div
      className="relative flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
    >
      <span className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-[140px]">
        {item.nama_barang}
      </span>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mr-2">
          {item.stok} / {item.minimum_stock}
        </span>
        
        <Link
          href="/purchasing"
          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
          title="Tambah Stok"
        >
          <IconCirclePlus size={18} stroke={2} />
        </Link>
        
        <button
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
          title="Tandai Discontinue"
          onClick={() => setShowConfirm(true)}
          disabled={isLoading}
        >
          <IconSwitch size={18} />
        </button>
      </div>

      {showConfirm && (
        <div className="absolute right-0 top-8 z-10 bg-white dark:bg-neutral-800 rounded-lg shadow-elevated border border-neutral-200 dark:border-neutral-700 p-3 w-48">
          <p className="text-sm text-neutral-900 dark:text-white mb-3">
            Nonaktifkan <span className="font-medium">{item.nama_barang}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              Batal
            </button>
            <button
              onClick={handleDiscontinue}
              disabled={isLoading}
              className="flex-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              Ya
            </button>
          </div>
        </div>
      )}
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
