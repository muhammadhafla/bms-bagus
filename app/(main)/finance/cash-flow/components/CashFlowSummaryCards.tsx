import { IconWallet, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';

interface CashFlowSummaryCardsProps {
  summaryData: any;
  isLoading: boolean;
}

export function CashFlowSummaryCards({ summaryData, isLoading }: CashFlowSummaryCardsProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-3 md:gap-4">
      <div
        className="shadow-elevated animate-fade-in-up flex flex-col gap-1 rounded-3xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-neutral-900/60"
        style={{ animationDelay: '50ms' }}
      >
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Total Pemasukan
        </p>
        <div className="flex items-center justify-between gap-2">
          {isLoading ? (
            <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          ) : (
            <p className="truncate text-lg font-bold text-green-600 xl:text-2xl dark:text-green-400">
              {formatCurrency(summaryData?.pemasukan || 0)}
            </p>
          )}
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 sm:flex dark:bg-green-900/30 dark:text-green-400">
            <IconArrowDownRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div
        className="shadow-elevated animate-fade-in-up flex flex-col gap-1 rounded-3xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-neutral-900/60"
        style={{ animationDelay: '100ms' }}
      >
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Total Pengeluaran
        </p>
        <div className="flex items-center justify-between gap-2">
          {isLoading ? (
            <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          ) : (
            <p className="truncate text-lg font-bold text-red-600 xl:text-2xl dark:text-red-400">
              {formatCurrency(summaryData?.pengeluaran || 0)}
            </p>
          )}
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 sm:flex dark:bg-red-900/30 dark:text-red-400">
            <IconArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div
        className="from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-800 shadow-elevated animate-fade-in-up relative col-span-2 flex flex-col gap-1 overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white sm:p-6 md:col-span-1"
        style={{ animationDelay: '150ms' }}
      >
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <IconWallet className="h-24 w-24" />
        </div>
        <p className="text-brand-100 relative z-10 text-sm font-medium">Saldo Kas Akhir</p>
        <div className="relative z-10 mt-1 flex items-center justify-between">
          {isLoading ? (
            <div className="h-8 w-1/2 animate-pulse rounded bg-white/20" />
          ) : (
            <p className="text-3xl font-bold">{formatCurrency(summaryData?.saldo || 0)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
