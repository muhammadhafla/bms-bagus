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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto p-4">
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

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left p-4 font-medium">Tanggal</th>
                  <th className="text-left p-4 font-medium">Barang</th>
                  <th className="text-right p-4 font-medium">Jumlah</th>
                  <th className="text-left p-4 font-medium">Tipe</th>
                  <th className="text-left p-4 font-medium">Alasan</th>
                  <th className="text-left p-4 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="border-b border-neutral-100 dark:border-neutral-800/50">
                    <td className="p-4">{new Date(adj.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="p-4">{(adj as any).inventory?.nama_barang || adj.inventory_id}</td>
                    <td className={`p-4 text-right font-mono font-medium ${adj.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                      {adj.adjustment_type === 'increase' ? '+' : '-'}{adj.adjustment_qty}
                    </td>
                    <td className="p-4 capitalize">{adj.adjustment_type === 'increase' ? 'Tambah' : 'Kurang'}</td>
                    <td className="p-4">{reasonLabels[adj.reason] || adj.reason}</td>
                    <td className="p-4 text-neutral-500">{adj.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
