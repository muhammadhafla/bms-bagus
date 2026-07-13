import { LowStockItem } from '@/lib/api/dashboard';
import { IconAlertTriangle, IconCirclePlus, IconSwitch } from '@tabler/icons-react';
import Link from 'next/link';
import { inventoryApi } from '@/lib/api/inventory';
import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

interface LowStockAlertProps {
  items: LowStockItem[];
  isLoading: boolean;
}

function LowStockItemRow({ item }: { item: LowStockItem }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const handleDiscontinue = async () => {
    setIsLoading(true);
    await inventoryApi.toggleDiscontinued(item.id);
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    setIsLoading(false);
    setShowConfirm(false);
  };

  return (
    <div
      className="relative flex items-center justify-between p-3 rounded-xl transition-colors duration-200 group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-2 h-2 rounded-full bg-accent-amber-500 animate-pulse-glow flex-shrink-0" />
        <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {item.nama_barang}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-accent-amber-600 dark:text-accent-amber-400">
          {item.stok} / {item.minimum_stock}
        </span>
        
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <Link
            href="/purchasing"
            className="p-1.5 rounded-md hover:bg-accent-teal-100 dark:hover:bg-accent-teal-900/30 text-accent-teal-600 dark:text-accent-teal-400 transition-colors"
            title="Tambah Stok"
          >
            <IconCirclePlus size={18} stroke={2} />
          </Link>
          
          <button
            className="p-1.5 rounded-md hover:bg-accent-rose-100 dark:hover:bg-accent-rose-900/30 text-accent-rose-600 dark:text-accent-rose-400 transition-colors"
            title="Tandai Discontinue"
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
          >
            <IconSwitch size={18} />
          </button>
        </div>
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
              className="flex-1 px-3 py-1.5 text-sm bg-accent-rose-500 text-white rounded-lg hover:bg-accent-rose-600 disabled:opacity-50"
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
      <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-5 shadow-elevated h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded w-48 mb-6" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-5 shadow-elevated h-full">
      <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
        <IconAlertTriangle size={18} className="text-accent-amber-500" />
        Peringatan Stok Minimum
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
          Semua stok dalam batas aman
        </p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => (
            <LowStockItemRow key={item.id} item={item} />
          ))}

          {items.length > 4 && (
            <Link
              href="/inventory"
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline block text-center mt-2"
            >
              Lihat {items.length - 4} barang lainnya
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
