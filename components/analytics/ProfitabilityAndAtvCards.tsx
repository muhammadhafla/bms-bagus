import React from 'react';
import { Profitability, Atv } from '@/lib/api/analytics';
import { formatCurrency } from '@/lib/utils';
import { IconReceipt, IconShoppingCart, IconTrendingUp } from '@tabler/icons-react';

export function ProfitabilityAndAtvCards({ 
  profitabilityData, 
  atvData, 
  isLoading 
}: { 
  profitabilityData: Profitability[], 
  atvData: Atv | null, 
  isLoading: boolean 
}) {
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 animate-pulse">
        {[1, 2, 3].map((i, index) => (
          <div key={i} className={`bg-white dark:bg-neutral-800 rounded-xl p-3 md:p-4 shadow-sm h-28 md:h-32 ${index === 2 ? 'col-span-2 md:col-span-1' : ''}`} />
        ))}
      </div>
    );
  }

  const topProfitable = profitabilityData && profitabilityData.length > 0 ? profitabilityData[0] : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {/* ATV Card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl p-3 md:p-4 shadow-sm text-white flex flex-col justify-between">
        <div className="flex items-center gap-1.5 md:gap-2 mb-2 opacity-90">
          <IconReceipt className="w-4 h-4 md:w-5 md:h-5" />
          <h3 className="font-medium text-xs md:text-sm leading-tight">Avg. Transaction Value (ATV)</h3>
        </div>
        <div>
          <div className="text-lg md:text-2xl font-bold">{formatCurrency(atvData?.avg_transaction_value || 0)}</div>
          <p className="text-brand-100 text-[10px] md:text-xs mt-0.5 md:mt-1">Rata-rata belanja per struk</p>
        </div>
      </div>

      {/* IPT Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 md:p-4 shadow-sm text-white flex flex-col justify-between">
        <div className="flex items-center gap-1.5 md:gap-2 mb-2 opacity-90">
          <IconShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
          <h3 className="font-medium text-xs md:text-sm leading-tight">Items Per Ticket (IPT)</h3>
        </div>
        <div>
          <div className="text-lg md:text-2xl font-bold">{atvData?.items_per_ticket || 0} <span className="text-xs md:text-base font-normal">item</span></div>
          <p className="text-emerald-100 text-[10px] md:text-xs mt-0.5 md:mt-1">Rata-rata barang per struk</p>
        </div>
      </div>

      {/* Top Profit Margin Card */}
      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3 md:p-4 shadow-sm text-white flex flex-col justify-between">
        <div className="flex items-center gap-1.5 md:gap-2 mb-2 opacity-90">
          <IconTrendingUp className="w-4 h-4 md:w-5 md:h-5" />
          <h3 className="font-medium text-xs md:text-sm leading-tight">Margin Tertinggi</h3>
        </div>
        <div>
          {topProfitable ? (
            <>
              <div className="text-base md:text-lg font-bold truncate">{topProfitable.nama_barang}</div>
              <p className="text-amber-100 text-[10px] md:text-xs mt-0.5 md:mt-1">Margin: {topProfitable.profit_margin}% • Laba: {formatCurrency(topProfitable.total_profit)}</p>
            </>
          ) : (
            <p className="text-amber-100 text-[10px] md:text-sm">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}
