'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem } from '@/types/inventory';
import { inventoryApi } from '@/lib/api';
import { debounce } from '@/lib/utils';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { IconPackage, IconSearch } from '@tabler/icons-react';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import SelectInput from '@/components/ui/SelectInput';
import CheckboxInput from '@/components/ui/CheckboxInput';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedFetchRef = useRef<ReturnType<typeof debounce> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      let result;
      if (search) {
        result = await inventoryApi.search(search);
      } else {
        result = await inventoryApi.getAll();
      }

      if (signal?.aborted) return;
      
      if (result.error) {
        console.error('Error fetching inventory:', result.error);
      } else {
        let filtered = result.data || [];
        
        if (kategori) {
          filtered = filtered.filter((item: InventoryItem) => item.id_kategori?.nama === kategori);
        }
        
        if (lowStockOnly) {
          filtered = filtered.filter((item: InventoryItem) => item.minimum_stock != null && item.stok <= item.minimum_stock);
        }
        
        setItems(filtered);
        
        const uniqueKategoris = [...new Set(filtered.map((item: InventoryItem) => item.id_kategori?.nama).filter(Boolean))];
        setKategoriList(uniqueKategoris as string[]);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error fetching inventory:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [search, kategori, lowStockOnly]);

  useEffect(() => {
    if (debouncedFetchRef.current) {
      debouncedFetchRef.current.cancel();
    }
    
    debouncedFetchRef.current = debounce(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      fetchItems(abortControllerRef.current.signal);
    }, 300);

    debouncedFetchRef.current();

    return () => {
      if (debouncedFetchRef.current) {
        debouncedFetchRef.current.cancel();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchItems]);

  const handleUpdate = useCallback(async (id: string, data: Partial<InventoryItem>) => {
    const result = await inventoryApi.update(id, data);
    if (!result.error) {
      setItems(prev => 
        prev.map(item => item.id === id ? { ...item, ...data } : item)
      );
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const result = await inventoryApi.delete(id);
    if (!result.error) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, []);

  const lowStockCount = items.filter(item => item.minimum_stock != null && item.stok <= item.minimum_stock).length;

  const shortcuts: Shortcut[] = [
    {
      key: 'f',
      ctrl: true,
      handler: () => searchInputRef.current?.focus(),
      description: 'Fokus ke pencarian',
    },
    {
      key: '?',
      handler: () => setShowShortcutsHelp(prev => !prev),
      description: 'Tampilkan bantuan shortcut',
    },
    {
      key: 'Escape',
      handler: () => {
        setSearch('');
        setKategori('');
        setLowStockOnly(false);
      },
      description: 'Reset filter',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
            <ul className="space-y-2">
              {shortcuts.map((s, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">{s.description}</span>
                  <kbd className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-sm font-mono text-neutral-700 dark:text-neutral-300">
                    {s.ctrl ? 'Ctrl+' : ''}{s.key}
                  </kbd>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Tekan Esc untuk menutup</p>
          </div>
        </div>
      )}
      
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-md">
              <IconPackage className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Inventory</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Kelola semua barang</p>
            </div>
          </div>
          {lowStockCount > 0 && (
            <span className="bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-200 px-4 py-2 rounded-full text-sm font-semibold border border-red-100 dark:border-red-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              {lowStockCount} barang low stock
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search barcode atau nama barang... (Ctrl+F)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-neutral-800 transition-all"
            />
          </div>
          
          <SelectInput
            value={kategori}
            onChange={setKategori}
            options={kategoriList.map(k => ({ value: k, label: k }))}
            placeholder="Semua Kategori"
            className="min-w-[180px]"
          />
          
          <CheckboxInput
            checked={lowStockOnly}
            onChange={setLowStockOnly}
            label="Low Stock Only"
            labelClassName="px-5 py-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
          />
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="bg-neutral-50 dark:bg-neutral-950 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </div>
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-950">
                  <tr>
                    <th className="px-4 py-3 text-left"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-left"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-left"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-right"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-right"><div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-right"><div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-right"><div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                    <th className="px-4 py-3 text-center"><div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3 text-right"><div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3 text-center"><div className="h-6 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <InventoryTable items={items} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
