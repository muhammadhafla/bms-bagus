import React from 'react';
import { Profitability, Atv } from '@/lib/api/analytics';
import { formatCurrency } from '@/lib/utils';
import { IconReceipt, IconShoppingCart, IconTrendingUp } from '@tabler/icons-react';

export function ProfitabilityAndAtvCards({
  profitabilityData,
  atvData,
  isLoading,
}: {
  profitabilityData: Profitability[];
  atvData: Atv | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid animate-pulse grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {[1, 2, 3].map((i, index) => (
          <div
            key={i}
            className={`h-28 rounded-xl bg-white p-3 shadow-sm md:h-32 md:p-4 dark:bg-neutral-800 ${index === 2 ? 'col-span-2 md:col-span-1' : ''}`}
          />
        ))}
      </div>
    );
  }

  const topProfitable =
    profitabilityData && profitabilityData.length > 0 ? profitabilityData[0] : null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
      {/* ATV Card */}
      <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2 flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <IconReceipt className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <h3 className="text-xs leading-tight font-semibold text-neutral-900 md:text-sm dark:text-white">
            Avg. Transaction Value (ATV)
          </h3>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
            {formatCurrency(atvData?.avg_transaction_value || 0)}
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-500 md:mt-1 md:text-xs dark:text-neutral-400">
            Rata-rata belanja per struk
          </p>
        </div>
      </div>

      {/* IPT Card */}
      <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2 flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-teal-50 text-accent-teal-600 dark:bg-accent-teal-900/30 dark:text-accent-teal-400">
            <IconShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <h3 className="text-xs leading-tight font-semibold text-neutral-900 md:text-sm dark:text-white">Items Per Ticket (IPT)</h3>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold tracking-tight text-neutral-900 md:text-2xl dark:text-white">
            {atvData?.items_per_ticket || 0}{' '}
            <span className="text-xs font-normal md:text-base">item</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-neutral-500 md:mt-1 md:text-xs dark:text-neutral-400">
            Rata-rata barang per struk
          </p>
        </div>
      </div>

      {/* Top Profit Margin Card */}
      <div className="col-span-2 flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3 md:col-span-1 md:p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-2 flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <IconTrendingUp className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <h3 className="text-xs leading-tight font-semibold text-neutral-900 md:text-sm dark:text-white">Margin Tertinggi</h3>
        </div>
        <div className="mt-2">
          {topProfitable ? (
            <>
              <div className="truncate text-base font-bold text-neutral-900 md:text-lg dark:text-white">
                {topProfitable.nama_barang}
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-neutral-500 md:mt-1 md:text-xs dark:text-neutral-400">
                Margin: {topProfitable.profit_margin}% • Laba:{' '}
                {formatCurrency(topProfitable.total_profit)}
              </p>
            </>
          ) : (
            <p className="text-[10px] font-medium text-neutral-500 md:text-sm dark:text-neutral-400">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}
