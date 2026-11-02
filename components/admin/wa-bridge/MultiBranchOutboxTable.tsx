'use client';

import React, { useState } from 'react';
import { WaOutboxItem, WaOutboxFilter } from '@/types/wa-bridge';
import {
  IconSearch,
  IconFilter,
  IconCheck,
  IconChecks,
  IconClock,
  IconAlertCircle,
  IconRefresh,
  IconEye,
  IconBuildingStore,
  IconX,
  IconReceipt,
} from '@tabler/icons-react';

interface MultiBranchOutboxTableProps {
  items: WaOutboxItem[];
  total: number;
  filter: WaOutboxFilter;
  gudangList: { id: string; kode_gudang: string; nama: string }[];
  onFilterChange: (newFilter: Partial<WaOutboxFilter>) => void;
  onRetry: (id: string) => Promise<void>;
}

export function MultiBranchOutboxTable({
  items,
  total,
  filter,
  gudangList,
  onFilterChange,
  onRetry,
}: MultiBranchOutboxTableProps) {
  const [selectedItem, setSelectedItem] = useState<WaOutboxItem | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const currentPage = filter.page || 1;
  const limit = filter.limit || 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await onRetry(id);
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300">
            <IconChecks className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            Dibaca (Centang 2 Biru)
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
            <IconChecks className="h-3.5 w-3.5" />
            Sampai (Centang 2)
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
            <IconCheck className="h-3.5 w-3.5" />
            Terkirim (Centang 1)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
            <IconClock className="h-3.5 w-3.5" />
            Antrean (Pending)
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
            <IconClock className="h-3.5 w-3.5 animate-spin" />
            Diproses
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
            <IconAlertCircle className="h-3.5 w-3.5" />
            Gagal
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <IconReceipt className="h-5 w-5 text-brand-600" />
              Riwayat Pengiriman Pesan Seluruh Cabang
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Total {total} pesan tercatat dari seluruh terminal POS kasir dan sistem web.
            </p>
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cabang Filter */}
          <div>
            <select
              value={filter.gudangId || 'all'}
              onChange={(e) => onFilterChange({ gudangId: e.target.value, page: 1 })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 p-2 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="all">Semua Cabang / Gudang</option>
              {gudangList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} ({g.kode_gudang})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filter.status || 'all'}
              onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 p-2 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="all">Semua Status Pengiriman</option>
              <option value="pending">Pending (Antrean)</option>
              <option value="sent">Sent (Centang 1)</option>
              <option value="delivered">Delivered (Centang 2)</option>
              <option value="read">Read (Dibaca)</option>
              <option value="failed">Failed (Gagal)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari nomor HP / no nota..."
              value={filter.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="block md:hidden divide-y divide-neutral-200 dark:divide-neutral-800">
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Tidak ada data riwayat pengiriman yang cocok.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="p-4 space-y-2.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  +{item.phone}
                </span>
                {getStatusBadge(item.status)}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                  <IconBuildingStore className="h-3.5 w-3.5 text-neutral-400" />
                  {item.gudang?.nama || 'Pusat / Global'}
                </span>
                <span>•</span>
                <span className="font-semibold uppercase text-neutral-700 dark:text-neutral-300">
                  {item.type}
                </span>
                {item.reference_id && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {item.reference_id}
                    </span>
                  </>
                )}
              </div>

              <div className="text-[11px] text-neutral-400 font-mono">
                {new Date(item.created_at).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                {new Date(item.created_at).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>

              {item.error_message && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 p-2 text-[11px] text-rose-700 dark:text-rose-300">
                  {item.error_message}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelectedItem(item)}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition"
                >
                  <IconEye className="h-3.5 w-3.5" />
                  Detail Struk
                </button>

                {item.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(item.id)}
                    disabled={retryingId === item.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition"
                  >
                    <IconRefresh className={`h-3.5 w-3.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table Content (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50/70 text-xs font-semibold text-neutral-500 uppercase tracking-wider dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Cabang / Outlet</th>
              <th className="px-4 py-3">Nomor Tujuan</th>
              <th className="px-4 py-3">Tipe / Nota</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                  Tidak ada data riwayat pengiriman yang cocok.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition">
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono text-xs">
                    {new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    {new Date(item.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-medium text-neutral-800 dark:text-neutral-200">
                      <IconBuildingStore className="h-3.5 w-3.5 text-neutral-400" />
                      {item.gudang?.nama || 'Pusat / Global'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                    +{item.phone}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs uppercase">
                        {item.type}
                      </span>
                      {item.reference_id && (
                        <span className="block text-[11px] font-mono text-neutral-400">
                          {item.reference_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                    {item.error_message && (
                      <span className="block text-[10px] text-rose-500 max-w-xs truncate mt-0.5" title={item.error_message}>
                        {item.error_message}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                        title="Lihat pesan struk"
                      >
                        <IconEye className="h-3.5 w-3.5" />
                        Detail
                      </button>

                      {item.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
                          title="Kirim ulang pesan gagal"
                        >
                          <IconRefresh className={`h-3.5 w-3.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 sm:px-5 border-t border-neutral-200 dark:border-neutral-800 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400 text-center sm:text-left">
            Halaman {currentPage} dari {totalPages} ({total} total data)
          </span>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
            <button
              onClick={() => onFilterChange({ page: Math.max(1, currentPage - 1) })}
              disabled={currentPage <= 1}
              className="flex-1 sm:flex-none rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 active:scale-95 transition"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => onFilterChange({ page: Math.min(totalPages, currentPage + 1) })}
              disabled={currentPage >= totalPages}
              className="flex-1 sm:flex-none rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 active:scale-95 transition"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal Preview */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <IconReceipt className="h-5 w-5 text-brand-600" />
                <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
                  Pratinjau Pesan Struk (+{selectedItem.phone})
                </h4>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Cabang / Gudang:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {selectedItem.gudang?.nama || 'Pusat / Global'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Status Pesan:</span>
                  {getStatusBadge(selectedItem.status)}
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Sumber Pengiriman:</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">
                    {selectedItem.source}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">No Referensi / Faktur:</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">
                    {selectedItem.reference_id || '-'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  Isi Teks Pesan WhatsApp:
                </span>
                <pre className="whitespace-pre-wrap font-sans text-xs bg-[#EFEAE2] dark:bg-[#111B21] p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 leading-relaxed max-h-72 overflow-y-auto shadow-inner">
                  {selectedItem.message || '(Pesan kosong)'}
                </pre>
              </div>

              {selectedItem.error_message && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <span className="font-bold block mb-0.5">Detail Kegagalan:</span>
                  {selectedItem.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
