import React from 'react';
import { IconX, IconCamera } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { PriceInput } from '@/components/ui/PriceInput';

interface ItemCartProps {
  items: import('@/lib/store').CartItem[];
  selectedIndex: number | null;
  editMode: 'qty' | 'harga' | 'harga_jual' | null;
  editValue: number;
  setSelectedIndex: (index: number | null) => void;
  setEditMode: (mode: 'qty' | 'harga' | 'harga_jual' | null) => void;
  setEditValue: (val: number) => void;
  handleEditSubmit: () => void;
  handleEditKeyDown: (e: React.KeyboardEvent<HTMLDivElement>, index: number) => void;
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
          Gunakan fitur pencarian atau scan barcode untuk mulai menambahkan barang masuk.
        </p>
        <p className="mt-6 hidden rounded-xl border border-neutral-200/50 bg-neutral-100/80 px-4 py-2.5 text-xs text-neutral-400 sm:text-sm lg:block dark:border-neutral-800/50 dark:bg-neutral-900/80">
          <span className="font-semibold text-neutral-500 dark:text-neutral-300">Shortcut:</span>{' '}
          Tekan F2 (Edit Qty), F3 (Edit Harga), F4 (Edit Harga Jual). Gunakan Enter atau Panah
          Atas/Bawah untuk pindah baris saat edit.
        </p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-x-auto overflow-y-auto">
      <table className="hidden w-full min-w-[900px] lg:table">
        <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/90 backdrop-blur-xl dark:border-neutral-800/50 dark:bg-neutral-950/90">
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
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Qty
            </th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Harga Beli
            </th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Harga Jual
            </th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Subtotal
            </th>
            <th className="w-16 px-4 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {(Array.isArray(items) ? items : []).map((item, index) => (
            <tr
              key={`${item.id}-${index}`}
              className={`transition-colors ${selectedIndex === index ? 'bg-brand-50/50 dark:bg-brand-900/30' : 'hover:bg-white/50 dark:hover:bg-neutral-800/50'}`}
            >
              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-mono text-sm text-neutral-900 dark:text-neutral-100">
                {item.barcode}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {item.nama_barang}
              </td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'qty' ? (
                  <div
                    className="ml-auto w-24"
                    onKeyDownCapture={(e) => {
                      if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
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
                  <div className="ml-auto w-24">
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('qty');
                        setEditValue(item.qty);
                      }}
                      className="w-full rounded-lg border border-transparent px-3 py-1.5 text-right font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {item.qty}
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'harga' ? (
                  <div
                    className="ml-auto w-32"
                    onKeyDownCapture={(e) => {
                      if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                        handleEditKeyDown(e, index);
                      }
                    }}
                  >
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="!rounded-lg border border-neutral-300 bg-white !px-3 !py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      min={0}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="ml-auto w-32">
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('harga');
                        setEditValue(item.harga_beli || 0);
                      }}
                      className="w-full rounded-lg border border-transparent px-3 py-1.5 text-right font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {formatCurrency(item.harga_beli || 0)}
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'harga_jual' ? (
                  <div
                    className="ml-auto w-32"
                    onKeyDownCapture={(e) => {
                      if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                        handleEditKeyDown(e, index);
                      }
                    }}
                  >
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="!rounded-lg border border-neutral-300 bg-white !px-3 !py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                      min={0}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="ml-auto w-32">
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('harga_jual');
                        setEditValue(item.harga_jual || 0);
                      }}
                      className="w-full rounded-lg border border-transparent px-3 py-1.5 text-right font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      {formatCurrency(item.harga_jual || 0)}
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(item.subtotal)}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => removeItem(item.id)}
                  className="btn-press rounded-xl p-2 text-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                >
                  <IconX size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards Layout */}
      <div className="block space-y-3 p-0 sm:p-4 lg:hidden">
        {(Array.isArray(items) ? items : []).map((item, index) => (
          <div
            key={`${item.id}-${index}-mobile`}
            className="relative rounded-2xl border border-neutral-200/50 bg-white/50 p-2.5 shadow-sm backdrop-blur-md transition-all sm:p-4 dark:border-neutral-800/50 dark:bg-neutral-950/50"
          >
            <button
              onClick={() => removeItem(item.id)}
              className="btn-press absolute top-3 right-3 rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
            >
              <IconX size={18} />
            </button>
            <div className="mb-3 pr-10">
              <div className="mb-1 text-base leading-tight font-bold text-neutral-900 dark:text-white">
                {item.nama_barang}
              </div>
              <div className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {item.barcode}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-[80px_1fr_1fr] gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Qty
                </label>
                {selectedIndex === index && editMode === 'qty' ? (
                  <div
                    onKeyDownCapture={(e) => {
                      if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                        handleEditKeyDown(e, index);
                      }
                    }}
                  >
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="w-full !rounded-xl border border-neutral-300 bg-white !px-3 !py-2.5 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
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
                    className="w-full rounded-xl border border-neutral-200/50 bg-white/70 px-3 py-2.5 text-left font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700/50 dark:bg-neutral-900/70 dark:text-white dark:hover:bg-neutral-800"
                  >
                    {item.qty}
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Harga Beli
                </label>
                {selectedIndex === index && editMode === 'harga' ? (
                  <div
                    onKeyDownCapture={(e) => {
                      if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                        handleEditKeyDown(e, index);
                      }
                    }}
                  >
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="w-full !rounded-xl border border-neutral-300 bg-white !px-3 !py-2.5 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                      min={0}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIndex(index);
                      setEditMode('harga');
                      setEditValue(item.harga_beli || 0);
                    }}
                    className="w-full rounded-xl border border-neutral-200/50 bg-white/70 px-3 py-2.5 text-left font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700/50 dark:bg-neutral-900/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {formatCurrency(item.harga_beli || 0)}
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Harga Jual
                </label>
                {selectedIndex === index && editMode === 'harga_jual' ? (
                  <div
                    onKeyDownCapture={(e) => {
                      if (['Enter', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                        handleEditKeyDown(e, index);
                      }
                    }}
                  >
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="w-full !rounded-xl border border-neutral-300 bg-white !px-3 !py-2.5 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                      min={0}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIndex(index);
                      setEditMode('harga_jual');
                      setEditValue(item.harga_jual || 0);
                    }}
                    className="w-full rounded-xl border border-neutral-200/50 bg-white/70 px-3 py-2.5 text-left font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-700/50 dark:bg-neutral-900/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {formatCurrency(item.harga_jual || 0)}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end justify-end border-t border-neutral-100 pt-3 dark:border-neutral-800/50">
              <div className="text-right">
                <div className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Subtotal
                </div>
                <div className="text-brand-600 dark:text-brand-400 text-lg leading-none font-black">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
