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
      <div className="from-brand-500 to-brand-600 flex flex-col justify-between rounded-xl bg-gradient-to-br p-3 text-white shadow-sm md:p-4">
        <div className="mb-2 flex items-center gap-1.5 opacity-90 md:gap-2">
          <IconReceipt className="h-4 w-4 md:h-5 md:w-5" />
          <h3 className="text-xs leading-tight font-medium md:text-sm">
            Avg. Transaction Value (ATV)
          </h3>
        </div>
        <div>
          <div className="text-lg font-bold md:text-2xl">
            {formatCurrency(atvData?.avg_transaction_value || 0)}
          </div>
          <p className="text-brand-100 mt-0.5 text-[10px] md:mt-1 md:text-xs">
            Rata-rata belanja per struk
          </p>
        </div>
      </div>

      {/* IPT Card */}
      <div className="from-accent-teal-500 to-accent-teal-600 flex flex-col justify-between rounded-xl bg-gradient-to-br p-3 text-white shadow-sm md:p-4">
        <div className="mb-2 flex items-center gap-1.5 opacity-90 md:gap-2">
          <IconShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
          <h3 className="text-xs leading-tight font-medium md:text-sm">Items Per Ticket (IPT)</h3>
        </div>
        <div>
          <div className="text-lg font-bold md:text-2xl">
            {atvData?.items_per_ticket || 0}{' '}
            <span className="text-xs font-normal md:text-base">item</span>
          </div>
          <p className="text-accent-teal-100 mt-0.5 text-[10px] md:mt-1 md:text-xs">
            Rata-rata barang per struk
          </p>
        </div>
      </div>

      {/* Top Profit Margin Card */}
      <div className="col-span-2 flex flex-col justify-between rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-3 text-white shadow-sm md:col-span-1 md:p-4">
        <div className="mb-2 flex items-center gap-1.5 opacity-90 md:gap-2">
          <IconTrendingUp className="h-4 w-4 md:h-5 md:w-5" />
          <h3 className="text-xs leading-tight font-medium md:text-sm">Margin Tertinggi</h3>
        </div>
        <div>
          {topProfitable ? (
            <>
              <div className="truncate text-base font-bold md:text-lg">
                {topProfitable.nama_barang}
              </div>
              <p className="mt-0.5 text-[10px] text-amber-100 md:mt-1 md:text-xs">
                Margin: {topProfitable.profit_margin}% • Laba:{' '}
                {formatCurrency(topProfitable.total_profit)}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-amber-100 md:text-sm">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}
