import React from 'react';
import { IconX, IconCamera } from '@tabler/icons-react';
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
  removeItem: (index: number) => void;
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
      <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-20">
        <div className="w-28 h-28 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
          <IconCamera className="w-14 h-14 text-neutral-400" stroke={1.5} />
        </div>
        <p className="text-lg font-bold text-neutral-600 dark:text-neutral-300">Scan barcode untuk menambah barang</p>
        <p className="text-sm text-neutral-500 mt-2">Atau tekan F2 untuk edit Qty baris pertama</p>
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
            <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Qty Cetak</th>
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
                  <div className="w-24 ml-auto">
                    <PriceInput
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={handleEditSubmit}
                      className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
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
                    className="px-3 py-1.5 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-20 block ml-auto transition-colors font-medium"
                  >
                    {item.qty}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 text-lg btn-press p-2 rounded-xl transition-colors"
                >
                  <IconX size={18} />
                </button>
              </td>
            </tr>
          )})}
        </tbody>
      </table>

      {/* Mobile Cards Layout */}
      <div className="block lg:hidden space-y-3 p-4">
        {items.map((item, index) => {
          const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
          return (
          <div key={`${item.id}-${index}-mobile`} className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative transition-all">
            <button
              onClick={() => removeItem(index)}
              className="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition-colors btn-press"
            >
              <IconX size={18} />
            </button>
            <div className="pr-10 mb-3">
              <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight mb-1">{item.nama_barang}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.kode_barcode || item.barcode}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Rp {finalPrice.toLocaleString('id-ID')}</div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Qty Cetak</label>
              {selectedIndex === index && editMode === 'qty' ? (
                <PriceInput
                  value={editValue}
                  onChange={setEditValue}
                  onBlur={handleEditSubmit}
                  className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
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
          </div>
        )})}
      </div>
    </div>
  );
}
