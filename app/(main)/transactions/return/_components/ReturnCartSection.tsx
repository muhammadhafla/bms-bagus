'use client';

import React from 'react';
import {
  IconMinus,
  IconPlus,
  IconTrash,
  IconBarcode,
  IconChevronDown,
  IconChevronUp,
  IconShoppingCart,
  IconRefresh,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button, Badge } from '@/components/ui';
import { SelectInput } from '@/components/ui/SelectInput';
import { AggregatedReturnItem, AlasanRetur, MetodeKompensasi } from '@/lib/api/return';
import { formatCurrency } from '@/lib/utils';
import { Supplier } from '@/lib/api/supplier';

const ALASAN_OPTIONS = [
  { value: 'rusak', label: 'Rusak / Cacat' },
  { value: 'expired', label: 'Expired' },
  { value: 'salah_kirim', label: 'Salah Kirim' },
  { value: 'konsinyasi', label: 'Tidak Laku' },
  { value: 'lainnya', label: 'Lainnya' },
];

interface ReturnCartSectionProps {
  loadingItems: boolean;
  selectedSupplier: Supplier | null;
  activeCartItems: AggregatedReturnItem[];
  totalReturnQty: number;
  totalReturnAmount: number;
  expandedRows: Record<string, boolean>;
  onToggleExpand: (inventoryId: string) => void;
  onAlasanChange: (inventoryId: string, alasan: AlasanRetur) => void;
  onQtyChange: (inventoryId: string, qty: number) => void;
  onRemoveItem: (inventoryId: string) => void;
  metodeKompensasi: MetodeKompensasi;
  onMetodeKompensasiChange: (metode: MetodeKompensasi) => void;
  note: string;
  onNoteChange: (note: string) => void;
  submitting: boolean;
  onOpenResetConfirm: () => void;
  onPrepareSubmit: () => void;
}

