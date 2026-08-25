'use client';

import { useState, useEffect, useCallback } from 'react';
import { stockAdjustmentApi, StockAdjustment } from '@/lib/api/stockAdjustment';
import { IconAlertCircle, IconArrowDown } from '@tabler/icons-react';
import { AmbientLayout, ModernPagination } from '@/components/ui';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
import { formatDateWIB } from '@/lib/utils';

const reasonLabels: Record<string, string> = {
  salah_input: 'Kesalahan Input',
  rusak: 'Barang Rusak',
  hilang: 'Barang Hilang',
  kadaluarsa: 'Kadaluarsa',
  salah_hitung: 'Kesalahan Hitung',
  lainnya: 'Lainnya',
};

export default function DifferenceReportPage() {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterReason, setFilterReason] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  useEffect(() => {
    setPage(1);
  }, [filterReason]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await stockAdjustmentApi.getAll();
      if (result.error) {
        setError(result.error.message || 'Gagal memuat data selisih stok');
      } else if (result.data) {
        setAdjustments(result.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAdjustments = filterReason
    ? adjustments.filter((a) => a.reason === filterReason)
    : adjustments;

  const summary = adjustments.reduce(
    (acc, adj) => {
      acc[adj.reason] = (acc[adj.reason] || 0) + adj.adjustment_qty;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalPages = Math.ceil(filteredAdjustments.length / LIMIT) || 1;
  const pagedAdjustments = filteredAdjustments.slice((page - 1) * LIMIT, page * LIMIT);

  const handleRefresh = async () => {
    try {
      const result = await stockAdjustmentApi.getAll();
      if (!result.error && result.data) {
        setAdjustments(result.data);
      }
    } catch (err: any) {
      // Ignore error on refresh
    }
  };

  return (
    <AmbientLayout>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div className="flex items-center justify-center py-4 text-neutral-400">
            <IconArrowDown className="h-5 w-5 animate-bounce" />
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <div className="border-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        }
      >
        <div className="animate-fade-in-up mb-4 flex-shrink-0 lg:mb-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <IconAlertCircle
                className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                stroke={1.5}
              />
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                  Laporan Selisih Stok
                </h1>
                <p className="mt-1 hidden md:block text-sm font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                  Rekapitulasi perbedaan stok fisik dan sistem
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="animate-fade-in-up mb-4 flex gap-4 lg:mb-6"
          style={{ animationDelay: '50ms' }}
        >
          <div className="max-w-sm flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Filter Alasan
            </label>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 shadow-sm focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">Semua Alasan</option>
              {Object.entries(reasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          className="animate-fade-in-up mb-4 grid grid-cols-2 gap-3 lg:mb-6 lg:grid-cols-3 lg:gap-4"
          style={{ animationDelay: '100ms' }}
        >
          {Object.entries(summary).map(([reason, total]) => (
            <div
              key={reason}
              className="shadow-elevated rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl lg:p-5 dark:border-white/10 dark:bg-neutral-900/60"
            >
              <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {reasonLabels[reason]}
              </div>
              <div className="mt-1 text-2xl font-bold text-neutral-900 lg:text-3xl dark:text-white">
                {total}
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div
            className="animate-fade-in-up rounded-3xl border border-red-200 bg-red-50 py-16 text-center shadow-sm dark:border-red-900/50 dark:bg-red-900/20"
            style={{ animationDelay: '150ms' }}
          >
            <IconAlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" stroke={1.5} />
            <p className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
              Gagal Memuat Data
            </p>
            <p className="mb-6 text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchData}
              className="rounded-xl bg-red-100 px-6 py-2.5 font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div
            className="shadow-elevated animate-fade-in-up rounded-3xl border border-white/40 bg-white/70 py-16 text-center text-neutral-500 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '150ms' }}
          >
            <p className="text-lg font-medium">Tidak ada data selisih stok</p>
          </div>
        ) : (
          <div
            className="shadow-elevated animate-fade-in-up overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '150ms' }}
          >
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                      Barang
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                      Jumlah
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                      Tipe
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                      Alasan
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {pagedAdjustments.map((adj) => (
                    <tr
                      key={adj.id}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {formatDateWIB(adj.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {(adj as import('@/types').StockAdjustmentWithInventory).inventory
                          ?.nama_barang || adj.inventory_id}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-sm font-medium ${adj.adjustment_type === 'increase' ? 'text-success-600' : 'text-danger-600'}`}
                      >
                        {adj.adjustment_type === 'increase' ? '+' : '-'}
                        {adj.adjustment_qty}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 capitalize dark:text-neutral-100">
                        {adj.adjustment_type === 'increase' ? 'Tambah' : 'Kurang'}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                        {reasonLabels[adj.reason] || adj.reason}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">{adj.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block divide-y divide-neutral-200 lg:hidden dark:divide-neutral-800">
              {pagedAdjustments.map((adj) => (
                <div key={adj.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {(adj as import('@/types').StockAdjustmentWithInventory).inventory
                          ?.nama_barang || adj.inventory_id}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {formatDateWIB(adj.created_at)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        adj.adjustment_type === 'increase'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                      }`}
                    >
                      {adj.adjustment_type === 'increase' ? 'Tambah' : 'Kurang'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {reasonLabels[adj.reason] || adj.reason}
                      </span>
                      {adj.note && <span className="text-xs text-neutral-500">{adj.note}</span>}
                    </div>
                    <div
                      className={`font-mono text-lg font-bold ${adj.adjustment_type === 'increase' ? 'text-success-600' : 'text-danger-600'}`}
                    >
                      {adj.adjustment_type === 'increase' ? '+' : '-'}
                      {adj.adjustment_qty}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {!loading && filteredAdjustments.length > LIMIT && (
              <ModernPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="rounded-none rounded-b-3xl border-x-0 border-b-0"
              />
            )}
          </div>
        )}
      </PullToRefresh>
    </AmbientLayout>
  );
}
