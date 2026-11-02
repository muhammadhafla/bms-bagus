'use client';

import React, { useState, useMemo } from 'react';
import { WaOutboxItem, WaOutboxFilter } from '@/types/wa-bridge';
import { FilterButton, ResponsivePanel, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  IconSearch,
  IconCheck,
  IconChecks,
  IconClock,
  IconAlertCircle,
  IconRefresh,
  IconEye,
  IconBuildingStore,
  IconX,
  IconReceipt,
  IconMessage,
} from '@tabler/icons-react';

interface MultiBranchOutboxTableProps {
  items: WaOutboxItem[];
  total: number;
  filter: WaOutboxFilter;
  gudangList: { id: string; kode_gudang: string; nama: string }[];
  onFilterChange: (newFilter: Partial<WaOutboxFilter>) => void;
  onRetry: (id: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
}

export function MultiBranchOutboxTable({
  items,
  total,
  filter,
  gudangList,
  onFilterChange,
  onRetry,
  onCancel,
}: MultiBranchOutboxTableProps) {
  const [selectedItem, setSelectedItem] = useState<WaOutboxItem | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<WaOutboxItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempGudangId, setTempGudangId] = useState(filter.gudangId || 'all');
  const [tempStatus, setTempStatus] = useState(filter.status || 'all');