export function ReturnCartSection({
  loadingItems,
  selectedSupplier,
  activeCartItems,
  totalReturnQty,
  totalReturnAmount,
  expandedRows,
  onToggleExpand,
  onAlasanChange,
  onQtyChange,
  onRemoveItem,
  metodeKompensasi,
  onMetodeKompensasiChange,
  note,
  onNoteChange,
  submitting,
  onOpenResetConfirm,
  onPrepareSubmit,
}: ReturnCartSectionProps) {
  return (
    <>
      <div className="shadow-elevated animate-fade-in-up flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
        <div className="flex-1 overflow-auto p-4 lg:p-6 pb-48">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-800 lg:text-lg dark:text-white">
                Keranjang Retur
              </h2>
              <Badge variant={activeCartItems.length > 0 ? 'info' : 'default'}>
                {activeCartItems.length} Produk ({totalReturnQty} Pcs)
              </Badge>
            </div>

            {activeCartItems.length > 0 && (
              <button
                type="button"
                onClick={onOpenResetConfirm}
                className="flex items-center gap-1.5 text-xs font-semibold text-danger-600 transition hover:text-danger-700 dark:text-danger-400"
              >
                <IconTrash className="h-4 w-4" />
                Kosongkan
              </button>
            )}
          </div>

          {loadingItems ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"></div>
              <p className="mt-3 text-xs font-medium text-neutral-500">
                Memuat stok & riwayat pembelian...
              </p>
            </div>
          ) : !selectedSupplier && activeCartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-16 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
              <IconBarcode className="mx-auto mb-3 h-12 w-12 text-neutral-400 dark:text-neutral-600" />
              <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                Belum Ada Barang di Keranjang
              </p>
              <p className="mt-1 text-xs text-neutral-500 lg:text-sm">
                Scan barcode barang rusak di atas untuk auto-detect supplier, atau pilih supplier tujuan terlebih dahulu.
              </p>
            </div>
          ) : activeCartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-16 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
              <IconShoppingCart className="mx-auto mb-3 h-12 w-12 text-neutral-400 dark:text-neutral-600" />
              <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                Keranjang Kosong
              </p>
              <p className="mt-1 text-xs text-neutral-500 lg:text-sm">
                Ketik nama barang atau scan barcode untuk menambahkan barang milik {selectedSupplier?.nama}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* DESKTOP TABLE */}
              <div className="hidden rounded-2xl border border-neutral-200/70 bg-white/40 lg:block dark:border-neutral-800/70 dark:bg-neutral-950/40">
                <table className="w-full text-left">
                  <thead className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-400">
                    <tr>
                      <th className="px-5 py-3.5">Produk & Barcode</th>
                      <th className="px-4 py-3.5 text-center">Stok Fisik / Sisa Beli</th>
                      <th className="px-4 py-3.5 text-right">Harga Satuan</th>
                      <th className="w-52 px-4 py-3.5">Alasan Retur</th>
                      <th className="w-28 px-3 py-3.5 text-center">Qty Retur</th>
                      <th className="px-5 py-3.5 text-right">Subtotal</th>
                      <th className="w-16 px-4 py-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {activeCartItems.map((item) => {
                      const isExpanded = !!expandedRows[item.inventory_id];
                      const itemSubtotal = item.batches.reduce((sub, b) => {
                        const netPrice = b.harga_beli - (b.diskon || 0);
                        return sub + b.allocated_qty * netPrice;
                      }, 0);

                      return (
                        <React.Fragment key={item.inventory_id}>
                          <tr className="group transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40">
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                {item.nama_barang}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                {item.barcode && (
                                  <span className="font-mono text-[11px] text-neutral-500">
                                    {item.barcode}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onToggleExpand(item.inventory_id)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                >
                                  <span>
                                    {item.batches.filter((b) => b.allocated_qty > 0).length} Nota Terkait
                                  </span>
                                  {isExpanded ? (
                                    <IconChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <IconChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                  {item.stok_fisik} pcs
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  (Faktur: {item.total_qty_remaining})
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                              {formatCurrency(item.harga_beli_satuan)}
                            </td>

                            <td className="px-4 py-3">
                              <div className="w-48">
                                <SelectInput
                                  value={item.alasan}
                                  onChange={(val) =>
                                    onAlasanChange(item.inventory_id, val as AlasanRetur)
                                  }
                                  options={ALASAN_OPTIONS}
                                  inputSize="sm"
                                  required
                                />
                              </div>
                            </td>

                            <td className="px-3 py-4">
                              <div className="flex justify-center">
                                <div className="inline-flex h-8 items-center rounded-lg border border-neutral-200 bg-white p-0.5 shadow-sm transition-colors hover:border-brand-400 focus-within:border-brand-500 dark:border-neutral-700 dark:bg-neutral-900">
                                  <button
                                    type="button"
                                    onClick={() => onQtyChange(item.inventory_id, item.return_qty - 1)}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-600 active:scale-95 dark:hover:bg-neutral-800"
                                    aria-label="Kurangi Qty"
                                  >
                                    <IconMinus className="h-3 w-3" stroke={2.5} />
                                  </button>
                                  <PriceInput
                                    value={item.return_qty}
                                    onChange={(val) => onQtyChange(item.inventory_id, val)}
                                    className="w-8 border-none bg-transparent p-0 text-center text-xs font-bold text-neutral-900 focus:ring-0 dark:text-neutral-100"
                                    min={0}
                                    max={item.max_retur_allowed}
                                    prefix=""
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onQtyChange(item.inventory_id, item.return_qty + 1)}
                                    disabled={item.return_qty >= item.max_retur_allowed}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-600 active:scale-95 disabled:opacity-25 dark:hover:bg-neutral-800"
                                    aria-label="Tambah Qty"
                                  >
                                    <IconPlus className="h-3 w-3" stroke={2.5} />
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-bold text-brand-600 dark:text-brand-400">
                              {formatCurrency(itemSubtotal)}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.inventory_id)}
                                className="rounded-lg p-2 text-neutral-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-950/40"
                                title="Hapus barang"
                                aria-label={`Hapus ${item.nama_barang}`}
                              >
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-brand-50/30 dark:bg-brand-950/20">
                              <td
                                colSpan={7}
                                className="px-6 py-3 border-y border-neutral-100 dark:border-neutral-800/50"
                              >
                                <div className="text-xs">
                                  <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                                    Rincian Pemotongan Nota (Auto-FIFO):
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {item.batches.map((b) => (
                                      <div
                                        key={b.pembelian_item_id}
                                        className={`rounded-lg border p-2.5 text-xs ${
                                          b.allocated_qty > 0
                                            ? 'border-brand-300 bg-white font-medium text-neutral-900 shadow-sm dark:border-brand-800 dark:bg-neutral-900 dark:text-neutral-100'
                                            : 'border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/40'
                                        }`}
                                      >
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="font-mono text-[11px] font-bold">
                                            {b.nomor_nota || b.pembelian_id.slice(0, 8)}
                                          </span>
                                          <span className="text-[10px] text-neutral-500">
                                            {b.tanggal_pembelian}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px]">
                                          <span>
                                            Alokasi:{' '}
                                            <strong className="text-brand-600 dark:text-brand-400">
                                              {b.allocated_qty}
                                            </strong>{' '}
                                            / {b.qty_remaining} pcs
                                          </span>
                                          <span>{formatCurrency(b.harga_beli - b.diskon)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="space-y-3 lg:hidden">
                {activeCartItems.map((item) => {
                  const itemSubtotal = item.batches.reduce((sub, b) => {
                    const netPrice = b.harga_beli - (b.diskon || 0);
                    return sub + b.allocated_qty * netPrice;
                  }, 0);

                  return (
                    <div
                      key={item.inventory_id}
                      className="rounded-2xl border border-neutral-200 bg-white/90 p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            {item.nama_barang}
                          </h3>
                          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            <span>
                              Stok Fisik: <strong>{item.stok_fisik}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Faktur: <strong>{item.total_qty_remaining}</strong>
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.inventory_id)}
                          aria-label={`Hapus ${item.nama_barang}`}
                          className="p-1 text-neutral-400 hover:text-danger-500"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-500">Alasan</label>
                          <div className="mt-0.5">
                            <SelectInput
                              value={item.alasan}
                              onChange={(val) =>
                                onAlasanChange(item.inventory_id, val as AlasanRetur)
                              }
                              options={ALASAN_OPTIONS}
                              inputSize="sm"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-neutral-500">
                            Qty Retur
                          </label>
                          <div className="mt-0.5 inline-flex h-9 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-0.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                            <button
                              type="button"
                              onClick={() => onQtyChange(item.inventory_id, item.return_qty - 1)}
                              aria-label="Kurangi Qty"
                              className="flex h-7 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                            >
                              <IconMinus className="h-3 w-3" stroke={2.5} />
                            </button>
                            <PriceInput
                              value={item.return_qty}
                              onChange={(val) => onQtyChange(item.inventory_id, val)}
                              className="w-8 border-none bg-transparent p-0 text-center text-xs font-bold text-neutral-900 focus:ring-0 dark:text-neutral-100"
                              min={0}
                              max={item.max_retur_allowed}
                              prefix=""
                            />
                            <button
                              type="button"
                              onClick={() => onQtyChange(item.inventory_id, item.return_qty + 1)}
                              disabled={item.return_qty >= item.max_retur_allowed}
                              aria-label="Tambah Qty"
                              className="flex h-7 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-25"
                            >
                              <IconPlus className="h-3 w-3" stroke={2.5} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
                        <span className="text-xs text-neutral-400">Subtotal:</span>
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                          {formatCurrency(itemSubtotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOTTOM SETTLEMENT & NOTE OPTIONS */}
              <div className="mt-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/30">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Metode Kompensasi Retur:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          { value: 'potong_hutang', label: 'Potong Hutang' },
                          { value: 'refund_kas', label: 'Refund Kas/Tunai' },
                          { value: 'tukar_barang', label: 'Tukar Barang Baru' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs transition ${
                            metodeKompensasi === opt.value
                              ? 'border-brand-500 bg-brand-50/70 font-bold text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                              : 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="kompensasi"
                            value={opt.value}
                            checked={metodeKompensasi === opt.value}
                            onChange={() => onMetodeKompensasiChange(opt.value)}
                            className="text-brand-500 focus:ring-brand-400"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Catatan Surat Jalan / Ekspedisi (Opsional):
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => onNoteChange(e.target.value)}
                      placeholder="Contoh: Dititipkan supir Bpk. Joko, box ke-2..."
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs transition focus:border-brand-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      {activeCartItems.length > 0 && (
        <div className="fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-0 z-40 px-3 lg:sticky lg:bottom-0 lg:px-0">
          <div className="mx-auto max-w-[1920px]">
            <div className="animate-fade-in-up rounded-2xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur-xl lg:rounded-t-3xl lg:rounded-b-none lg:p-4 dark:border-neutral-800 dark:bg-neutral-900/90">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 lg:text-xs">
                      Item Terpilih
                    </span>
                    <p className="text-sm font-extrabold text-neutral-900 lg:text-lg dark:text-white">
                      {activeCartItems.length} Produk ({totalReturnQty} pcs)
                    </p>
                  </div>
                  <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800"></div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 lg:text-xs">
                      Total Pengembalian
                    </span>
                    <p className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-base font-extrabold text-transparent lg:text-2xl dark:from-brand-400 dark:to-brand-200">
                      {formatCurrency(totalReturnAmount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={onOpenResetConfirm}
                    disabled={submitting}
                    className="rounded-xl px-4 py-2 text-xs font-bold lg:text-sm"
                  >
                    <IconRefresh className="h-4 w-4 lg:mr-1.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={onPrepareSubmit}
                    disabled={submitting || totalReturnAmount === 0}
                    className="shadow-brand-500/20 rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg lg:text-sm"
                  >
                    <IconDeviceFloppy className="h-4 w-4 lg:mr-1.5" />
                    <span>{submitting ? 'Menyimpan...' : 'Simpan Retur'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
