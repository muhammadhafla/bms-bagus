'use client';

import React from 'react';
import { IconX, IconTruckDelivery, IconAlertTriangle } from '@tabler/icons-react';
import { TransferCartItem } from '@/lib/store/useTransferStore';
import { Badge } from '@/components/ui';

interface TransferItemCartProps {
  items: TransferCartItem[];
  selectedIndex: number | null;
  editMode: 'qty' | 'catatan' | null;
  editValue: number | string;
  setSelectedIndex: (index: number | null) => void;
  setEditMode: (mode: 'qty' | 'catatan' | null) => void;
  setEditValue: (val: any) => void;
  handleEditSubmit: () => void;
  handleEditKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, index: number) => void;
  removeItem: (inventory_id: string) => void;
  updateQty: (inventory_id: string, qty: number) => void;
  updateCatatan: (inventory_id: string, catatan: string) => void;
  highlightedItemId?: string | null;
}

export const TransferItemCart = React.memo(function TransferItemCart({
  items,
  selectedIndex,
  editMode,
  editValue,
  setSelectedIndex,
  setEditMode,
  setEditValue,
  handleEditSubmit,
  handleEditKeyDown,
  removeItem,
  updateQty,
  updateCatatan,
  highlightedItemId,
}: TransferItemCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-neutral-400">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border-2 border-dashed border-neutral-200 bg-neutral-50/50 shadow-sm backdrop-blur-md sm:mb-6 sm:h-28 sm:w-28 dark:border-neutral-800 dark:bg-neutral-900/50">
          <IconTruckDelivery className="h-10 w-10 text-neutral-400 sm:h-12 sm:w-12" stroke={1.5} />
        </div>
        <h3 className="mb-2 text-center text-lg font-bold text-neutral-700 sm:text-xl dark:text-neutral-200">
          Belum Ada Barang yang Akan Dikirim
        </h3>
        <p className="max-w-xs text-center text-sm leading-relaxed text-neutral-500 sm:max-w-sm sm:text-base dark:text-neutral-400">
          Gunakan kolom pencarian di atas atau scan barcode untuk menambahkan barang ke surat jalan transfer.
        </p>
        <p className="mt-6 hidden rounded-xl border border-neutral-200/50 bg-neutral-100/80 px-4 py-2.5 text-xs text-neutral-400 sm:text-sm lg:block dark:border-neutral-800/50 dark:bg-neutral-900/80">
          <span className="font-semibold text-neutral-500 dark:text-neutral-300">Shortcut:</span>{' '}
          Tekan <kbd className="font-bold">F2</kbd> untuk Edit Qty, <kbd className="font-bold">F6</kbd> untuk Reset, <kbd className="font-bold">F9</kbd> untuk Simpan & Langsung Kirim.
        </p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-x-auto overflow-y-auto">
      {/* Desktop Table View */}
      <table className="hidden w-full min-w-[850px] lg:table">
        <thead className="sticky top-0 z-10 border-b border-neutral-200/60 bg-white/95 backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-950/95">
          <tr>
            <th className="w-12 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              #
            </th>
            <th className="w-36 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Barcode
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Nama Barang
            </th>
            <th className="w-28 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Lokasi Rak
            </th>
            <th className="w-32 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Stok Asal
            </th>
            <th className="w-36 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Qty Kirim
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Catatan Item
            </th>
            <th className="w-16 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-sm">
          {items.map((item, index) => {
            const isSelected = selectedIndex === index;
            const isHighlighted = highlightedItemId === item.inventory_id;
            const isExceeded = item.qty_kirim > item.stok_tersedia;

            return (
              <tr
                key={item.inventory_id}
                className={`transition-colors ${
                  isHighlighted
                    ? 'bg-amber-50/70 dark:bg-amber-950/30'
                    : isSelected
                    ? 'bg-brand-50/50 dark:bg-brand-900/20'
                    : 'hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40'
                }`}
              >
                {/* # */}
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 font-mono text-xs">
                  {index + 1}
                </td>

                {/* Barcode */}
                <td className="px-4 py-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                  {item.kode_barcode || '-'}
                </td>

                {/* Nama Barang */}
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  <div className="flex items-center gap-2">
                    <span>{item.nama_barang}</span>
                    {isExceeded && (
                      <span className="flex items-center text-xs text-rose-500 font-normal">
                        <IconAlertTriangle className="h-4 w-4 mr-0.5" /> Stok asal kurang
                      </span>
                    )}
                  </div>
                </td>

                {/* Lokasi Rak */}
                <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {item.rak_lokasi ? (
                    <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 font-mono">
                      {item.rak_lokasi}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>

                {/* Stok Asal */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={`font-semibold ${
                      item.stok_tersedia <= 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {item.stok_tersedia} {item.unit}
                  </span>
                </td>

                {/* Qty Kirim (Editable) */}
                <td className="px-4 py-3 text-center">
                  {isSelected && editMode === 'qty' ? (
                    <div
                      className="mx-auto w-24"
                      onKeyDownCapture={(e) => {
                        if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                          handleEditKeyDown(e, index);
                        }
                      }}
                    >
                      <input
                        type="number"
                        min={1}
                        max={item.stok_tersedia}
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value) || 1)}
                        onBlur={handleEditSubmit}
                        className="w-full rounded-lg border border-brand-500 bg-white px-2.5 py-1 text-center font-bold text-neutral-900 shadow-sm outline-none dark:border-brand-400 dark:bg-neutral-900 dark:text-white"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('qty');
                        setEditValue(item.qty_kirim);
                      }}
                      className="inline-flex items-center justify-center min-w-[4.5rem] rounded-lg border border-transparent bg-neutral-100/80 px-3 py-1 font-bold text-neutral-900 transition-colors hover:border-neutral-300 hover:bg-white dark:bg-neutral-800 dark:text-white dark:hover:border-neutral-700"
                    >
                      {item.qty_kirim} {item.unit}
                    </button>
                  )}
                </td>

                {/* Catatan Item (Editable) */}
                <td className="px-4 py-3">
                  {isSelected && editMode === 'catatan' ? (
                    <div
                      onKeyDownCapture={(e) => {
                        if (['Enter', 'Tab'].includes(e.key)) {
                          handleEditKeyDown(e, index);
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditSubmit}
                        placeholder="Catatan kondisi / kardus..."
                        className="w-full rounded-lg border border-brand-500 bg-white px-2.5 py-1 text-xs text-neutral-900 shadow-sm outline-none dark:border-brand-400 dark:bg-neutral-900 dark:text-white"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('catatan');
                        setEditValue(item.catatan || '');
                      }}
                      className="w-full text-left rounded-lg border border-transparent px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 truncate"
                    >
                      {item.catatan || <span className="text-neutral-400 italic">Tambah catatan...</span>}
                    </button>
                  )}
                </td>

                {/* Aksi */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => removeItem(item.inventory_id)}
                    className="rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                    title="Hapus dari daftar kirim"
                  >
                    <IconX size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Card Layout */}
      <div className="block space-y-3 p-3 sm:p-4 lg:hidden">
        {items.map((item, index) => {
          const isHighlighted = highlightedItemId === item.inventory_id;
          const isExceeded = item.qty_kirim > item.stok_tersedia;

          return (
            <div
              key={item.inventory_id}
              className={`relative rounded-2xl border p-3.5 shadow-sm transition-all ${
                isHighlighted
                  ? 'border-amber-400 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                  : 'border-neutral-200/60 bg-white/70 backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-900/70'
              }`}
            >
              <button
                onClick={() => removeItem(item.inventory_id)}
                className="absolute top-3 right-3 rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
              >
                <IconX size={18} />
              </button>

              <div className="mb-2 pr-8">
                <h4 className="font-bold text-neutral-900 dark:text-white text-sm leading-snug">
                  {item.nama_barang}
                </h4>
                <p className="mt-0.5 font-mono text-xs text-neutral-500">
                  {item.kode_barcode || 'Tanpa barcode'}
                  {item.rak_lokasi ? ` • Rak: ${item.rak_lokasi}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="block text-[11px] font-medium text-neutral-500">Stok Asal:</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {item.stok_tersedia} {item.unit}
                  </span>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-neutral-500">Qty Kirim:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min={1}
                      max={item.stok_tersedia}
                      value={item.qty_kirim}
                      onChange={(e) => updateQty(item.inventory_id, parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-center text-xs font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    />
                    <span className="text-xs text-neutral-500">{item.unit}</span>
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={item.catatan || ''}
                  onChange={(e) => updateCatatan(item.inventory_id, e.target.value)}
                  placeholder="Catatan per-item..."
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1 text-xs text-neutral-800 placeholder-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-200"
                />
              </div>

              {isExceeded && (
                <div className="mt-2 flex items-center text-xs text-rose-500">
                  <IconAlertTriangle className="h-4 w-4 mr-1" />
                  Qty melebihi stok yang tersedia di gudang asal!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
