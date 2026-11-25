'use client';

import React from 'react';
import {
  IconX,
  IconPlus,
  IconAlertCircle,
  IconCheck,
  IconFileExport,
  IconExternalLink,
} from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import {
  AggregatedReturnItem,
  AlasanRetur,
  SupplierReturnOption,
} from '@/lib/api/return';
import { formatCurrency, formatDateWIB } from '@/lib/utils';
import { Supplier } from '@/lib/api/supplier';
import { InventoryItem } from '@/types/inventory';
import { ReturnPreviewData, ReturnSuccessModalData } from '../_hooks/useReturnSubmit';

interface ReturnModalsProps {
  supplierModalOpen: boolean;
  pendingScanItem: InventoryItem | null;
  supplierOptions: SupplierReturnOption[];
  suppliers: Supplier[];
  selectedGudangId: string;
  onCloseSupplierModal: () => void;
  onPickScannedSupplier: (
    supplier: Supplier,
    draft: Record<string, { qty: number; alasan: AlasanRetur }>,
  ) => Promise<void>;
  showResetConfirm: boolean;
  onCloseResetConfirm: () => void;
  onConfirmReset: () => void;
  showPreview: boolean;
  previewData: ReturnPreviewData | null;
  error: string | null;
  submitting: boolean;
  onClosePreview: () => void;
  onConfirmSubmit: () => void;
  successModalData: ReturnSuccessModalData | null;
  pdfError: string | null;
  exportingPdf: boolean;
  onExportPdf: (returnId: string) => void;
  onCloseSuccess: () => void;
  onNavigateHistory: () => void;
}

