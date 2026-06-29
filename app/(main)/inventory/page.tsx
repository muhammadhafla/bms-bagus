'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InventoryItem } from '@/types/inventory';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { debounce } from '@/lib/utils';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { Button, DataTable, Badge, SelectInput, Tooltip, AmbientLayout } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { IconPackage, IconSearch, IconFilter, IconUpload } from '@tabler/icons-react';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import CheckboxInput from '@/components/ui/CheckboxInput';
import { API_ERROR_MESSAGES, UI_MESSAGES, INVENTORY_MESSAGES } from '@/lib/constants';
import ImportInventoryCSVWizard from '@/components/inventory/ImportInventoryCSVWizard';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kategori, setKategori] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kategori, lowStockOnly]);

  const { data: inventoryData, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['inventory', { page, search: debouncedSearch, categoryName: kategori, lowStockOnly }],
    queryFn: () => inventoryApi.getPaginated({
      page,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearch,
      categoryName: kategori,
      lowStockOnly,
    }),
  });

  const { data: kategoriResponse } = useQuery({
    queryKey: ['kategoris'],
    queryFn: () => kategoriApi.getAll(),
  });

  const items = inventoryData?.data || [];
  const totalPages = Math.ceil((inventoryData?.total || 0) / ITEMS_PER_PAGE) || 1;
  const error = queryError ? queryError.message : (inventoryData?.error?.message || null);
  const kategoriList = (kategoriResponse?.data || []).map(k => k.nama);

  const handleUpdate = useCallback(async (id: string, data: Partial<InventoryItem>) => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }, [queryClient]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await inventoryApi.delete(id);
    if (!result.error) {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  }, [queryClient]);

  const lowStockCount = items.filter(item => item.minimum_stock != null && item.stok <= item.minimum_stock).length;

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const shortcuts: Shortcut[] = useMemo(() => [
    {
      key: 'f',
      ctrl: true,
      handler: handleFocusSearch,
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
  ], [handleFocusSearch]);

  useKeyboardShortcuts(shortcuts);

  return (
    <AmbientLayout>
      {showShortcutsHelp && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 animate-fade-in" onClick={() => setShowShortcutsHelp(false)}>
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-elevated max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">Keyboard Shortcuts</h2>
              <ul className="space-y-3">
                {/* eslint-disable-next-line react-hooks/refs */}
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
        </Portal>
      )}
      
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4 animate-fade-in-up pl-12 lg:pl-0">
            <IconPackage className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Stok</h1>
              <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Kelola data dan stok barang.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 animate-fade-in-up flex-wrap lg:flex-nowrap">
            {lowStockCount > 0 && (
              <span className="bg-accent-rose-50 dark:bg-accent-rose-950/40 text-accent-rose-600 dark:text-accent-rose-300 px-4 py-2 rounded-xl text-sm font-semibold border border-accent-rose-200 dark:border-accent-rose-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-accent-rose-500 rounded-full animate-pulse"></span>
                {lowStockCount} barang low stock
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <IconUpload size={20} />
              <span className="hidden sm:inline font-medium">Import CSV</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
              <IconSearch size={20} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari nama atau barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all"
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
              label="Hanya Stok Minimum"
              labelClassName="px-5 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center gap-2"
            />
          </div>
        </div>
      </div>

      <div className="flex-1">
        {loading ? (
          <div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-neutral-50/50 dark:bg-neutral-950/50 px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </div>
              <table className="w-full">
                <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md">
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
          <div>
            <div className="text-center py-12 bg-danger-50/50 dark:bg-danger-900/20 backdrop-blur-md rounded-3xl border border-danger-200/50 dark:border-danger-800/50 shadow-elevated">
              <p className="text-danger-600 dark:text-danger-400 font-medium">{error}</p>
              <button onClick={() => refetch()} className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline font-semibold">
                {UI_MESSAGES.TRY_AGAIN}
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div>
            <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm">
              <p className="text-neutral-500 dark:text-neutral-400 font-medium">{INVENTORY_MESSAGES.NO_ITEMS}</p>
            </div>
          </div>
        ) : (
          <InventoryTable 
            items={items} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete} 
            kategoriList={kategoriList}
            pagination={{
              page,
              totalPages,
              onPageChange: setPage
            }}
          />
        )}
      </div>

      <ImportInventoryCSVWizard
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onComplete={() => {
          setShowImportModal(false);
          refetch();
        }}
      />
    </AmbientLayout>
  );
}