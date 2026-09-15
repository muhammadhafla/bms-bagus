'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Button,
  Spinner,
} from '@/components/ui';
import {
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconGitMerge,
  IconInfoCircle,
} from '@tabler/icons-react';
import { InventoryItem, InventoryDeletionCheck } from '@/types/inventory';
import { inventoryApi } from '@/lib/api';
import { toast } from 'sonner';

interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: InventoryItem[];
  onSuccess?: () => void;
  onRedirectToMerge?: (itemsToMerge: InventoryItem[]) => void;
}

export function BulkDeleteConfirmModal({
  isOpen,
  onClose,
  selectedItems,
  onSuccess,
  onRedirectToMerge,
}: BulkDeleteConfirmModalProps) {
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [checkResults, setCheckResults] = useState<InventoryDeletionCheck[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      setLoadingCheck(true);
      const ids = selectedItems.map((i) => i.id);
      inventoryApi
        .checkBatchCanDelete(ids)
        .then((res) => {
          if (res.data) {
            setCheckResults(res.data);
          } else {
            setCheckResults([]);
            toast.error(res.error?.message || 'Gagal memeriksa status transaksi barang');
          }
        })
        .catch((err) => {
          toast.error(err.message || 'Terjadi kesalahan sistem saat memeriksa data');
        })
        .finally(() => {
          setLoadingCheck(false);
        });
    } else {
      setCheckResults([]);
      setIsDeleting(false);
    }
  }, [isOpen, selectedItems]);

  const cleanItems = useMemo(() => {
    return checkResults.filter((r) => r.can_delete);
  }, [checkResults]);

  const blockedItems = useMemo(() => {
    return checkResults.filter((r) => !r.can_delete);
  }, [checkResults]);

  const handleDeleteCleanItems = useCallback(async () => {
    if (cleanItems.length === 0) return;

    setIsDeleting(true);
    try {
      const idsToDelete = cleanItems.map((i) => i.id);
      const result = await inventoryApi.deleteBatch(idsToDelete);

      if (result.error) {
        toast.error(result.error.message || 'Gagal menghapus barang');
      } else {
        toast.success(`Berhasil menghapus ${cleanItems.length} barang secara permanen.`);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menghapus barang');
    } finally {
      setIsDeleting(false);
    }
  }, [cleanItems, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Validasi & Hapus Massal Barang"
      size="md"
      isBottomSheetOnMobile
    >
      <div className="space-y-5">
        {loadingCheck ? (
          <div className="py-12 text-center">
            <Spinner size="md" className="mx-auto text-brand-600 mb-3" />
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Memeriksa riwayat transaksi dan nota pembelian...
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Memastikan integritas keuangan database tetap aman
            </p>
          </div>
        ) : (
          <>
            {/* Case 1: All items are clean */}
            {blockedItems.length === 0 && cleanItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <IconCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                      Seluruh {cleanItems.length} barang bersih dari transaksi
                    </p>
                    <p className="mt-1">
                      Tidak ada riwayat pembelian, penjualan, atau opname yang terikat pada barang-barang ini. Aman untuk dihapus secara permanen.
                    </p>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                  {cleanItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/50"
                    >
                      <span className="font-medium truncate text-neutral-900 dark:text-white">
                        {item.nama_barang}
                      </span>
                      <span className="text-neutral-500 font-mono text-[11px] shrink-0 ml-2">
                        {item.kode_barcode || '-'}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  ⚠️ Tindakan ini tidak dapat dibatalkan. Seluruh data stok per gudang dan barcode terkait akan dihapus bersih.
                </p>

                <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Button variant="secondary" onClick={onClose} disabled={isDeleting} className="flex-1">
                    Batal
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteCleanItems}
                    disabled={isDeleting}
                    leftIcon={isDeleting ? <Spinner size="sm" /> : <IconTrash size={18} />}
                    className="flex-1"
                  >
                    {isDeleting ? 'Menghapus...' : `Ya, Hapus ${cleanItems.length} Barang`}
                  </Button>
                </div>
              </div>
            )}

            {/* Case 2: All items have transactions */}
            {cleanItems.length === 0 && blockedItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                  <IconAlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-950 dark:text-amber-100">
                      Barang tidak dapat dihapus langsung
                    </p>
                    <p className="mt-1">
                      Seluruh {blockedItems.length} barang yang Anda pilih sudah memiliki riwayat transaksi (nota pembelian/penjualan). Menghapusnya secara permanen akan merusak laporan keuangan dan faktur supplier.
                    </p>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
                  {blockedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-white dark:bg-neutral-800 p-2.5 border border-neutral-200/70 dark:border-neutral-700/60 text-xs shadow-2xs"
                    >
                      <div className="font-semibold text-neutral-900 dark:text-white truncate">
                        {item.nama_barang}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                        {item.breakdown.pembelian > 0 && <span>• {item.breakdown.pembelian} Pembelian</span>}
                        {item.breakdown.penjualan > 0 && <span>• {item.breakdown.penjualan} Penjualan</span>}
                        {item.breakdown.opname > 0 && <span>• {item.breakdown.opname} Opname</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  💡 <strong>Solusi:</strong> Jika barang-barang ini adalah duplikat yang salah diinput, silakan gunakan fitur <strong>Gabung Massal (Merge)</strong> agar stok dan transaksi dialihkan ke barang asli.
                </p>

                <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Button variant="secondary" onClick={onClose} className="flex-1">
                    Tutup
                  </Button>
                  {onRedirectToMerge && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        onClose();
                        onRedirectToMerge(selectedItems);
                      }}
                      leftIcon={<IconGitMerge size={18} />}
                      className="flex-1"
                    >
                      Alihkan ke Gabung Massal
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Case 3: Mixed items (some clean, some have transactions) */}
            {cleanItems.length > 0 && blockedItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-4 text-xs leading-relaxed text-brand-900 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-200">
                  <IconInfoCircle className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-brand-950 dark:text-brand-100">
                      Sebagian Barang Memiliki Transaksi
                    </p>
                    <p className="mt-1">
                      Ditemukan <strong>{cleanItems.length} barang bersih</strong> yang siap dihapus, dan <strong>{blockedItems.length} barang</strong> yang terikat riwayat transaksi.
                    </p>
                  </div>
                </div>

                {/* Tabs or Sections */}
                <div className="grid grid-cols-1 gap-3 max-h-52 overflow-y-auto">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block mb-1">
                      Aman Dihapus ({cleanItems.length} Barang)
                    </span>
                    <ul className="text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
                      {cleanItems.map((item) => (
                        <li key={item.id} className="truncate">• {item.nama_barang}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                      Terikat Transaksi ({blockedItems.length} Barang)
                    </span>
                    <ul className="text-xs space-y-1 text-amber-900 dark:text-amber-200">
                      {blockedItems.map((item) => (
                        <li key={item.id} className="truncate">• {item.nama_barang} (Ada riwayat transaksi)</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Button variant="secondary" onClick={onClose} disabled={isDeleting} className="sm:w-1/3">
                    Batal
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteCleanItems}
                    disabled={isDeleting}
                    leftIcon={isDeleting ? <Spinner size="sm" /> : <IconTrash size={18} />}
                    className="flex-1"
                  >
                    {isDeleting ? 'Menghapus...' : `Hapus ${cleanItems.length} Barang Bersih`}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
