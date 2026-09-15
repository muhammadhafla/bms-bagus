'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
  Badge,
  Spinner,
} from '@/components/ui';
import {
  IconGitMerge,
  IconAlertTriangle,
  IconCheck,
  IconPackage,
  IconBuildingWarehouse,
  IconReceipt,
  IconX,
  IconArrowRight,
  IconSearch,
  IconInfoCircle,
} from '@tabler/icons-react';
import { InventoryItem, MergeInventoryResult } from '@/types/inventory';
import { inventoryApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { SharedBarcodeSearch } from './SharedBarcodeSearch';
import { toast } from 'sonner';

interface MergeInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceItems: InventoryItem[];
  onSuccess?: (result: MergeInventoryResult) => void;
}

export function MergeInventoryModal({
  isOpen,
  onClose,
  sourceItems,
  onSuccess,
}: MergeInventoryModalProps) {
  // Mode selection: 'from_selection' (if multiple items checked) or 'search_catalog'
  const isMultiSelection = sourceItems.length > 1;
  const [targetSelectionMode, setTargetSelectionMode] = useState<'from_selection' | 'search_catalog'>(
    isMultiSelection ? 'from_selection' : 'search_catalog'
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [catalogTargetItem, setCatalogTargetItem] = useState<InventoryItem | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      if (sourceItems.length > 1) {
        setTargetSelectionMode('from_selection');
        setSelectedTargetId(sourceItems[0]?.id || '');
      } else {
        setTargetSelectionMode('search_catalog');
        setSelectedTargetId('');
      }
      setCatalogTargetItem(null);
      setIsConfirmed(false);
      setIsMerging(false);
    }
  }, [isOpen, sourceItems]);

  // Determine which item is the target and which are the actual sources
  const { targetItem, effectiveSourceItems } = useMemo(() => {
    if (targetSelectionMode === 'from_selection' && selectedTargetId) {
      const target = sourceItems.find((i) => i.id === selectedTargetId) || null;
      const sources = sourceItems.filter((i) => i.id !== selectedTargetId);
      return { targetItem: target, effectiveSourceItems: sources };
    } else if (targetSelectionMode === 'search_catalog' && catalogTargetItem) {
      return { targetItem: catalogTargetItem, effectiveSourceItems: sourceItems };
    }
    return { targetItem: null, effectiveSourceItems: sourceItems };
  }, [targetSelectionMode, selectedTargetId, catalogTargetItem, sourceItems]);

  const totalSourceStock = useMemo(() => {
    return effectiveSourceItems.reduce((acc, item) => acc + (item.stok || 0), 0);
  }, [effectiveSourceItems]);

  const finalEstimatedStock = useMemo(() => {
    return (targetItem?.stok || 0) + totalSourceStock;
  }, [targetItem, totalSourceStock]);

  const handleExecuteMerge = useCallback(async () => {
    if (!targetItem) {
      toast.error('Silakan pilih barang utama tujuan terlebih dahulu.');
      return;
    }

    if (effectiveSourceItems.length === 0) {
      toast.error('Tidak ada barang duplikat yang akan digabungkan.');
      return;
    }

    const sourceIds = effectiveSourceItems.map((i) => i.id);

    setIsMerging(true);
    try {
      const result = await inventoryApi.mergeDuplicates(sourceIds, targetItem.id);

      if (result.error || !result.data) {
        toast.error(result.error?.message || 'Gagal menggabungkan barang duplikat');
      } else {
        toast.success(
          `Berhasil menggabungkan ${effectiveSourceItems.length} barang ke "${targetItem.nama_barang}"`
        );
        if (onSuccess) {
          onSuccess(result.data);
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menggabungkan barang');
    } finally {
      setIsMerging(false);
    }
  }, [targetItem, effectiveSourceItems, onSuccess, onClose]);

  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowInfo(false);
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showInfo) {
        setShowInfo(false);
      }
    };
    if (showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showInfo]);

  const headerInfoExtra = (
    <div className="relative inline-flex items-center shrink-0" ref={infoRef}>
      <button
        type="button"
        onClick={() => setShowInfo((prev) => !prev)}
        className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-brand-400"
        title="Informasi cara kerja penggabungan"
        aria-label="Informasi cara kerja penggabungan barang"
      >
        <IconInfoCircle className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {showInfo && (
        <div className="fixed left-4 right-4 top-14 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 z-50 w-auto sm:w-88 rounded-2xl border border-brand-200/90 bg-white p-4 text-xs shadow-2xl backdrop-blur-md animate-fade-in dark:border-brand-900/60 dark:bg-neutral-900">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <IconGitMerge className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="font-semibold text-neutral-900 dark:text-white text-sm">
                Penggabungan Data Transaksi & Stok
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                Seluruh riwayat transaksi (nota pembelian, penjualan, dan mutasi kartu stok) dari barang duplikat akan dialihkan ke <strong className="font-semibold text-neutral-900 dark:text-white">Barang Utama</strong>.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                Stok fisik akan digabungkan dan barang duplikat akan dihapus secara permanen dari sistem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              aria-label="Tutup info"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gabung Barang Duplikat (Merge)"
      headerExtra={headerInfoExtra}
      size="lg"
      isBottomSheetOnMobile
    >
      <div className="space-y-6">
        {/* Step 1: Daftar Barang Duplikat */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
              Barang Duplikat yang Akan Dihilangkan ({effectiveSourceItems.length})
            </span>
          </div>
          <div className="max-h-44 space-y-2 overflow-y-auto rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
            {effectiveSourceItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white px-3 py-2 text-xs shadow-2xs dark:border-neutral-700/60 dark:bg-neutral-800"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate font-semibold text-neutral-900 dark:text-white">
                    {item.nama_barang}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>{item.kode_barcode || 'No Barcode'}</span>
                    <span>•</span>
                    <span>HPP: {formatCurrency(item.harga_beli_terakhir || 0)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    {item.stok} pcs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Pilih Barang Utama (Target) */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase dark:text-neutral-300">
              Pilih Barang Utama (Target Penggabungan)
            </span>
            {isMultiSelection && (
              <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs dark:border-neutral-800 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => setTargetSelectionMode('from_selection')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                    targetSelectionMode === 'from_selection'
                      ? 'bg-white text-brand-600 shadow-2xs dark:bg-neutral-700 dark:text-brand-300'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  Dari yang Dicentang
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSelectionMode('search_catalog')}
                  className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                    targetSelectionMode === 'search_catalog'
                      ? 'bg-white text-brand-600 shadow-2xs dark:bg-neutral-700 dark:text-brand-300'
                      : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  Cari di Katalog
                </button>
              </div>
            )}
          </div>

          {targetSelectionMode === 'from_selection' && isMultiSelection ? (
            <div className="space-y-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="px-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                Pilih salah satu barang di bawah ini yang akan dipertahankan sebagai barang utama:
              </p>
              {sourceItems.map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs transition-all ${
                    selectedTargetId === item.id
                      ? 'border-brand-500 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-950/30 font-semibold'
                      : 'border-neutral-200/70 bg-white hover:bg-neutral-50 dark:border-neutral-700/60 dark:bg-neutral-800 dark:hover:bg-neutral-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <input
                      type="radio"
                      name="target_item"
                      value={item.id}
                      checked={selectedTargetId === item.id}
                      onChange={() => setSelectedTargetId(item.id)}
                      className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="truncate">
                      <div className="text-neutral-900 dark:text-white truncate">
                        {item.nama_barang}
                      </div>
                      <div className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                        {item.kode_barcode} • Jual: {formatCurrency(item.harga_jual)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {item.stok} pcs
                    </span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Reuse SharedBarcodeSearch component */}
              <SharedBarcodeSearch
                placeholder="Ketik nama atau scan barcode barang utama..."
                filterPredicate={(item) => !sourceItems.some((s) => s.id === item.id)}
                onItemSelected={(item) => setCatalogTargetItem(item)}
              />

              {catalogTargetItem ? (
                <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50/60 p-3 text-xs dark:border-green-900/40 dark:bg-green-950/30">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 font-bold text-green-900 dark:text-green-200">
                      <IconCheck size={16} className="text-green-600 dark:text-green-400 shrink-0" />
                      <span className="truncate">{catalogTargetItem.nama_barang}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-green-700 dark:text-green-400">
                      <span>Barcode: {catalogTargetItem.kode_barcode}</span>
                      <span>•</span>
                      <span>Stok: {catalogTargetItem.stok} pcs</span>
                      <span>•</span>
                      <span>Jual: {formatCurrency(catalogTargetItem.harga_jual)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCatalogTargetItem(null)}
                    className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  >
                    <IconX size={16} />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
                  Cari dan pilih barang utama yang ingin dijadikan tujuan penggabungan.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Pratinjau Dampak Penggabungan */}
        {targetItem && (
          <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
            <span className="text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
              Pratinjau Hasil Akhir
            </span>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/60 bg-white p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Total Stok Akhir</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-neutral-900 dark:text-white">
                    {finalEstimatedStock} pcs
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    (+{totalSourceStock} dari duplikat)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/60 bg-white p-3 shadow-2xs dark:border-neutral-800 dark:bg-neutral-800">
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">Barang yang Dihapus</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-accent-rose-600 dark:text-accent-rose-400">
                    {effectiveSourceItems.length} barang
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    (nota & stok dialihkan)
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              💡 Harga beli terakhir (HPP) pada <strong>{targetItem.nama_barang}</strong> akan otomatis diperbarui apabila barang duplikat memiliki transaksi pembelian yang lebih baru.
            </p>
          </div>
        )}

        {/* Checkbox Konfirmasi */}
        {targetItem && (
          <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 dark:border-neutral-600 dark:bg-neutral-800"
              />
              <span className="text-xs text-neutral-700 dark:text-neutral-300 leading-normal">
                Saya memahami bahwa {effectiveSourceItems.length} barang duplikat di atas akan <strong>dihapus permanen</strong> dan seluruh nota transaksi serta stoknya akan dipindahkan ke <strong>{targetItem.nama_barang}</strong>.
              </span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isMerging}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleExecuteMerge}
            disabled={!targetItem || !isConfirmed || isMerging}
            leftIcon={isMerging ? <Spinner size="sm" /> : <IconGitMerge size={18} />}
            className="flex-1"
          >
            {isMerging ? 'Memproses Penggabungan...' : 'Gabungkan & Hapus Duplikat'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
