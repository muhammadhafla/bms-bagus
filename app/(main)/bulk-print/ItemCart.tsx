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
      <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-12 px-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-50/50 dark:bg-neutral-900/50 backdrop-blur-md border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-[2rem] flex items-center justify-center mb-5 sm:mb-6 shadow-sm">
          <IconCamera className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400" stroke={1.5} />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-neutral-700 dark:text-neutral-200 text-center mb-2">Belum ada barang</h3>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 text-center max-w-xs sm:max-w-sm leading-relaxed">
          Gunakan fitur pencarian atau scan barcode untuk menambahkan barang ke daftar cetak massal.
        </p>
        <p className="text-xs sm:text-sm text-neutral-400 mt-6 hidden lg:block bg-neutral-100/80 dark:bg-neutral-900/80 px-4 py-2.5 rounded-xl border border-neutral-200/50 dark:border-neutral-800/50">
          <span className="font-semibold text-neutral-500 dark:text-neutral-300">Shortcut:</span> Tekan F2 untuk mengedit baris pertama. Gunakan Enter atau Panah Atas/Bawah untuk pindah baris.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto h-full custom-scrollbar">
      <table className="w-full min-w-[700px] hidden lg:table">
        <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
          <tr>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-12">#</th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Barcode</th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
            <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga (Stlh Diskon)</th>
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-32">Qty Cetak</th>
            <th className="px-4 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">Aksi</th>
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
              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{index + 1}</td>
              <td className="px-4 py-3 text-sm font-mono text-neutral-900 dark:text-neutral-100">{item.kode_barcode || item.barcode}</td>
              <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
              <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">Rp {finalPrice.toLocaleString('id-ID')}</td>
              <td className="px-4 py-3 text-right">
                {selectedIndex === index && editMode === 'qty' ? (
                  <div 
                    className="w-24 ml-auto"
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
                      className="!px-3 !py-1.5 !rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
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
                    className="px-3 py-1.5 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-24 block ml-auto transition-colors font-medium"
                  >
                    {item.qty}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 text-lg btn-press p-2.5 rounded-xl transition-colors"
                >
                  <IconTrash size={18} />
                </button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      {/* Mobile Cards Layout */}
      <div className="block lg:hidden space-y-3 p-0 sm:p-4">
        {items.map((item, index) => {
          const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
          return (
          <div key={`${item.id}-${index}-mobile`} className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative transition-all">
            <button
              onClick={() => removeItem(item.id)}
              className="absolute top-3 right-3 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-2.5 rounded-xl transition-colors btn-press"
            >
              <IconTrash size={18} />
            </button>
            <div className="pr-14 mb-4">
              <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight mb-1.5">{item.nama_barang}</div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded shadow-sm border border-neutral-200/50 dark:border-neutral-700/50">{item.kode_barcode || item.barcode}</div>
                <div className="text-sm font-bold text-brand-600 dark:text-brand-400">Rp {finalPrice.toLocaleString('id-ID')}</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/50 pt-3.5">
              <label className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Qty Cetak</label>
              
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 border border-neutral-200/50 dark:border-neutral-700/50">
                <button 
                  onClick={() => {
                    const newQty = Math.max(1, item.qty - 1);
                    updateQty(item.id, newQty);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg shadow-sm active:scale-95 transition-all border border-neutral-200/50 dark:border-neutral-700/50"
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
                      className="h-10 flex items-center"
                    >
                      <PriceInput
                        value={editValue}
                        onChange={setEditValue}
                        onBlur={handleEditSubmit}
                        className="w-full !px-1 !py-0 !rounded-none border-none bg-transparent text-center font-bold text-neutral-900 dark:text-white shadow-none focus:ring-0"
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
                      className="w-full h-10 flex items-center justify-center font-bold text-lg"
                    >
                      {item.qty}
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => updateQty(item.id, item.qty + 1)}
                  className="w-10 h-10 flex items-center justify-center text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 rounded-lg shadow-sm active:scale-95 transition-all border border-neutral-200/50 dark:border-neutral-700/50"
                >
                  <IconPlus size={18} stroke={2.5} />
                </button>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
