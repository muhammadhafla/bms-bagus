import { IconWallet, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';

interface CashFlowSummaryCardsProps {
  summaryData: any;
  isLoading: boolean;
}

export function CashFlowSummaryCards({ summaryData, isLoading }: CashFlowSummaryCardsProps) {
  return (
    <div className="mb-4 md:mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
      {/* Summary Unified Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 sm:p-6 text-white shadow-xl z-0">
        {/* Dekorasi Background */}
        <div className="absolute -right-4 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-black/10 blur-xl"></div>
        
        <div className="relative z-10">
          <div className="mb-5">
            <p className="text-brand-100 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">Saldo Kas Akhir</p>
            {isLoading ? (
              <div className="h-10 w-1/2 animate-pulse rounded bg-white/20 mt-1" />
            ) : (
              <p className="text-3xl sm:text-4xl font-black tracking-tight">{formatCurrency(summaryData?.saldo || 0)}</p>
            )}
          </div>

          <div className="h-px w-full bg-white/20 mb-5" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1.5 text-brand-100">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20">
                  <IconArrowDownRight size={14} className="text-emerald-300" stroke={3} />
                </div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Pemasukan</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-3/4 animate-pulse rounded bg-white/20" />
              ) : (
                <p className="text-sm sm:text-lg font-bold">{formatCurrency(summaryData?.pemasukan || 0)}</p>
              )}
            </div>
            
            <div className="h-10 w-px bg-white/20" />

            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1.5 text-brand-100">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-400/20">
                  <IconArrowUpRight size={14} className="text-rose-300" stroke={3} />
                </div>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Pengeluaran</p>
              </div>
              {isLoading ? (
                <div className="h-6 w-3/4 ml-auto animate-pulse rounded bg-white/20" />
              ) : (
                <p className="text-sm sm:text-lg font-bold">{formatCurrency(summaryData?.pengeluaran || 0)}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
