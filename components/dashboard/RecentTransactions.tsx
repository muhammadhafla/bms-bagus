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
      <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-5 shadow-elevated h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded w-40 mb-6" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-neutral-200/50 dark:bg-neutral-700/50 rounded-xl" />
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
    <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-5 shadow-elevated h-full">
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-6">
        Transaksi Terakhir
      </h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
          Belum ada transaksi hari ini
        </p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <Link
              key={tx.id}
              href={tx.type === 'penjualan' ? `/transactions/receipt` : `/purchasing`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-200 border border-transparent hover:border-neutral-100 dark:hover:border-neutral-800 group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110 ${tx.type === 'penjualan'
                  ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-teal text-white'
                  : 'bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-amber text-white'
                }`}>
                  {tx.type === 'penjualan' ? <IconArrowUp size={18} stroke={2.5} /> : <IconArrowDown size={18} stroke={2.5} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white capitalize">
                    {tx.type}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {formatTime(tx.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">
                Rp {new Intl.NumberFormat('id-ID').format(tx.total)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
