'use client';

import { useState, useEffect, useCallback } from 'react';
import { stockAdjustmentApi, StockAdjustment } from '@/lib/api/stockAdjustment';

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <h1 className="text-2xl font-bold mb-6">Laporan Selisih Stok</h1>

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm text-neutral-500 mb-1">Filter Alasan</label>
          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2"
          >
            <option value="">Semua Alasan</option>
            {Object.entries(reasonLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {Object.entries(summary).map(([reason, total]) => (
          <div key={reason} className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">{reasonLabels[reason]}</div>
            <div className="text-2xl font-bold mt-1">{total}</div>
          </div>
        ))}
      </div>

      {filteredAdjustments.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>Tidak ada data selisih stok</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
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
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{new Date(adj.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{(adj as any).inventory?.nama_barang || adj.inventory_id}</td>
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
        </div>
      )}
    </div>
  );
}
