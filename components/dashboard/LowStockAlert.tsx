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
    <div className="group relative flex items-center justify-between rounded-xl border border-transparent p-3 transition-colors duration-200 hover:border-neutral-100 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-800/50">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="bg-accent-amber-500 animate-pulse-glow h-2 w-2 flex-shrink-0 rounded-full" />
        <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
          {item.nama_barang}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-accent-amber-600 dark:text-accent-amber-400 text-sm font-bold">
          {item.stok} / {item.minimum_stock}
        </span>

        <div className="flex items-center gap-1 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          <Link
            href="/purchasing"
            className="hover:bg-accent-teal-100 dark:hover:bg-accent-teal-900/30 text-accent-teal-600 dark:text-accent-teal-400 rounded-md p-1.5 transition-colors"
            title="Tambah Stok"
          >
            <IconCirclePlus size={18} stroke={2} />
          </Link>

          <button
            className="hover:bg-accent-rose-100 dark:hover:bg-accent-rose-900/30 text-accent-rose-600 dark:text-accent-rose-400 rounded-md p-1.5 transition-colors"
            title="Tandai Discontinue"
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
          >
            <IconSwitch size={18} />
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="shadow-elevated absolute top-8 right-0 z-10 w-48 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
          <p className="mb-3 text-sm text-neutral-900 dark:text-white">
            Nonaktifkan <span className="font-medium">{item.nama_barang}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
            >
              Batal
            </button>
            <button
              onClick={handleDiscontinue}
              disabled={isLoading}
              className="bg-accent-rose-500 hover:bg-accent-rose-600 flex-1 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
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
      <div className="shadow-elevated h-full rounded-2xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
        <div className="animate-pulse space-y-3">
          <div className="mb-6 h-5 w-48 rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-neutral-200/50 dark:bg-neutral-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="shadow-elevated h-full rounded-2xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
        <IconAlertTriangle size={18} className="text-accent-amber-500" />
        Peringatan Stok Minimum
      </h3>

      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
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
              className="text-brand-600 dark:text-brand-400 mt-2 block text-center text-sm hover:underline"
            >
              Lihat {items.length - 4} barang lainnya
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
