'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { InventoryItem } from '@/types/inventory';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { debounce } from '@/lib/utils';
import {
  Button,
  DataTable,
  Badge,
  SelectInput,
  Tooltip,
  AmbientLayout,
  FilterButton,
} from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import {
  IconPackage,
  IconSearch,
  IconFilter,
  IconUpload,
  IconX,
  IconArrowDown,
} from '@tabler/icons-react';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
const InventoryTable = dynamic(
  () => import('@/components/inventory/InventoryTable').then((mod) => mod.InventoryTable),
  { ssr: false },
);

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

const ImportInventoryCSVWizard = dynamic(
  () => import('@/components/inventory/ImportInventoryCSVWizard'),
  {
    loading: () => <div className="skeleton-shimmer h-64 rounded-2xl" />,
    ssr: false,
  },
);
import { useHotkeys } from 'react-hotkeys-hook';
import CheckboxInput from '@/components/ui/CheckboxInput';
import { API_ERROR_MESSAGES, UI_MESSAGES, INVENTORY_MESSAGES } from '@/lib/constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKategoris } from '@/lib/hooks/useKategoris';
import { ErrorBoundary } from '@/components/ErrorBoundary';



export default function InventoryPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [kategori, setKategori] = useState(searchParams.get('kategori') || '');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStockOnly') === 'true');
  const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'discontinued'>((searchParams.get('activeStatus') as any) || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'nama_barang');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>((searchParams.get('sortDir') as any) || 'asc');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const ITEMS_PER_PAGE = 20;
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (kategori) params.set('kategori', kategori);
    if (lowStockOnly) params.set('lowStockOnly', 'true');
    if (activeStatus !== 'all') params.set('activeStatus', activeStatus);
    if (sortBy !== 'nama_barang') params.set('sortBy', sortBy);
    if (sortDir !== 'asc') params.set('sortDir', sortDir);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? '?' + queryString : ''}`;
    
    const currentQueryString = searchParams.toString();
    if (queryString !== currentQueryString) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearch, kategori, lowStockOnly, activeStatus, sortBy, sortDir, page, pathname, router, searchParams]);

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
  }, [debouncedSearch, kategori, lowStockOnly, activeStatus, sortBy, sortDir]);

  const { data: kategoriResponse } = useKategoris();

  const categoryId = useMemo(() => {
    if (!kategori || !kategoriResponse) return undefined;
    const cat = kategoriResponse.find(c => c.nama === kategori);
    return cat?.id;
  }, [kategori, kategoriResponse]);

  const {
    data: inventoryData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      'inventory',
      {
        page,
        search: debouncedSearch,
        categoryId,
        lowStockOnly,
        activeStatus,
        sortBy,
        sortDir,
      },
    ],
    queryFn: () =>
      inventoryApi.getPaginated({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        categoryId,
        categoryName: kategori,
        lowStockOnly,
        activeStatus,
        sortBy,
        sortDir,
      }),
  });

  const { data: globalLowStockCount } = useQuery({
    queryKey: ['inventory', 'low-stock-count', { search: debouncedSearch, categoryId }],
    queryFn: () =>
      inventoryApi.getLowStockCount({ search: debouncedSearch, categoryId, categoryName: kategori }),
  });

  const items = inventoryData?.data || [];
  const totalPages = Math.ceil((inventoryData?.total || 0) / ITEMS_PER_PAGE) || 1;
  const error = queryError ? queryError.message : inventoryData?.error?.message || null;
  const kategoriList = useMemo(() => (kategoriResponse || []).map((k) => k.nama), [kategoriResponse]);

  const handleUpdate = useCallback(
    (id: string, data: Partial<InventoryItem>) => {
      // InventoryTable already handles the API call, we just need to invalidate the cache
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await inventoryApi.delete(id);
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
    },
    [queryClient],
  );

  const lowStockCount = globalLowStockCount || 0;

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    handleFocusSearch();
  }, { enableOnFormTags: true });

  useHotkeys('shift+/', (e) => {
    e.preventDefault();
    setShowShortcutsHelp((prev) => !prev);
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    setSearch('');
    setKategori('');
    setLowStockOnly(false);
    setActiveStatus('all');
    setSortBy('nama_barang');
    setSortDir('asc');
  }, { enableOnFormTags: true });

  const shortcuts = [
    { key: 'K', ctrl: true, description: 'Fokus ke pencarian (Ctrl+K)' },
    { key: '?', description: 'Tampilkan bantuan shortcut' },
    { key: 'Escape', description: 'Reset filter' },
  ];

  return (
    <ErrorBoundary>
      <PullToRefresh
        onRefresh={async () => {
          await refetch();
        }}
        pullingContent={
          <div className="flex items-center justify-center py-4 text-neutral-400">
            <IconArrowDown className="h-5 w-5 animate-bounce" />
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <div className="border-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        }
      >
        <AmbientLayout>
          {showShortcutsHelp && (
            <Portal>
              <div
                className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 p-4"
                onClick={() => setShowShortcutsHelp(false)}
              >
                <div
                  className="shadow-elevated animate-scale-in w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">
                    Keyboard Shortcuts
                  </h2>
                  <ul className="space-y-3">
                    {shortcuts.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-800"
                      >
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {s.description}
                        </span>
                        <kbd className="rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {s.ctrl ? 'Ctrl+' : ''}
                          {s.key}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                    Tekan Esc untuk menutup
                  </p>
                </div>
              </div>
            </Portal>
          )}

          <div className="mb-4 lg:mb-6">
            <div className="mb-4 flex flex-row items-start justify-between gap-4 lg:mb-5 lg:items-center">
              <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
                <IconPackage
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Stok
                  </h1>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Kelola data dan stok barang.
                  </p>
                </div>
              </div>
              <div className="animate-fade-in-up flex items-center gap-2 sm:gap-3">
                {(lowStockCount > 0 || lowStockOnly) && (
                  <button
                    onClick={() => setLowStockOnly(!lowStockOnly)}
                    className={`hidden items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all sm:flex cursor-pointer btn-press ${
                      lowStockOnly
                        ? 'bg-accent-rose-500 text-white border-accent-rose-500 dark:bg-accent-rose-600 dark:border-accent-rose-600 shadow-sm'
                        : 'bg-accent-rose-50 dark:bg-accent-rose-950/40 text-accent-rose-600 dark:text-accent-rose-300 border-accent-rose-200 dark:border-accent-rose-800 hover:bg-accent-rose-100 dark:hover:bg-accent-rose-900/60'
                    }`}
                  >
                    <span className={`h-2 w-2 animate-pulse rounded-full ${lowStockOnly ? 'bg-white' : 'bg-accent-rose-500'}`}></span>
                    {lowStockCount} low stock
                  </button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setShowImportModal(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl !p-0 shadow-sm transition-shadow hover:shadow-md sm:h-auto sm:w-auto sm:!px-4 sm:!py-2"
                >
                  <IconUpload size={20} className="shrink-0" />
                  <span className="hidden font-medium sm:inline">Import CSV</span>
                </Button>
              </div>
            </div>

            {(lowStockCount > 0 || lowStockOnly) && (
              <div className="animate-fade-in-up mb-4 sm:hidden">
                <button
                  onClick={() => setLowStockOnly(!lowStockOnly)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all cursor-pointer btn-press ${
                    lowStockOnly
                      ? 'bg-accent-rose-500 text-white border-accent-rose-500 dark:bg-accent-rose-600 dark:border-accent-rose-600 shadow-sm'
                      : 'bg-accent-rose-50 dark:bg-accent-rose-950/40 text-accent-rose-600 dark:text-accent-rose-300 border-accent-rose-200 dark:border-accent-rose-800 hover:bg-accent-rose-100 dark:hover:bg-accent-rose-900/60'
                  }`}
                >
                  <span className={`h-2 w-2 animate-pulse rounded-full ${lowStockOnly ? 'bg-white' : 'bg-accent-rose-500'}`}></span>
                  {lowStockCount} barang low stock
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div
                className="animate-fade-in-up flex w-full flex-row items-center gap-2"
                style={{ animationDelay: '50ms' }}
              >
                <div className="relative flex-1">
                  <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                    <IconSearch size={18} />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Cari nama atau barcode"
                    aria-label="Cari nama atau barcode"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="focus:border-brand-500 focus:shadow-brand w-full rounded-xl border border-neutral-200/60 bg-white py-2 pr-3 pl-9 text-sm shadow-sm transition-all focus:outline-none sm:py-3 sm:text-base dark:border-neutral-800/60 dark:bg-neutral-900"
                  />
                </div>

                <FilterButton
                  onClick={() => setIsFilterOpen(true)}
                  activeCount={
                    (kategori ? 1 : 0) +
                    (lowStockOnly ? 1 : 0) +
                    (activeStatus !== 'all' ? 1 : 0) +
                    (sortBy !== 'nama_barang' || sortDir !== 'asc' ? 1 : 0)
                  }
                  className="sm:h-[46px]" // override desktop height to match the search bar height
                />
              </div>

              <div
                className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap"
                style={{ animationDelay: '100ms' }}
              >
                {kategori && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {kategori}
                    <button
                      onClick={() => setKategori('')}
                      className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}
                {activeStatus !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {activeStatus === 'active' ? 'Barang Aktif' : 'Discontinue'}
                    <button
                      onClick={() => setActiveStatus('all')}
                      className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}
                {lowStockOnly && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    Low Stock
                    <button
                      onClick={() => setLowStockOnly(false)}
                      className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <ResponsivePanel
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            title="Filter Inventory"
          >
            <div className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Kategori:
                </label>
                <SelectInput
                  value={kategori}
                  onChange={setKategori}
                  options={(Array.isArray(kategoriList) ? kategoriList : []).map((k) => ({
                    value: k,
                    label: k,
                  }))}
                  placeholder="Semua Kategori"
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Status Stok:
                </label>
                <CheckboxInput
                  checked={lowStockOnly}
                  onChange={setLowStockOnly}
                  label="Hanya Stok Minimum"
                  labelClassName="px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center gap-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Status Barang:
                </label>
                <SelectInput
                  value={activeStatus}
                  onChange={(val) => setActiveStatus(val as 'all' | 'active' | 'discontinued')}
                  options={[
                    { value: 'all', label: 'Semua Status' },
                    { value: 'active', label: 'Hanya Barang Aktif' },
                    { value: 'discontinued', label: 'Hanya Discontinue' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Urutkan Berdasarkan:
                </label>
                <SelectInput
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: 'nama_barang', label: 'Nama Barang' },
                    { value: 'stok', label: 'Sisa Stok' },
                    { value: 'harga_jual', label: 'Harga Jual' },
                    { value: 'created_at', label: 'Waktu Ditambahkan' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Arah Urutan:
                </label>
                <SelectInput
                  value={sortDir}
                  onChange={(val) => setSortDir(val as 'asc' | 'desc')}
                  options={[
                    {
                      value: 'asc',
                      label: sortBy === 'nama_barang' ? 'A - Z' : 'Terendah ke Tertinggi / Terlama',
                    },
                    {
                      value: 'desc',
                      label: sortBy === 'nama_barang' ? 'Z - A' : 'Tertinggi ke Terendah / Terbaru',
                    },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  className="w-1/2"
                  onClick={() => {
                    setKategori('');
                    setLowStockOnly(false);
                    setActiveStatus('all');
                    setSortBy('nama_barang');
                    setSortDir('asc');
                  }}
                >
                  Reset Filter
                </Button>
                <Button variant="primary" className="w-1/2" onClick={() => setIsFilterOpen(false)}>
                  Terapkan
                </Button>
              </div>
            </div>
          </ResponsivePanel>

          <div className="flex-1">
            {loading ? (
              <div>
                <div className="overflow-hidden rounded-3xl border border-neutral-200/60 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900">
                  <div className="border-b border-neutral-200/50 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800/50 dark:bg-neutral-950/50">
                    <div className="h-5 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                  <table className="w-full">
                    <thead className="bg-white/50 backdrop-blur-md dark:bg-neutral-950/50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="h-4 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <div className="h-4 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, i) => (
                        <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
                          <td className="px-4 py-3">
                            <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-5 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="ml-auto h-4 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="mx-auto h-6 w-8 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : error ? (
              <div>
                <div className="bg-danger-50/50 dark:bg-danger-900/20 border-danger-200/50 dark:border-danger-800/50 shadow-elevated rounded-3xl border py-12 text-center backdrop-blur-md">
                  <p className="text-danger-600 dark:text-danger-400 font-medium">{error}</p>
                  <button
                    onClick={() => refetch()}
                    className="text-brand-600 dark:text-brand-400 mt-4 text-sm font-semibold hover:underline"
                  >
                    {UI_MESSAGES.TRY_AGAIN}
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div>
                <div className="rounded-3xl border border-neutral-200/60 bg-white py-12 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900">
                  <p className="font-medium text-neutral-500 dark:text-neutral-400">
                    {INVENTORY_MESSAGES.NO_ITEMS}
                  </p>
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
                  onPageChange: setPage,
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
      </PullToRefresh>
    </ErrorBoundary>
  );
}
