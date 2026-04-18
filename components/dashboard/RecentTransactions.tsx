import { RecentTransaction } from '@/lib/api/dashboard';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import Link from 'next/link';

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  isLoading: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
        Transaksi Terakhir
      </h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Belum ada transaksi hari ini
        </p>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <Link
              key={tx.id}
              href={tx.type === 'penjualan' ? `/transactions/receipt` : `/purchasing`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tx.type === 'penjualan'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                }`}>
                  {tx.type === 'penjualan' ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {tx.type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(tx.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Rp {new Intl.NumberFormat('id-ID').format(tx.total)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
