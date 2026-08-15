'use client';

import { useState } from 'react';
import { RecentTransaction } from '@/lib/api/dashboard';
import { IconArrowDown, IconArrowUp, IconChevronRight } from '@tabler/icons-react';
import { TransactionModal } from './TransactionModal';
import Link from 'next/link';
import { formatTimeWIB } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: RecentTransaction[];
  isLoading: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedTxType, setSelectedTxType] = useState<'penjualan' | 'pembelian' | null>(null);

  const handleOpenModal = (id: string, type: 'penjualan' | 'pembelian') => {
    setSelectedTxId(id);
    setSelectedTxType(type);
    setModalOpen(true);
  };
  if (isLoading) {
    return (
      <div className="shadow-elevated h-full rounded-2xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
        <div className="animate-pulse space-y-3">
          <div className="mb-6 h-5 w-40 rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-neutral-200/50 dark:bg-neutral-700/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="shadow-elevated h-full rounded-2xl border border-white/40 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
      <h3 className="mb-6 font-semibold text-neutral-900 dark:text-white">Transaksi Terakhir</h3>

      {transactions.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Belum ada transaksi hari ini
        </p>
      ) : (
        <div className="space-y-3">
          {transactions.slice(0, 4).map((tx) => (
            <button
              key={tx.id}
              onClick={() => handleOpenModal(tx.id, tx.type)}
              className="group flex w-full items-center justify-between rounded-xl border border-transparent p-3 text-left transition-colors duration-200 hover:border-neutral-100 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-800/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-110 ${
                    tx.type === 'penjualan'
                      ? 'from-accent-teal-500 to-accent-teal-600 shadow-teal bg-gradient-to-br text-white'
                      : 'from-accent-amber-500 to-accent-amber-600 shadow-amber bg-gradient-to-br text-white'
                  }`}
                >
                  {tx.type === 'penjualan' ? (
                    <IconArrowUp size={18} stroke={2.5} />
                  ) : (
                    <IconArrowDown size={18} stroke={2.5} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 capitalize dark:text-white">
                    {tx.type}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {formatTimeWIB(tx.created_at, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <p className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
                Rp {new Intl.NumberFormat('id-ID').format(tx.total)}
              </p>
            </button>
          ))}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <Link
            href="/transactions/history"
            className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Lihat Semua Transaksi
            <IconChevronRight size={16} />
          </Link>
        </div>
      )}

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        transactionId={selectedTxId}
        transactionType={selectedTxType}
      />
    </div>
  );
}
