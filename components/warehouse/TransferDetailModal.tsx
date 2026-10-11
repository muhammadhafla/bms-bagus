'use client';

import React from 'react';
import {
  IconAlertTriangle,
  IconSparkles,
  IconCheck,
  IconPrinter,
  IconSend,
} from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { useAuthStore } from '@/lib/auth';
import { TransferStok } from '@/types/warehouse';

export interface ReceiveItemState {
  inventory_id: string;
  qty_terima: number;
  catatan: string;
}

export interface TransferDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTransfer: TransferStok | null;
  destinationWarning?: string | null;
  receiveItems: ReceiveItemState[];
  setReceiveItems: React.Dispatch<React.SetStateAction<ReceiveItemState[]>>;
  onTerimaSemuaSempurna: () => void;
  onConfirmTerima: () => void;
  onKirim: (transferId: string) => void;
  isKirimLoading?: boolean;
  isTerimaLoading?: boolean;
  userGudangId?: string;
  renderStatusBadge: (status: string) => React.ReactNode;
}

export default function TransferDetailModal({
  isOpen,
  onClose,
  selectedTransfer,
  destinationWarning,
  receiveItems,
  setReceiveItems,
  onTerimaSemuaSempurna,
  onConfirmTerima,
  onKirim,
  isKirimLoading = false,
  isTerimaLoading = false,
  userGudangId,
  renderStatusBadge,
}: TransferDetailModalProps) {
  const { isAdmin } = useAuthStore();

  if (!selectedTransfer) return null;

  return (
    <ResponsivePanel
      isOpen={isOpen && !!selectedTransfer}
      onClose={onClose}
      title={`Dokumen Transfer: ${selectedTransfer.nomor_transfer}`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Destination Warehouse Guard Warning */}
        {destinationWarning && (
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-800 dark:text-amber-200 text-xs animate-fade-in">
            <IconAlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">{destinationWarning}</span>
          </div>
        )}

        {/* Status Milestone Timeline */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/70 p-3 border border-neutral-200/50 dark:border-neutral-800/50">
          {/* Step 1: Draft */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                selectedTransfer.status === 'CANCELED'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'bg-brand-600 text-white'
              }`}
            >
              1
            </div>
            <span className="mt-1 font-semibold text-neutral-900 dark:text-white text-xs">
              Draft Dibuat
            </span>
            <span className="text-[10px] text-neutral-500">
              {selectedTransfer.created_at
                ? new Date(selectedTransfer.created_at).toLocaleDateString('id-ID')
                : '-'}
            </span>
          </div>

          {/* Step 2: In Transit */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                ['IN_TRANSIT', 'RECEIVED'].includes(selectedTransfer.status)
                  ? 'bg-amber-500 text-white'
                  : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800'
              }`}
            >
              2
            </div>
            <span className="mt-1 font-semibold text-neutral-900 dark:text-white text-xs">
              Pengiriman
            </span>
            <span className="text-[10px] text-neutral-500">
              {selectedTransfer.tanggal_kirim
                ? new Date(selectedTransfer.tanggal_kirim).toLocaleDateString('id-ID')
                : 'Menunggu Kirim'}
            </span>
          </div>

          {/* Step 3: Received */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                selectedTransfer.status === 'RECEIVED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800'
              }`}
            >
              3
            </div>
            <span className="mt-1 font-semibold text-neutral-900 dark:text-white text-xs">
              Selesai Diterima
            </span>
            <span className="text-[10px] text-neutral-500">
              {selectedTransfer.tanggal_terima
                ? new Date(selectedTransfer.tanggal_terima).toLocaleDateString('id-ID')
                : 'Menunggu Fisik'}
            </span>
          </div>
        </div>

        {/* Header Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 text-xs border border-neutral-100 dark:border-neutral-800">
          <div>
            <span className="text-neutral-500 block">Gudang Pengirim:</span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              {selectedTransfer.gudang_asal?.nama}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Gudang Penerima:</span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              {selectedTransfer.gudang_tujuan?.nama}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Status:</span>
            <div className="mt-0.5">{renderStatusBadge(selectedTransfer.status)}</div>
          </div>
          <div>
            <span className="text-neutral-500 block">Kurir / Pengantar:</span>
            <span className="text-neutral-800 dark:text-neutral-200">
              {selectedTransfer.kurir_pengirim || '-'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Waktu Kirim:</span>
            <span className="text-neutral-800 dark:text-neutral-200">
              {selectedTransfer.tanggal_kirim
                ? new Date(selectedTransfer.tanggal_kirim).toLocaleString('id-ID')
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 block">Waktu Terima:</span>
            <span className="text-neutral-800 dark:text-neutral-200">
              {selectedTransfer.tanggal_terima
                ? new Date(selectedTransfer.tanggal_terima).toLocaleString('id-ID')
                : '-'}
            </span>
          </div>
        </div>

        {/* Quick Action: Terima Semua Sesuai Kirim (Saat IN_TRANSIT) */}
        {selectedTransfer.status === 'IN_TRANSIT' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-brand-50 border border-brand-200/80 p-3.5 dark:bg-brand-950/30 dark:border-brand-800/60 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
                <IconSparkles size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-brand-950 dark:text-brand-100">
                  Verifikasi Muatan Fisik
                </p>
                <p className="text-[11px] text-brand-700/80 dark:text-brand-300/80 leading-tight">
                  Pastikan jumlah barang fisik sesuai surat jalan sebelum konfirmasi.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={onTerimaSemuaSempurna}
              leftIcon={<IconCheck size={15} />}
              className="w-full sm:w-auto shrink-0 text-xs py-2.5 sm:py-2 font-bold shadow-sm"
            >
              Terima Semua Sempurna
            </Button>
          </div>
        )}

        {/* Items Checklist - Desktop Table */}
        <div className="hidden sm:block border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full text-xs min-w-[500px]">
            <thead className="bg-neutral-100/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
              <tr>
                <th className="px-3 py-2.5 text-left">Nama Barang</th>
                <th className="px-3 py-2.5 text-center w-24">Qty Kirim</th>
                <th className="px-3 py-2.5 text-center w-32">Qty Terima</th>
                <th className="px-3 py-2.5 text-left">Catatan Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {(selectedTransfer.items || []).map((item) => {
                const isEditable = selectedTransfer.status === 'IN_TRANSIT';
                const receiveState = receiveItems.find(
                  (ri) => ri.inventory_id === item.inventory_id,
                );
                const currentQtyTerima = receiveState?.qty_terima ?? item.qty_kirim;
                const hasSelisih = currentQtyTerima < item.qty_kirim;

                return (
                  <tr
                    key={item.id}
                    className={hasSelisih ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-neutral-900 dark:text-white block">
                        {item.inventory?.nama_barang}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-mono">
                        {item.inventory?.kode_barcode}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-neutral-800 dark:text-neutral-200">
                      {item.qty_kirim} {item.inventory?.unit || 'pcs'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isEditable ? (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={item.qty_kirim}
                            value={currentQtyTerima}
                            aria-label={`Jumlah terima ${item.inventory?.nama_barang || ''}`}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value) || 0;
                              const clamped = Math.min(item.qty_kirim, Math.max(0, parsed));
                              setReceiveItems((prev) =>
                                prev.map((ri) =>
                                  ri.inventory_id === item.inventory_id
                                    ? { ...ri, qty_terima: clamped }
                                    : ri,
                                ),
                              );
                            }}
                            className={`w-20 rounded-lg border px-2 py-1.5 text-center font-bold text-neutral-900 transition-all dark:bg-neutral-800 dark:text-white ${
                              hasSelisih
                                ? 'border-amber-400 bg-amber-50/80 text-amber-900 dark:border-amber-600 dark:text-amber-200'
                                : 'border-neutral-300 bg-white dark:border-neutral-700'
                            }`}
                          />
                          {hasSelisih && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              <IconAlertTriangle size={11} /> Selisih -{item.qty_kirim - currentQtyTerima}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.qty_terima} {item.inventory?.unit || 'pcs'}
                          </span>
                          {item.qty_terima < item.qty_kirim && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              (Selisih -{item.qty_kirim - item.qty_terima})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isEditable ? (
                        <div>
                          <input
                            type="text"
                            value={receiveState?.catatan ?? ''}
                            aria-label={`Catatan selisih ${item.inventory?.nama_barang || ''}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReceiveItems((prev) =>
                                prev.map((ri) =>
                                  ri.inventory_id === item.inventory_id
                                    ? { ...ri, catatan: val }
                                    : ri,
                                ),
                              );
                            }}
                            placeholder={
                              hasSelisih
                                ? 'Wajib: Keterangan barang kurang/rusak...'
                                : 'Catatan opsional...'
                            }
                            className={`w-full min-w-[150px] rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                              hasSelisih && !receiveState?.catatan?.trim()
                                ? 'border-amber-400 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-950/20'
                                : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                            }`}
                          />
                        </div>
                      ) : (
                        <span className="text-neutral-500">{item.catatan || '-'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Items Checklist - Mobile Cards */}
        <div className="flex flex-col gap-3 sm:hidden">
          {(selectedTransfer.items || []).map((item) => {
            const isEditable = selectedTransfer.status === 'IN_TRANSIT';
            const receiveState = receiveItems.find(
              (ri) => ri.inventory_id === item.inventory_id,
            );
            const currentQtyTerima = receiveState?.qty_terima ?? item.qty_kirim;
            const hasSelisih = currentQtyTerima < item.qty_kirim;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 shadow-sm transition-all ${
                  hasSelisih
                    ? 'border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                    : 'border-neutral-200/80 bg-white dark:border-neutral-800/80 dark:bg-neutral-900'
                }`}
              >
                <div className="mb-2 border-b border-neutral-100 pb-2 dark:border-neutral-800 flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                      {item.inventory?.nama_barang}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      {item.inventory?.kode_barcode}
                    </span>
                  </div>
                  {hasSelisih && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <IconAlertTriangle size={11} /> -{item.qty_kirim - currentQtyTerima} pcs
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                  <div className="flex flex-col justify-center rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-2.5 border border-neutral-100 dark:border-neutral-800">
                    <span className="block text-[11px] text-neutral-500 font-medium">Qty Kirim</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm mt-0.5">
                      {item.qty_kirim} <span className="text-xs font-normal text-neutral-500">{item.inventory?.unit || 'pcs'}</span>
                    </span>
                  </div>
                  <div className="flex flex-col justify-center rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-2.5 border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="block text-[11px] text-neutral-500 font-medium">Qty Terima</span>
                      {isEditable && currentQtyTerima < item.qty_kirim && (
                        <button
                          type="button"
                          onClick={() => {
                            setReceiveItems((prev) =>
                              prev.map((ri) =>
                                ri.inventory_id === item.inventory_id
                                  ? { ...ri, qty_terima: item.qty_kirim }
                                  : ri,
                              ),
                            );
                          }}
                          className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Samakan
                        </button>
                      )}
                    </div>
                    {isEditable ? (
                      <input
                        type="number"
                        min="0"
                        max={item.qty_kirim}
                        value={currentQtyTerima}
                        aria-label={`Jumlah terima ${item.inventory?.nama_barang || ''}`}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value) || 0;
                          const clamped = Math.min(item.qty_kirim, Math.max(0, parsed));
                          setReceiveItems((prev) =>
                            prev.map((ri) =>
                              ri.inventory_id === item.inventory_id
                                ? { ...ri, qty_terima: clamped }
                                : ri,
                            ),
                          );
                        }}
                        className={`w-full mt-1 rounded-lg border py-1 px-2 text-center text-sm font-bold text-neutral-900 transition-all dark:text-white ${
                          hasSelisih
                            ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                        }`}
                      />
                    ) : (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                        {item.qty_terima} <span className="text-xs font-normal text-neutral-500">{item.inventory?.unit || 'pcs'}</span>
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <span className="block text-xs text-neutral-500 mb-1">Catatan Selisih</span>
                  {isEditable ? (
                    <input
                      type="text"
                      value={receiveState?.catatan ?? ''}
                      aria-label={`Catatan selisih ${item.inventory?.nama_barang || ''}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReceiveItems((prev) =>
                          prev.map((ri) =>
                            ri.inventory_id === item.inventory_id
                              ? { ...ri, catatan: val }
                              : ri,
                          ),
                        );
                      }}
                      placeholder={
                        hasSelisih
                          ? 'Wajib diisi keterangan selisih...'
                          : 'Tuliskan catatan selisih jika ada...'
                      }
                      className={`w-full rounded-lg border px-3 py-1.5 text-xs transition-all ${
                        hasSelisih && !receiveState?.catatan?.trim()
                          ? 'border-amber-400 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-950/20'
                          : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                      }`}
                    />
                  ) : (
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.catatan || '-'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons (Sticky di Bawah) */}
        {(() => {
          const itemsWithSelisih = (selectedTransfer.items || []).filter((it) => {
            const rec = receiveItems.find((r) => r.inventory_id === it.inventory_id);
            const currentQty = rec?.qty_terima ?? it.qty_kirim;
            return currentQty < it.qty_kirim;
          });
          const totalSelisihQty = (selectedTransfer.items || []).reduce((acc, it) => {
            const rec = receiveItems.find((r) => r.inventory_id === it.inventory_id);
            const currentQty = rec?.qty_terima ?? it.qty_kirim;
            return acc + (it.qty_kirim - currentQty);
          }, 0);

          return (
            <div className="sticky -bottom-4 sm:-bottom-5 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 mt-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col gap-2 shadow-lg sm:shadow-none">
              {selectedTransfer.status === 'IN_TRANSIT' && itemsWithSelisih.length > 0 && (
                <div className="flex sm:hidden items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <IconAlertTriangle size={13} className="shrink-0" />
                    <span>Ada selisih {itemsWithSelisih.length} barang</span>
                  </span>
                  <span className="bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-bold text-[10px]">
                    -{totalSelisihQty} pcs
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center gap-2">
                <Button
                  variant="secondary"
                  leftIcon={<IconPrinter className="h-4 w-4 sm:mr-1" />}
                  onClick={() =>
                    downloadOrShareFile(
                      `/api/export/warehouse/surat-jalan/${selectedTransfer.id}`,
                      `Surat_Jalan_${selectedTransfer.id}.pdf`,
                      'Surat Jalan',
                    )
                  }
                  title="Cetak Surat Jalan (PDF)"
                  aria-label="Cetak Surat Jalan PDF"
                  className="px-3 sm:px-4 shrink-0"
                >
                  <span className="hidden md:inline">Cetak Surat Jalan (PDF)</span>
                  <span className="hidden sm:inline md:hidden">Cetak PDF</span>
                  <span className="inline sm:hidden text-xs">PDF</span>
                </Button>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedTransfer.status === 'DRAFT' && (
                    <Button
                      variant="primary"
                      leftIcon={<IconSend className="h-4 w-4 mr-1.5" />}
                      loading={isKirimLoading}
                      onClick={() => onKirim(selectedTransfer.id)}
                      title="Kirim Barang Sekarang"
                    >
                      <span className="hidden md:inline">Kirim Barang Sekarang</span>
                      <span className="inline md:hidden">Kirim Barang</span>
                    </Button>
                  )}

                  {selectedTransfer.status === 'IN_TRANSIT' && (() => {
                    const isUserDestinationStaff =
                      isAdmin() ||
                      (!!userGudangId && selectedTransfer.gudang_tujuan_id === userGudangId);

                    return (
                      <>
                        {itemsWithSelisih.length > 0 && (
                          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <IconAlertTriangle size={13} />
                            <span>Selisih -{totalSelisihQty} pcs ({itemsWithSelisih.length} jenis)</span>
                          </div>
                        )}
                        <Button
                          variant="primary"
                          leftIcon={<IconCheck className="h-4 w-4 mr-1.5" />}
                          loading={isTerimaLoading}
                          disabled={!isUserDestinationStaff || isTerimaLoading}
                          onClick={onConfirmTerima}
                          title={
                            !isUserDestinationStaff
                              ? 'Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik'
                              : 'Konfirmasi Penerimaan Fisik'
                          }
                        >
                          <span className="hidden md:inline">Konfirmasi Penerimaan Fisik</span>
                          <span className="inline md:hidden">Konfirmasi</span>
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </ResponsivePanel>
  );
}
