'use client';

import { useState, useEffect, useCallback } from 'react';
import { stockAdjustmentApi, StockAdjustment } from '@/lib/api/stockAdjustment';
import { IconAlertCircle } from '@tabler/icons-react';
import { AmbientLayout } from '@/components/ui';
import { formatDateWIB } from '@/lib/utils';

const reasonLabels: Record<string, string> = {
  salah_input: 'Kesalahan Input',
  rusak: 'Barang Rusak',
  hilang: 'Barang Hilang',
  kadaluarsa: 'Kadaluarsa',
  salah_hitung: 'Kesalahan Hitung',
  lainnya: 'Lainnya'
};

export default function DifferenceReportPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReason, setFilterReason] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await stockAdjustmentApi.getAll();
    if (!result.error && result.data) {
      setAdjustments(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAdjustments = filterReason 
    ? adjustments.filter(a => a.reason === filterReason)
    : adjustments;

  const summary = adjustments.reduce((acc, adj) => {
    acc[adj.reason] = (acc[adj.reason] || 0) + adj.adjustment_qty;
    return acc;
  }, {} as Record<string, number>);

return (
    <AmbientLayout>
      <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4 pl-12 lg:pl-0">
            <IconAlertCircle className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Laporan Selisih Stok</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1 lg:mt-2 text-sm lg:text-base font-medium">Rekapitulasi perbedaan stok fisik dan sistem</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-4 lg:mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <div className="flex-1 max-w-sm">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Filter Alasan</label>
          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Semua Alasan</option>
            {Object.entries(reasonLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {Object.entries(summary).map(([reason, total]) => (
          <div key={reason} className="bg-white/70 dark:bg-neutral-900/60 rounded-2xl border border-white/40 dark:border-white/10 p-4 lg:p-5 shadow-elevated backdrop-blur-xl">
            <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{reasonLabels[reason]}</div>
            <div className="text-2xl lg:text-3xl font-bold mt-1 text-neutral-900 dark:text-white">{total}</div>
          </div>
        ))}
      </div>

      {filteredAdjustments.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 bg-white/70 dark:bg-neutral-900/60 rounded-3xl border border-white/40 dark:border-white/10 shadow-elevated backdrop-blur-xl animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <p className="text-lg font-medium">Tidak ada data selisih stok</p>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-neutral-900/60 rounded-3xl shadow-elevated border border-white/40 dark:border-white/10 backdrop-blur-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="overflow-x-auto hidden lg:block">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Barang</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Jumlah</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Tipe</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Alasan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{formatDateWIB(adj.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{(adj as import('@/types').StockAdjustmentWithInventory).inventory?.nama_barang || adj.inventory_id}</td>
                    <td className={`px-4 py-3 text-right text-sm font-mono font-medium ${adj.adjustment_type === 'increase' ? 'text-success-600' : 'text-danger-600'}`}>
                      {adj.adjustment_type === 'increase' ? '+' : '-'}{adj.adjustment_qty}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 capitalize">{adj.adjustment_type === 'increase' ? 'Tambah' : 'Kurang'}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{reasonLabels[adj.reason] || adj.reason}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{adj.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block lg:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredAdjustments.map((adj) => (
              <div key={adj.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">{(adj as import('@/types').StockAdjustmentWithInventory).inventory?.nama_barang || adj.inventory_id}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{formatDateWIB(adj.created_at)}</div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    adj.adjustment_type === 'increase' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                  }`}>
                    {adj.adjustment_type === 'increase' ? 'Tambah' : 'Kurang'}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">{reasonLabels[adj.reason] || adj.reason}</span>
                    {adj.note && <span className="text-xs text-neutral-500">{adj.note}</span>}
                  </div>
                  <div className={`font-bold font-mono text-lg ${adj.adjustment_type === 'increase' ? 'text-success-600' : 'text-danger-600'}`}>
                    {adj.adjustment_type === 'increase' ? '+' : '-'}{adj.adjustment_qty}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AmbientLayout>
  );
}
