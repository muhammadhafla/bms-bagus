import React from 'react';
import { IconX, IconCamera, IconTrash, IconMinus, IconPlus } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { PrintItem } from '@/lib/store';

interface ItemCartProps {
  items: PrintItem[];
  selectedIndex: number | null;
  editMode: 'qty' | null;
  editValue: number;
  setSelectedIndex: (index: number | null) => void;
  setEditMode: (mode: 'qty' | null) => void;
  setEditValue: (val: number) => void;
  handleEditSubmit: () => void;
  handleEditKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, index: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}

export function ItemCart({
  items,
  selectedIndex,
  editMode,
  editValue,
  setSelectedIndex,
  setEditMode,
  setEditValue,
  handleEditSubmit,
  handleEditKeyDown,
  updateQty,
  removeItem,
}: ItemCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-neutral-400">
        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border-2 border-dashed border-neutral-200 bg-neutral-50/50 shadow-sm backdrop-blur-md sm:mb-6 sm:h-28 sm:w-28 dark:border-neutral-800 dark:bg-neutral-900/50">
          <IconCamera className="h-10 w-10 text-neutral-400 sm:h-12 sm:w-12" stroke={1.5} />
        </div>
        <h3 className="mb-2 text-center text-lg font-bold text-neutral-700 sm:text-xl dark:text-neutral-200">
          Belum ada barang
        </h3>
        <p className="max-w-xs text-center text-sm leading-relaxed text-neutral-500 sm:max-w-sm sm:text-base dark:text-neutral-400">
          Gunakan fitur pencarian atau scan barcode untuk menambahkan barang ke daftar cetak massal.
        </p>
        <p className="mt-6 hidden rounded-xl border border-neutral-200/50 bg-neutral-100/80 px-4 py-2.5 text-xs text-neutral-400 sm:text-sm lg:block dark:border-neutral-800/50 dark:bg-neutral-900/80">
          <span className="font-semibold text-neutral-500 dark:text-neutral-300">Shortcut:</span>{' '}
          Tekan F2 untuk mengedit baris pertama. Gunakan Enter atau Panah Atas/Bawah untuk pindah
          baris.
        </p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-x-auto overflow-y-auto">
      <table className="hidden w-full min-w-[700px] lg:table">
        <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
          <tr>
            <th className="w-12 px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              #
            </th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Barcode
            </th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Nama Barang
            </th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Harga (Stlh Diskon)
            </th>
            <th className="w-32 px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Qty Cetak
            </th>
            <th className="w-16 px-4 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {items.map((item, index) => {
            const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
            return (
              <tr
                key={`${item.id}-${index}`}
                className={`transition-colors ${selectedIndex === index ? 'bg-brand-50/50 dark:bg-brand-900/30' : 'hover:bg-white/50 dark:hover:bg-neutral-800/50'}`}
              >
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {index + 1}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-neutral-900 dark:text-neutral-100">
                  {item.kode_barcode || item.barcode}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {item.nama_barang}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  Rp {finalPrice.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-3 text-right">
                  {selectedIndex === index && editMode === 'qty' ? (
                    <div
                      className="ml-auto w-24"
                      onKeyDownCapture={(e) => {
                        if (['Enter', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                          handleEditKeyDown(e, index);
                        }
                      }}
                    >
                      <PriceInput
                        value={editValue}
                        onChange={setEditValue}
                        onBlur={handleEditSubmit}
                        className="!rounded-lg border border-neutral-300 bg-white !px-3 !py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                        min={1}
                        autoFocus
                        prefix=""
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('qty');
                        setEditValue(item.qty);
                      }}
                      className="ml-auto block w-24 rounded-lg px-3 py-1.5 text-right font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {item.qty}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="btn-press rounded-xl p-2.5 text-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                  >
                    <IconTrash size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Cards Layout */}
      <div className="block space-y-3 p-0 sm:p-4 lg:hidden">
        {items.map((item, index) => {
          const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
          return (
            <div
              key={`${item.id}-${index}-mobile`}
              className="relative rounded-2xl border border-neutral-200/50 bg-white/50 p-4 shadow-sm backdrop-blur-md transition-all sm:p-5 dark:border-neutral-800/50 dark:bg-neutral-950/50"
            >
              <button
                onClick={() => removeItem(item.id)}
                className="btn-press absolute top-3 right-3 rounded-xl bg-red-50 p-2.5 text-red-500 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
              >
                <IconTrash size={18} />
              </button>
              <div className="mb-4 pr-14">
                <div className="mb-1.5 text-base leading-tight font-bold text-neutral-900 dark:text-white">
                  {item.nama_barang}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded border border-neutral-200/50 bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-500 shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-400">
                    {item.kode_barcode || item.barcode}
                  </div>
                  <div className="text-brand-600 dark:text-brand-400 text-sm font-bold">
                    Rp {finalPrice.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-100 pt-3.5 dark:border-neutral-800/50">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Qty Cetak
                </label>

                <div className="flex items-center gap-1 rounded-xl border border-neutral-200/50 bg-neutral-100 p-1 dark:border-neutral-700/50 dark:bg-neutral-800">
                  <button
                    onClick={() => {
                      const newQty = Math.max(1, item.qty - 1);
                      updateQty(item.id, newQty);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200/50 bg-white text-neutral-600 shadow-sm transition-all active:scale-95 dark:border-neutral-700/50 dark:bg-neutral-900 dark:text-neutral-300"
                  >
                    <IconMinus size={18} stroke={2.5} />
                  </button>
                  <div className="w-14 text-center font-bold text-neutral-900 dark:text-white">
                    {selectedIndex === index && editMode === 'qty' ? (
                      <div
                        onKeyDownCapture={(e) => {
                          if (['Enter', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                            handleEditKeyDown(e, index);
                          }
                        }}
                        className="flex h-10 items-center"
                      >
                        <PriceInput
                          value={editValue}
                          onChange={setEditValue}
                          onBlur={handleEditSubmit}
                          className="w-full !rounded-none border-none bg-transparent !px-1 !py-0 text-center font-bold text-neutral-900 shadow-none focus:ring-0 dark:text-white"
                          min={1}
                          autoFocus
                          prefix=""
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedIndex(index);
                          setEditMode('qty');
                          setEditValue(item.qty);
                        }}
                        className="flex h-10 w-full items-center justify-center text-lg font-bold"
                      >
                        {item.qty}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200/50 bg-white text-neutral-600 shadow-sm transition-all active:scale-95 dark:border-neutral-700/50 dark:bg-neutral-900 dark:text-neutral-300"
                  >
                    <IconPlus size={18} stroke={2.5} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
