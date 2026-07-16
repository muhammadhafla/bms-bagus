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
  removeItem,
}: ItemCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-12 px-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-md border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[2rem] flex items-center justify-center mb-5 sm:mb-6 shadow-sm">
          <IconCamera className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400" stroke={1.5} />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-neutral-700 dark:text-neutral-200 text-center mb-2">Belum ada barang</h3>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 text-center max-w-xs sm:max-w-sm leading-relaxed">
          Gunakan fitur pencarian atau scan barcode untuk mulai menambahkan barang masuk.
        </p>
        <p className="text-xs sm:text-sm text-neutral-400 mt-6 hidden lg:block bg-neutral-100/80 dark:bg-neutral-900/80 px-4 py-2.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50">
          <span className="font-semibold text-neutral-500 dark:text-neutral-300">Shortcut:</span> Tekan F2 (Edit Qty), F3 (Edit Harga), F4 (Edit Harga Jual)
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto h-full custom-scrollbar">
      <table className="w-full min-w-[900px] hidden lg:table">
        <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
          <tr>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-12">#</th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Barcode</th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Qty</th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Beli</th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Jual</th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Subtotal</th>
            <th className="px-4 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
          {(Array.isArray(items) ? items : []).map((item, index) => (
            <tr
              key={`${item.id}-${index}`}
              className={`transition-colors ${selectedIndex === index ? 'bg-brand-50/50 dark:bg-brand-900/30' : 'hover:bg-white/50 dark:hover:bg-neutral-800/50'}`}
            >
              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{index + 1}</td>
              <td className="px-4 py-3 text-sm font-mono text-neutral-900 dark:text-neutral-100">{item.barcode}</td>
              <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'qty' ? (
                  <div className="w-24 ml-auto">
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="!px-3 !py-1.5 !rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                      min={1}
                      autoFocus
                      prefix=""
                    />
                  </div>
                ) : (
                  <div className="w-24 ml-auto">
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('qty');
                        setEditValue(item.qty);
                      }}
                      className="px-3 py-1.5 w-full text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent rounded-lg transition-colors font-medium"
                    >
                      {item.qty}
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'harga' ? (
                  <div className="w-32 ml-auto">
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="!px-3 !py-1.5 !rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                      min={0}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="w-32 ml-auto">
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('harga');
                        setEditValue(item.harga_beli || 0);
                      }}
                      className="px-3 py-1.5 w-full text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent rounded-lg transition-colors font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      {formatCurrency(item.harga_beli || 0)}
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'harga_jual' ? (
                  <div className="w-32 ml-auto">
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="!px-3 !py-1.5 !rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                      min={0}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="w-32 ml-auto">
                    <button
                      onClick={() => {
                        setSelectedIndex(index);
                        setEditMode('harga_jual');
                        setEditValue(item.harga_jual || 0);
                      }}
                      className="px-3 py-1.5 w-full text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent rounded-lg transition-colors font-medium text-neutral-700 dark:text-neutral-300"
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
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 text-lg btn-press p-2 rounded-xl transition-colors"
                >
                  <IconX size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards Layout */}
      <div className="block lg:hidden space-y-3 p-0 sm:p-4">
        {(Array.isArray(items) ? items : []).map((item, index) => (
          <div key={`${item.id}-${index}-mobile`} className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative transition-all">
            <button
              onClick={() => removeItem(item.id)}
              className="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition-colors btn-press"
            >
              <IconX size={18} />
            </button>
            <div className="pr-10 mb-3">
              <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight mb-1">{item.nama_barang}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.barcode}</div>
            </div>

            <div className="grid grid-cols-[80px_1fr_1fr] gap-3 mb-3">
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Qty</label>
                {selectedIndex === index && editMode === 'qty' ? (
                  <PriceInput
                    value={editValue}
                    onChange={setEditValue}
                    onBlur={handleEditSubmit}
                    className="w-full !px-3 !py-2.5 !rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    min={1}
                    autoFocus
                    prefix=""
                  />
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIndex(index);
                      setEditMode('qty');
                      setEditValue(item.qty);
                    }}
                    className="w-full px-3 py-2.5 text-left bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl font-medium text-neutral-900 dark:text-white shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {item.qty}
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Harga Beli</label>
                {selectedIndex === index && editMode === 'harga' ? (
                  <PriceInput
                    value={editValue}
                    onChange={setEditValue}
                    onBlur={handleEditSubmit}
                    className="w-full !px-3 !py-2.5 !rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    min={0}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIndex(index);
                      setEditMode('harga');
                      setEditValue(item.harga_beli || 0);
                    }}
                    className="w-full px-3 py-2.5 text-left bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl font-medium text-neutral-700 dark:text-neutral-300 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {formatCurrency(item.harga_beli || 0)}
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Harga Jual</label>
                {selectedIndex === index && editMode === 'harga_jual' ? (
                  <PriceInput
                    value={editValue}
                    onChange={setEditValue}
                    onBlur={handleEditSubmit}
                    className="w-full !px-3 !py-2.5 !rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    min={0}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIndex(index);
                      setEditMode('harga_jual');
                      setEditValue(item.harga_jual || 0);
                    }}
                    className="w-full px-3 py-2.5 text-left bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl font-medium text-neutral-700 dark:text-neutral-300 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {formatCurrency(item.harga_jual || 0)}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end items-end pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
              <div className="text-right">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-0.5">Subtotal</div>
                <div className="font-black text-brand-600 dark:text-brand-400 text-lg leading-none">{formatCurrency(item.subtotal)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