export function ReturnModals({
  supplierModalOpen,
  pendingScanItem,
  supplierOptions,
  suppliers,
  onCloseSupplierModal,
  onPickScannedSupplier,
  showResetConfirm,
  onCloseResetConfirm,
  onConfirmReset,
  showPreview,
  previewData,
  error,
  submitting,
  onClosePreview,
  onConfirmSubmit,
  successModalData,
  pdfError,
  exportingPdf,
  onExportPdf,
  onCloseSuccess,
  onNavigateHistory,
}: ReturnModalsProps) {
  return (
    <>
      {/* MODAL MULTI-SUPPLIER PICKER */}
      {supplierModalOpen && pendingScanItem && (
        <Portal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="supplier-picker-title"
              className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    id="supplier-picker-title"
                    className="text-base font-bold text-neutral-900 dark:text-white"
                  >
                    Pilih Supplier Sumber Barang
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Barang <strong>&quot;{pendingScanItem.nama_barang}&quot;</strong> tercatat pernah
                    dibeli dari beberapa supplier berbeda:
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup dialog pilih supplier"
                  onClick={onCloseSupplierModal}
                  className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
                {supplierOptions.map((sup, idx) => {
                  const isLatest = idx === 0 && !!sup.tanggal_terakhir;
                  const hargaBersih = (sup.harga_beli ?? 0) - (sup.diskon ?? 0);

                  return (
                    <div
                      key={sup.supplier_id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isLatest
                          ? 'border-brand-300 bg-brand-50/40 shadow-sm dark:border-brand-800 dark:bg-brand-950/20'
                          : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                            {sup.supplier_nama}
                          </span>
                          {isLatest && (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                              Rekomendasi (Terakhir)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5 text-neutral-600 dark:text-neutral-400">
                        <div>
                          <span className="text-[10px] font-medium text-neutral-400 block">
                            Beli Terakhir
                          </span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {sup.tanggal_terakhir ? formatDateWIB(sup.tanggal_terakhir) : '-'}
                          </span>
                          {sup.nomor_nota && (
                            <span className="text-[10px] text-neutral-400 block font-mono">
                              #{sup.nomor_nota}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-neutral-400 block">
                            Harga Beli
                          </span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {sup.harga_beli !== undefined ? formatCurrency(hargaBersih) : '-'}
                          </span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-medium text-neutral-400 block">
                            Sisa Kuota Retur
                          </span>
                          <span className="font-bold text-brand-600 dark:text-brand-400">
                            {sup.total_qty_remaining} pcs
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/60 flex justify-end">
                        <Button
                          variant={isLatest ? 'primary' : 'secondary'}
                          size="sm"
                          className="text-xs font-bold rounded-xl"
                          onClick={async () => {
                            const matchedSup = suppliers.find((s) => s.id === sup.supplier_id);
                            if (matchedSup) {
                              await onPickScannedSupplier(matchedSup, {
                                [pendingScanItem.id]: { qty: 1, alasan: 'rusak' },
                              });
                            }
                          }}
                        >
                          <IconPlus className="h-3.5 w-3.5 mr-1" />
                          Pilih Supplier Ini
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <Button
                  variant="ghost"
                  className="w-full text-xs font-semibold"
                  onClick={onCloseSupplierModal}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* MODAL RESET CONFIRMATION */}
      {showResetConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-confirm-title"
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-950/40">
                <IconAlertCircle className="h-6 w-6" />
              </div>
              <h3
                id="reset-confirm-title"
                className="text-base font-bold text-neutral-900 dark:text-white"
              >
                Kosongkan Keranjang Retur?
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Seluruh barang retur yang telah discan dan draft yang tersimpan akan dihapus.
              </p>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs font-semibold"
                  onClick={onCloseResetConfirm}
                >
                  Batal
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs font-bold"
                  onClick={onConfirmReset}
                >
                  Ya, Kosongkan
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* MODAL PREVIEW & KONFIRMASI RETUR */}
      {showPreview && previewData && (
        <Portal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-return-title"
              className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
                <div>
                  <h2
                    id="preview-return-title"
                    className="text-lg font-bold text-neutral-900 dark:text-white"
                  >
                    Konfirmasi Retur Pembelian
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Periksa kembali barang yang akan dikembalikan ke supplier
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup pratinjau retur"
                  onClick={onClosePreview}
                  className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600"
                >
                  <IconX className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs font-semibold text-danger-700 dark:border-danger-900/50 dark:bg-danger-950/40 dark:text-danger-400">
                    <IconAlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5 text-xs dark:border-brand-900/30 dark:bg-brand-950/20">
                  <div>
                    <span className="text-neutral-400">Supplier Tujuan:</span>
                    <p className="font-bold text-neutral-900 dark:text-white">
                      {previewData.supplierNama}
                    </p>
                  </div>
                  <div>
                    <span className="text-neutral-400">Penyelesaian:</span>
                    <p className="font-bold text-brand-600 dark:text-brand-400">
                      {previewData.metodeKompensasi === 'potong_hutang'
                        ? 'Potong Hutang'
                        : previewData.metodeKompensasi === 'refund_kas'
                          ? 'Refund Kas/Tunai'
                          : 'Tukar Barang Baru'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                    Daftar Barang ({previewData.items.length})
                  </h4>
                  <div className="space-y-2">
                    {previewData.items.map((item: AggregatedReturnItem) => (
                      <div
                        key={item.inventory_id}
                        className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 text-xs dark:border-neutral-800"
                      >
                        <div>
                          <p className="font-bold text-neutral-900 dark:text-white">
                            {item.nama_barang}
                          </p>
                          <span className="text-[11px] text-neutral-400">
                            Alasan: {item.alasan}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-neutral-900 dark:text-white">
                            {item.return_qty} pcs
                          </span>
                          <p className="font-semibold text-brand-600 dark:text-brand-400">
                            {formatCurrency(
                              item.batches.reduce(
                                (sub, b) => sub + b.allocated_qty * (b.harga_beli - b.diskon),
                                0,
                              ),
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <span className="text-xs font-semibold text-neutral-500">
                    Total Nilai Retur:
                  </span>
                  <span className="text-lg font-extrabold text-neutral-900 dark:text-white">
                    {formatCurrency(previewData.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs font-semibold"
                  onClick={onClosePreview}
                  disabled={submitting}
                >
                  Periksa Kembali
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-xs font-bold"
                  onClick={onConfirmSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* MODAL SUKSES TRANSAKSI RETUR */}
      {successModalData && (
        <Portal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="success-return-title"
              className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-neutral-900"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-950/40">
                <IconCheck className="h-8 w-8" />
              </div>
              <h3
                id="success-return-title"
                className="text-lg font-extrabold text-neutral-900 dark:text-white"
              >
                Retur Berhasil Disimpan!
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Dokumen retur ke <strong>{successModalData.supplierNama}</strong> telah berhasil
                dicatat.
              </p>

              <div className="my-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-left text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                <div className="flex justify-between mb-1.5">
                  <span className="text-neutral-400">No. Bukti Retur:</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {successModalData.returnId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-neutral-400">Total Produk:</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {successModalData.itemCount} pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Nominal:</span>
                  <span className="font-extrabold text-brand-600 dark:text-brand-400">
                    {formatCurrency(successModalData.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {pdfError && (
                  <div className="mb-2 flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-2.5 text-xs font-semibold text-danger-700 dark:border-danger-900/50 dark:bg-danger-950/40 dark:text-danger-400 text-left">
                    <IconAlertCircle className="h-4 w-4 shrink-0" />
                    <span>{pdfError}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full text-xs font-bold shadow-lg"
                  onClick={() => onExportPdf(successModalData.returnId)}
                  disabled={exportingPdf}
                >
                  <IconFileExport className="mr-1.5 h-4 w-4" />
                  {exportingPdf ? 'Menyiapkan PDF...' : 'Cetak / Bagikan Surat Retur (PDF)'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs font-semibold"
                    onClick={onCloseSuccess}
                  >
                    Buat Retur Baru
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-xs font-semibold"
                    onClick={onNavigateHistory}
                  >
                    Lihat Riwayat
                    <IconExternalLink className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