  const currentPage = filter.page || 1;
  const limit = filter.limit || 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const activeFilters = useMemo(() => {
    const badges: { id: string; label: string; onRemove: () => void }[] = [];
    if (filter.gudangId && filter.gudangId !== 'all') {
      const g = gudangList.find((item) => item.id === filter.gudangId);
      badges.push({
        id: 'gudang',
        label: `Cabang: ${g?.nama || filter.gudangId}`,
        onRemove: () => onFilterChange({ gudangId: 'all', page: 1 }),
      });
    }
    if (filter.status && filter.status !== 'all') {
      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        sent: 'Centang 1',
        delivered: 'Centang 2',
        read: 'Dibaca',
        failed: 'Gagal',
        cancelled: 'Dibatalkan',
      };
      badges.push({
        id: 'status',
        label: `Status: ${statusLabels[filter.status] || filter.status}`,
        onRemove: () => onFilterChange({ status: 'all', page: 1 }),
      });
    }
    return badges;
  }, [filter.gudangId, filter.status, gudangList, onFilterChange]);

  const handleOpenFilter = () => {
    setTempGudangId(filter.gudangId || 'all');
    setTempStatus(filter.status || 'all');
    setIsFilterOpen(true);
  };

  const handleApplyFilters = () => {
    onFilterChange({
      gudangId: tempGudangId,
      status: tempStatus,
      page: 1,
    });
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setTempGudangId('all');
    setTempStatus('all');
    onFilterChange({
      gudangId: 'all',
      status: 'all',
      page: 1,
    });
    setIsFilterOpen(false);
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await onRetry(id);
    } finally {
      setRetryingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelConfirmTarget || !onCancel) return;
    const id = cancelConfirmTarget.id;
    setCancellingId(id);
    try {
      await onCancel(id);
      if (selectedItem?.id === id) {
        setSelectedItem((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      }
    } finally {
      setCancellingId(null);
      setCancelConfirmTarget(null);
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'receipt':
        return 'Struk';
      case 'text':
        return 'Pesan';
      default:
        return 'Detail';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'read':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300">
            <IconChecks className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
            Dibaca (Centang 2 Biru)
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
            <IconChecks className="h-3 w-3" />
            Sampai (Centang 2)
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
            <IconCheck className="h-3 w-3" />
            Terkirim (Centang 1)
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
            <IconClock className="h-3 w-3" />
            Antrean (Pending)
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-purple-700 dark:bg-purple-950/70 dark:text-purple-300">
            <IconClock className="h-3 w-3 animate-spin" />
            Diproses
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
            <IconAlertCircle className="h-3 w-3" />
            Gagal
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <IconX className="h-3 w-3 text-neutral-500" />
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
      {/* Header & Filter Toolbar */}
      <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari nomor HP / no nota..."
              value={filter.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 pl-9 pr-8 py-2 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-100"
            />
            {filter.search && (
              <button
                onClick={() => onFilterChange({ search: '', page: 1 })}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Filter Button (Opens SlideOver / Drawer) */}
          <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} />
        </div>

        {/* Active Filter Badges */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] text-neutral-400 flex-shrink-0">Filter:</span>
            {activeFilters.map((badge) => (
              <span
                key={badge.id}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
              >
                {badge.label}
                <button onClick={badge.onRemove} className="text-brand-400 hover:text-brand-700 ml-0.5">
                  <IconX size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-neutral-400 hover:text-rose-500 underline ml-1 whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card List View (< md) - Padat & Ringkas */}
      <div className="block md:hidden divide-y divide-neutral-100 dark:divide-neutral-800/80">
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Tidak ada data riwayat pengiriman yang cocok.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="px-3.5 py-2.5 space-y-1.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition active:bg-neutral-100/60 dark:active:bg-neutral-800/70"
            >
              {/* Row 1: Nomor HP & Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  +{item.phone}
                </span>
                {getStatusBadge(item.status)}
              </div>

              {/* Row 2: Cabang • Tipe/Nota & Tombol Struk */}
              <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5 truncate">
                  <IconBuildingStore className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{item.gudang?.nama || 'Pusat / Global'}</span>
                  <span className="text-neutral-300 dark:text-neutral-600">•</span>
                  <span className="font-semibold uppercase text-neutral-700 dark:text-neutral-300 text-[10px]">
                    {item.type}
                  </span>
                  {item.reference_id && (
                    <>
                      <span className="text-neutral-300 dark:text-neutral-600">•</span>
                      <span className="font-mono text-[10px] text-neutral-400 truncate max-w-[90px]">
                        {item.reference_id}
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setSelectedItem(item)}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 flex-shrink-0 active:scale-95 transition"
                >
                  <IconEye className="h-3 w-3 text-neutral-400" />
                  {getActionLabel(item.type)}
                </button>
              </div>

              {/* Row 3: Timestamp & Retry (bila gagal) */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <span>
                  {new Date(item.created_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  {new Date(item.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {item.status === 'failed' && (
                  <div className="flex items-center gap-1.5">
                    {onCancel && (
                      <button
                        onClick={() => setCancelConfirmTarget(item)}
                        disabled={cancellingId === item.id}
                        className="inline-flex items-center gap-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-neutral-700 disabled:opacity-50 active:scale-95 transition"
                      >
                        <IconX className="h-2.5 w-2.5" />
                        Batalkan
                      </button>
                    )}
                    <button
                      onClick={() => handleRetry(item.id)}
                      disabled={retryingId === item.id}
                      className="inline-flex items-center gap-1 rounded bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 active:scale-95 transition"
                    >
                      <IconRefresh className={`h-2.5 w-2.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                      Kirim Ulang
                    </button>
                  </div>
                )}
              </div>

              {/* Error Detail (if any) */}
              {item.error_message && (
                <div className="rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-2 py-1 text-[10px] text-rose-700 dark:text-rose-300 truncate">
                  {item.error_message}
                </div>
              )}
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
                        title={`Lihat ${getActionLabel(item.type).toLowerCase()}`}
                      >
                        <IconEye className="h-3.5 w-3.5" />
                        {getActionLabel(item.type)}
                      </button>

                      {item.status === 'failed' && (
                        <>
                          {onCancel && (
                            <button
                              onClick={() => setCancelConfirmTarget(item)}
                              disabled={cancellingId === item.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 shadow-xs hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-neutral-700 disabled:opacity-50 transition"
                              title="Batalkan pengiriman pesan ini"
                            >
                              <IconX className="h-3.5 w-3.5" />
                              Batalkan
                            </button>
                          )}
                          <button
                            onClick={() => handleRetry(item.id)}
                            disabled={retryingId === item.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-50 transition"
                            title="Kirim ulang pesan gagal"
                          >
                            <IconRefresh className={`h-3.5 w-3.5 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                            Retry
                          </button>
                        </>
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

      {/* Filter SlideOver / Bottom Drawer */}
      <ResponsivePanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Riwayat Pesan"
      >
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Cabang / Gudang
            </label>
            <select
              value={tempGudangId}
              onChange={(e) => setTempGudangId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="all">Semua Cabang / Gudang</option>
              {gudangList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} ({g.kode_gudang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Status Pengiriman
            </label>
            <select
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-brand-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="all">Semua Status Pengiriman</option>
              <option value="pending">Pending (Antrean)</option>
              <option value="sent">Sent (Centang 1)</option>
              <option value="delivered">Delivered (Centang 2)</option>
              <option value="read">Read (Centang 2 Biru)</option>
              <option value="failed">Failed (Gagal)</option>
              <option value="cancelled">Cancelled (Dibatalkan)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="secondary"
              className="flex-1 justify-center"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              className="flex-1 justify-center"
              onClick={handleApplyFilters}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </ResponsivePanel>

      {/* Receipt Modal Preview */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 space-y-4 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                {selectedItem.type === 'receipt' ? (
                  <IconReceipt className="h-5 w-5 text-brand-600" />
                ) : (
                  <IconMessage className="h-5 w-5 text-brand-600" />
                )}
                <h4 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
                  Pratinjau {getActionLabel(selectedItem.type)} (+{selectedItem.phone})
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              {selectedItem.status === 'failed' ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onCancel && (
                    <button
                      onClick={() => setCancelConfirmTarget(selectedItem)}
                      disabled={cancellingId === selectedItem.id}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white px-3 py-2 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-neutral-700 disabled:opacity-50 transition"
                    >
                      <IconX className="h-4 w-4" />
                      Batalkan Pesan
                    </button>
                  )}
                  <button
                    onClick={() => handleRetry(selectedItem.id)}
                    disabled={retryingId === selectedItem.id}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
                  >
                    <IconRefresh className={`h-4 w-4 ${retryingId === selectedItem.id ? 'animate-spin' : ''}`} />
                    Kirim Ulang
                  </button>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full sm:w-auto rounded-xl bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={!!cancelConfirmTarget}
        title="Batalkan Pengiriman Pesan?"
        message={`Apakah Anda yakin ingin membatalkan pengiriman pesan ke +${cancelConfirmTarget?.phone}? Status akan menjadi Dibatalkan secara permanen dan tidak dapat dikirim ulang.`}
        confirmLabel="Ya, Batalkan"
        cancelLabel="Kembali"
        danger={true}
        isLoading={cancellingId === cancelConfirmTarget?.id}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelConfirmTarget(null)}
      />
    </div>
  );
}
