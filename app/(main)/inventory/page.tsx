'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryItem } from '@/types/inventory';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { debounce } from '@/lib/utils';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { IconPackage, IconSearch, IconFilter } from '@tabler/icons-react';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import SelectInput from '@/components/ui/SelectInput';
import CheckboxInput from '@/components/ui/CheckboxInput';
import { API_ERROR_MESSAGES, UI_MESSAGES, INVENTORY_MESSAGES } from '@/lib/constants';

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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedFetchRef = useRef<ReturnType<typeof debounce> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(async (
    currentSearch: string,
    currentKategori: string,
    currentLowStockOnly: boolean,
    signal?: AbortSignal
  ) => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (currentSearch) {
        result = await inventoryApi.search(currentSearch);
      } else {
        result = await inventoryApi.getAll();
      }

      if (signal?.aborted) return;
      
      if (result.error) {
        setError(result.error.message || API_ERROR_MESSAGES.FETCH_FAILED);
      } else {
        let filtered = result.data || [];
        
        if (currentKategori) {
          filtered = filtered.filter((item: InventoryItem) => item.id_kategori?.nama === currentKategori);
        }
        
        if (currentLowStockOnly) {
          filtered = filtered.filter((item: InventoryItem) => item.minimum_stock != null && item.stok <= item.minimum_stock);
        }
        
        setItems(filtered);
        
        const uniqueKategoris = [...new Set(filtered.map((item: InventoryItem) => item.id_kategori?.nama).filter(Boolean))];
        setKategoriList(uniqueKategoris as string[]);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setError(API_ERROR_MESSAGES.UNKNOWN_ERROR);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debouncedFetchRef.current) {
      debouncedFetchRef.current.cancel();
    }
    
    debouncedFetchRef.current = debounce(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      fetchItems(search, kategori, lowStockOnly, abortControllerRef.current.signal);
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
  }, [search, kategori, lowStockOnly, fetchItems]);

  useEffect(() => {
    const fetchKategoris = async () => {
      const result = await kategoriApi.getAll();
      if (!result.error && result.data) {
        setKategoriList(result.data.map(k => k.nama));
      }
    };
    fetchKategoris();
  }, []);

  const handleUpdate = useCallback(async (id: string, data: Partial<InventoryItem>) => {
    setItems(prev => 
      prev.map(item => item.id === id ? { ...item, ...data } : item)
    );
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-elevated max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
            <ul className="space-y-3">
              {shortcuts.map((s, i) => (
                <li key={i} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="text-neutral-600 dark:text-neutral-400">{s.description}</span>
                  <kbd className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm font-mono text-neutral-700 dark:text-neutral-300 font-medium">
                    {s.ctrl ? 'Ctrl+' : ''}{s.key}
                  </kbd>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">Tekan Esc untuk menutup</p>
          </div>
        </div>
      )}
      
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4 animate-fade-in-up">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-brand">
              <IconPackage className="w-6 h-6 text-white" stroke={1.5} />
            </div>
            <div>
              <h1 className="text-h2 font-bold tracking-tight">Inventory</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Kelola semua barang</p>
            </div>
          </div>
          {lowStockCount > 0 && (
            <span className="bg-accent-rose-50 dark:bg-accent-rose-950/40 text-accent-rose-600 dark:text-accent-rose-300 px-4 py-2 rounded-xl text-sm font-semibold border border-accent-rose-200 dark:border-accent-rose-800 flex items-center gap-2 animate-fade-in-up">
              <span className="w-2 h-2 bg-accent-rose-500 rounded-full animate-pulse"></span>
              {lowStockCount} barang low stock
            </span>
          )}
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
              <IconSearch size={20} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search barcode atau nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all"
            />
          </div>
          
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <SelectInput
              value={kategori}
              onChange={setKategori}
              options={kategoriList.map(k => ({ value: k, label: k }))}
              placeholder="Semua Kategori"
              className="min-w-[180px]"
            />
          </div>
          
          <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CheckboxInput
              checked={lowStockOnly}
              onChange={setLowStockOnly}
              label="Low Stock Only"
              labelClassName="px-5 py-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center gap-2"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-card">
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
        ) : error ? (
          <div className="p-4">
            <div className="text-center py-12 bg-danger-50 dark:bg-danger-900/20 rounded-lg border border-danger-200 dark:border-danger-800">
              <p className="text-danger-600 dark:text-danger-400">{error}</p>
              <button onClick={() => fetchItems(search, kategori, lowStockOnly)} className="mt-4 text-sm text-brand-600 hover:underline">
                {UI_MESSAGES.TRY_AGAIN}
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <p className="text-neutral-500">{INVENTORY_MESSAGES.NO_ITEMS}</p>
            </div>
          </div>
        ) : (
          <InventoryTable items={items} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}