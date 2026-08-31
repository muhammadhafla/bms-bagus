'use client';

import { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconPackage,
  IconEdit,
  IconArrowsExchange,
  IconExternalLink,
  IconSearch,
  IconFilter,
  IconX,
  IconArrowDown,
  IconBuildingWarehouse,
  IconMapPin,
  IconAlertTriangle,
  IconChevronDown,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Button,
  Badge,
  Modal,
  TextInput,
  SelectInput,
  ModernPagination,
  FilterButton,
} from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { warehouseStockApi, gudangApi } from '@/lib/api/warehouse';
import { kategoriApi } from '@/lib/api';
import { WarehouseItemStock, Gudang } from '@/types/warehouse';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHotkeys } from 'react-hotkeys-hook';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function WarehouseStocksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center p-8 text-center text-neutral-500">
          <div className="border-brand-500 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
          <span className="ml-3 text-sm font-medium">Memuat stok gudang...</span>
        </div>
      }
    >
      <WarehouseStocksContent />
    </Suspense>
  );
}

function WarehouseStocksContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedGudangId, setSelectedGudangId] = useState<string>(
    searchParams.get('gudangId') || '',
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState<string>(searchParams.get('categoryId') || '');
  const [stockStatus, setStockStatus] = useState<'all' | 'low' | 'empty' | 'available'>(
    (searchParams.get('stockStatus') as any) ||
      (searchParams.get('lowStockOnly') === 'true' ? 'low' : 'all'),
  );
  const [rakStatus, setRakStatus] = useState<'all' | 'assigned' | 'unassigned'>(
    (searchParams.get('rakStatus') as any) || 'all',
  );
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || 'updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc',
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const limit = 20;

  // Modal State for Edit Bin/Rack
  const [editingItem, setEditingItem] = useState<WarehouseItemStock | null>(null);
  const [rakLokasi, setRakLokasi] = useState('');
  const [minStok, setMinStok] = useState<number>(0);
  const [maxStok, setMaxStok] = useState<string>('');

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedGudangId) params.set('gudangId', selectedGudangId);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (categoryId) params.set('categoryId', categoryId);
    if (stockStatus !== 'all') params.set('stockStatus', stockStatus);
    if (rakStatus !== 'all') params.set('rakStatus', rakStatus);
    if (sortBy !== 'updated_at') params.set('sortBy', sortBy);
    if (sortDir !== 'desc') params.set('sortDir', sortDir);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? '?' + queryString : ''}`;

    const currentQueryString = searchParams.toString();
    if (queryString !== currentQueryString) {
      router.replace(newUrl, { scroll: false });
    }
  }, [
    selectedGudangId,
    debouncedSearch,
    categoryId,
    stockStatus,
    rakStatus,
    sortBy,
    sortDir,
    page,
    pathname,
    router,
    searchParams,
  ]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedGudangId, debouncedSearch, categoryId, stockStatus, rakStatus, sortBy, sortDir]);

  // Fetch Category List
  const { data: kategoriRes } = useQuery({
    queryKey: ['kategori-list'],
    queryFn: () => kategoriApi.getAll(),
  });

  const kategoriList = useMemo(() => {
    const data = (kategoriRes as any)?.data || kategoriRes || [];
    return Array.isArray(data) ? data : [];
  }, [kategoriRes]);

  // Fetch Gudang List
  const { data: gudangRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });

  const gudangList: Gudang[] = useMemo(() => gudangRes?.data || [], [gudangRes?.data]);

  // If no gudang selected yet, default to the default warehouse
  const activeGudang = useMemo(() => {
    if (!gudangList.length) return null;
    if (selectedGudangId) {
      return gudangList.find((g) => g.id === selectedGudangId) || gudangList[0];
    }
    const def = gudangList.find((g) => g.is_default);
    return def || gudangList[0];
  }, [gudangList, selectedGudangId]);

  const activeGudangId = activeGudang?.id || '';

  // Fetch Stocks for Selected Warehouse
  const {
    data: stocksRes,
    isLoading: stocksLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      'warehouse-stocks',
      activeGudangId,
      debouncedSearch,
      categoryId,
      stockStatus,
      rakStatus,
      sortBy,
      sortDir,
      page,
    ],
    queryFn: () =>
      warehouseStockApi.getStocksByGudang(activeGudangId, {
        search: debouncedSearch,
        categoryId: categoryId || undefined,
        stockStatus,
        rakStatus,
        sortBy,
        sortDir,
        page,
        limit,
      }),
    enabled: !!activeGudangId,
  });

  const items = stocksRes?.data?.data || [];
  const totalCount = stocksRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const error = queryError ? (queryError as Error).message : null;

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryId) count++;
    if (stockStatus !== 'all') count++;
    if (rakStatus !== 'all') count++;
    if (sortBy !== 'updated_at' || sortDir !== 'desc') count++;
    return count;
  }, [categoryId, stockStatus, rakStatus, sortBy, sortDir]);

  const hasActiveFilters = useMemo(
    () =>
      !!(
        debouncedSearch ||
        categoryId ||
        stockStatus !== 'all' ||
        rakStatus !== 'all' ||
        sortBy !== 'updated_at' ||
        sortDir !== 'desc'
      ),
    [debouncedSearch, categoryId, stockStatus, rakStatus, sortBy, sortDir],
  );

  const resetAllFilters = useCallback(() => {
    setSearch('');
    setCategoryId('');
    setStockStatus('all');
    setRakStatus('all');
    setSortBy('updated_at');
    setSortDir('desc');
  }, []);

  // Mutation for updating rack / bin
  const updateBinMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem || !activeGudangId) return;
      const res = await warehouseStockApi.updateStockBin(editingItem.inventory_id, activeGudangId, {
        rak_lokasi: rakLokasi.trim() || null,
        min_stok: Number(minStok) || 0,
        max_stok: maxStok ? Number(maxStok) : null,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Lokasi rak & batas stok berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    },
  });

  const handleOpenEdit = useCallback((item: WarehouseItemStock) => {
    setEditingItem(item);
    setRakLokasi(item.rak_lokasi || '');
    setMinStok(item.min_stok || 0);
    setMaxStok(item.max_stok ? String(item.max_stok) : '');
  }, []);

  const handleFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  useHotkeys(
    'ctrl+k, cmd+k',
    (e) => {
      e.preventDefault();
      handleFocusSearch();
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      resetAllFilters();
    },
    { enableOnFormTags: true },
  );

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
          {/* Header */}
          <div className="mb-4 lg:mb-6">
            <div className="mb-4 flex flex-row items-start justify-between gap-4 lg:mb-5 lg:items-center">
              <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
                <IconBuildingWarehouse
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Stok per Gudang
                  </h1>
                  <p className="mt-0.5 hidden text-xs font-medium text-neutral-500 md:block lg:mt-2 lg:text-base dark:text-neutral-400">
                    Saldo stok fisik, penempatan rak/bin, dan mutasi barang antar outlet.
                  </p>
                </div>
              </div>

              <div className="animate-fade-in-up flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setStockStatus(stockStatus === 'low' ? 'all' : 'low')}
                  className={`btn-press flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all sm:h-auto sm:px-4 sm:py-2 sm:text-sm ${
                    stockStatus === 'low'
                      ? 'bg-accent-rose-500 text-white border-accent-rose-500 shadow-sm dark:bg-accent-rose-600 dark:border-accent-rose-600'
                      : 'bg-accent-rose-50 text-accent-rose-600 border-accent-rose-200 hover:bg-accent-rose-100 dark:bg-accent-rose-950/40 dark:text-accent-rose-300 dark:border-accent-rose-800 dark:hover:bg-accent-rose-900/60'
                  }`}
                  title="Filter hanya stok menipis (≤ 5)"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2 ${
                      stockStatus === 'low' ? 'bg-white' : 'bg-accent-rose-500 animate-pulse'
                    }`}
                  />
                  <span>
                    <span className="hidden sm:inline">Stok Menipis</span>
                    <span className="sm:hidden">Menipis</span>
                  </span>
                </button>

                <Button
                  variant="primary"
                  onClick={() => router.push('/warehouse/transfers?action=new')}
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl !p-2 shadow-sm transition-shadow hover:shadow-md sm:h-auto sm:!px-4 sm:!py-2"
                >
                  <IconArrowsExchange size={18} className="shrink-0" />
                  <span className="hidden font-medium sm:inline">Transfer Stok</span>
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3">
              <div
                className="animate-fade-in-up flex w-full flex-col gap-2.5 sm:flex-row sm:items-center"
                style={{ animationDelay: '50ms' }}
              >
                {/* Compact Warehouse Selector (Desktop & Mobile) */}
                <div className="w-full sm:w-72 sm:shrink-0">
                  <div className="group relative flex items-center">
                    <div className="pointer-events-none absolute left-3 z-10 text-brand-600 dark:text-brand-400">
                      <IconBuildingWarehouse size={18} stroke={1.8} />
                    </div>
                    <select
                      value={activeGudangId}
                      onChange={(e) => {
                        setSelectedGudangId(e.target.value);
                        setPage(1);
                      }}
                      aria-label="Pilih Lokasi Gudang"
                      className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:ring-brand-500/30 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200/80 bg-white py-2.5 pr-9 pl-9.5 text-xs font-bold text-neutral-800 shadow-sm transition-all focus:outline-none focus:ring-2 sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                    >
                      {gudangList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama} ({g.kode_gudang}){g.is_default ? ' ★ Default' : ''}
                        </option>
                      ))}
                    </select>
                    <IconChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors"
                    />
                  </div>
                </div>

                {/* Search Bar & Filter Button */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                      <IconSearch size={18} />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Cari nama barang atau barcode..."
                      aria-label="Cari nama barang atau barcode"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="focus:border-brand-500 focus:shadow-brand w-full rounded-xl border border-neutral-200/60 bg-white py-2.5 pr-9 pl-9 text-sm shadow-sm transition-all focus:outline-none dark:border-neutral-800/60 dark:bg-neutral-900"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <IconX size={16} />
                      </button>
                    )}
                  </div>

                  <FilterButton
                    onClick={() => setIsFilterOpen(true)}
                    activeCount={activeFilterCount}
                    className="h-[42px] shrink-0"
                  />
                </div>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div
                  className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap"
                  style={{ animationDelay: '100ms' }}
                >
                  {categoryId && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-900/50">
                      <span>
                        Kategori:{' '}
                        {kategoriList.find((k: any) => (k.id || k.nama) === categoryId)?.nama ||
                          categoryId}
                      </span>
                      <button
                        onClick={() => setCategoryId('')}
                        className="text-brand-500 hover:text-brand-700 dark:hover:text-brand-200"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}

                  {stockStatus !== 'all' && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-rose-50 px-3 py-1 text-xs font-medium text-accent-rose-700 dark:bg-accent-rose-950/40 dark:text-accent-rose-300 border border-accent-rose-200 dark:border-accent-rose-800">
                      <span>
                        {stockStatus === 'low'
                          ? 'Stok Menipis (≤ 5)'
                          : stockStatus === 'empty'
                          ? 'Stok Habis (0)'
                          : 'Stok Tersedia (> 0)'}
                      </span>
                      <button
                        onClick={() => setStockStatus('all')}
                        className="text-accent-rose-500 hover:text-accent-rose-700 dark:hover:text-accent-rose-200"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}

                  {rakStatus !== 'all' && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <span>
                        {rakStatus === 'unassigned' ? 'Belum Diatur Rak' : 'Sudah Ada Lokasi Rak'}
                      </span>
                      <button
                        onClick={() => setRakStatus('all')}
                        className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}

                  {(sortBy !== 'updated_at' || sortDir !== 'desc') && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      <span>
                        Urut:{' '}
                        {sortBy === 'nama_barang'
                          ? sortDir === 'asc'
                            ? 'Nama (A-Z)'
                            : 'Nama (Z-A)'
                          : sortBy === 'stok'
                          ? sortDir === 'asc'
                            ? 'Stok Terendah'
                            : 'Stok Tertinggi'
                          : sortBy === 'rak_lokasi'
                          ? 'Rak (A-Z)'
                          : 'Terbaru'}
                      </span>
                      <button
                        onClick={() => {
                          setSortBy('updated_at');
                          setSortDir('desc');
                        }}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}

                  {debouncedSearch && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      <span>Pencarian: &quot;{debouncedSearch}&quot;</span>
                      <button
                        onClick={() => setSearch('')}
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={resetAllFilters}
                    className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400 ml-1 cursor-pointer"
                  >
                    Reset Semua
                  </button>

                  <span className="text-[11px] text-neutral-400 ml-auto hidden sm:inline">
                    Total: {totalCount} barang
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Filter Panel */}
          <ResponsivePanel
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            title="Filter Stok Gudang"
          >
            <div className="space-y-5">
              {/* Category Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Kategori Barang:
                </label>
                <SelectInput
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  options={[
                    { value: '', label: 'Semua Kategori' },
                    ...kategoriList.map((k: any) => ({
                      value: k.id || k.nama,
                      label: k.nama,
                    })),
                  ]}
                  placeholder="Semua Kategori"
                  className="w-full"
                />
              </div>

              {/* Stock Level Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Status Ketersediaan Stok:
                </label>
                <SelectInput
                  value={stockStatus}
                  onChange={(val) => setStockStatus(val as any)}
                  options={[
                    { value: 'all', label: 'Semua Status Stok' },
                    { value: 'low', label: 'Hanya Stok Menipis (≤ 5 / Min)' },
                    { value: 'empty', label: 'Stok Habis (0 pcs)' },
                    { value: 'available', label: 'Stok Tersedia (> 0 pcs)' },
                  ]}
                  className="w-full"
                />
              </div>

              {/* Rack / Bin Assignment Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Status Penempatan Rak / Bin:
                </label>
                <SelectInput
                  value={rakStatus}
                  onChange={(val) => setRakStatus(val as any)}
                  options={[
                    { value: 'all', label: 'Semua Status Rak' },
                    { value: 'unassigned', label: 'Belum Diatur (Perlu Penempatan Rak)' },
                    { value: 'assigned', label: 'Sudah Memiliki Lokasi Rak' },
                  ]}
                  className="w-full"
                />
              </div>

              {/* Sort By Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Urutkan Berdasarkan:
                </label>
                <SelectInput
                  value={`${sortBy}:${sortDir}`}
                  onChange={(val) => {
                    const [newSortBy, newSortDir] = val.split(':');
                    setSortBy(newSortBy);
                    setSortDir(newSortDir as 'asc' | 'desc');
                  }}
                  options={[
                    { value: 'updated_at:desc', label: 'Terakhir Diperbarui: Terbaru' },
                    { value: 'nama_barang:asc', label: 'Nama Barang (A ke Z)' },
                    { value: 'nama_barang:desc', label: 'Nama Barang (Z ke A)' },
                    { value: 'stok:asc', label: 'Sisa Stok Gudang: Paling Sedikit' },
                    { value: 'stok:desc', label: 'Sisa Stok Gudang: Paling Banyak' },
                    { value: 'rak_lokasi:asc', label: 'Lokasi Rak: A ke Z' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  className="w-1/2"
                  onClick={() => {
                    setCategoryId('');
                    setStockStatus('all');
                    setRakStatus('all');
                    setSortBy('updated_at');
                    setSortDir('desc');
                    setSearch('');
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

          {/* Main Content Area */}
          <div className="flex-1">
            {stocksLoading ? (
              <div>
                {/* Desktop Loading Skeleton */}
                <div className="shadow-elevated hidden overflow-hidden rounded-3xl border border-neutral-200/60 bg-white lg:block dark:border-neutral-800/60 dark:bg-neutral-900">
                  <div className="border-b border-neutral-200/50 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800/50 dark:bg-neutral-950/50">
                    <div className="h-5 w-44 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                  <table className="w-full">
                    <thead className="bg-white/50 backdrop-blur-md dark:bg-neutral-950/50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <div className="h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="ml-auto h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                        <th className="px-4 py-3 text-center">
                          <div className="mx-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(6)].map((_, i) => (
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
                          <td className="px-4 py-3">
                            <div className="h-5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="mx-auto h-6 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Loading Skeleton Cards */}
                <div className="space-y-3 lg:hidden">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-neutral-200/60 bg-white/70 p-3.5 shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900/60"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-2/3 space-y-2">
                          <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        </div>
                        <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-neutral-100/50 p-2.5 dark:bg-neutral-800/40">
                        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                    </div>
                  ))}
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
                    Coba Muat Ulang
                  </button>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div>
                <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-200/60 bg-white py-12 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900">
                  <IconPackage size={56} className="mb-3 text-neutral-300 dark:text-neutral-600" />
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">
                    Tidak ada data persediaan stok barang
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {hasActiveFilters
                      ? 'Coba sesuaikan kata kunci pencarian atau reset filter'
                      : `Belum ada saldo barang yang dialokasikan di ${activeGudang?.nama || 'gudang ini'}`}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={resetAllFilters}
                      className="text-brand-600 dark:text-brand-400 mt-4 text-xs font-semibold hover:underline cursor-pointer"
                    >
                      Reset Semua Filter
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Desktop View (Table Glassmorphism) */}
                <div className="shadow-elevated hidden overflow-auto rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-neutral-900/60">
                  <table className="w-full min-w-[900px]">
                    <thead className="sticky top-0 z-10 border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Barcode
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Nama Barang
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Kategori
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Lokasi Rak / Bin
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Stok ({activeGudang?.kode_gudang || 'Gudang'})
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Total Seluruh Cabang
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Batas (Min/Max)
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {items.map((row) => {
                        const isLow = row.stok_gudang <= (row.min_stok || 5);
                        const isZero = row.stok_gudang === 0;

                        return (
                          <tr
                            key={row.inventory_id}
                            className={`group transition-colors ${
                              isZero
                                ? 'bg-rose-50/20 hover:bg-rose-50/50 dark:bg-rose-950/10 dark:hover:bg-rose-950/30'
                                : isLow
                                ? 'bg-amber-50/20 hover:bg-amber-50/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/30'
                                : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60'
                            }`}
                          >
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                              {row.kode_barcode}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="font-semibold text-neutral-900 dark:text-white">
                                {row.nama_barang}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {row.id_kategori ? (
                                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                  {row.id_kategori.nama}
                                </span>
                              ) : (
                                <span className="text-xs text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                                  row.rak_lokasi
                                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                                }`}
                              >
                                <IconMapPin size={13} className="shrink-0" />
                                {row.rak_lokasi || 'Belum diatur'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`text-sm font-bold ${
                                    isZero
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : isLow
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-neutral-900 dark:text-white'
                                  }`}
                                >
                                  {row.stok_gudang} {row.unit || 'pcs'}
                                </span>
                                {isZero ? (
                                  <Badge variant="danger" size="sm">
                                    Habis
                                  </Badge>
                                ) : isLow ? (
                                  <Badge variant="warning" size="sm">
                                    Menipis
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                              {row.stok_global} {row.unit || 'pcs'}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-neutral-500 dark:text-neutral-400">
                              Min: {row.min_stok || 0}
                              {row.max_stok ? ` • Max: ${row.max_stok}` : ''}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<IconEdit className="h-4 w-4" />}
                                  onClick={() => handleOpenEdit(row)}
                                  title="Atur Lokasi Rak & Batas Stok"
                                >
                                  Edit Rak
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  leftIcon={<IconArrowsExchange className="h-4 w-4" />}
                                  onClick={() =>
                                    router.push(
                                      `/warehouse/transfers?action=new&itemBarcode=${encodeURIComponent(
                                        row.kode_barcode,
                                      )}&asal=${activeGudangId}`,
                                    )
                                  }
                                  title="Transfer Stok ke Cabang Lain"
                                >
                                  Transfer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leftIcon={<IconExternalLink className="h-4 w-4" />}
                                  onClick={() =>
                                    router.push(
                                      `/inventory?search=${encodeURIComponent(
                                        row.kode_barcode || row.nama_barang,
                                      )}`,
                                    )
                                  }
                                  title="Lihat di Katalog Master"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <ModernPagination
                      page={page}
                      totalPages={totalPages}
                      total={totalCount}
                      limit={limit}
                      onPageChange={setPage}
                      className="hidden rounded-none border-x-0 border-b-0 lg:flex"
                    />
                  )}
                </div>

                {/* Mobile View (Responsive Card List) */}
                <div className="block space-y-3 lg:hidden">
                  {items.map((row) => {
                    const isLow = row.stok_gudang <= (row.min_stok || 5);
                    const isZero = row.stok_gudang === 0;

                    return (
                      <div
                        key={row.inventory_id}
                        className={`group flex flex-col gap-2.5 rounded-2xl border p-3.5 shadow-sm transition-all duration-200 backdrop-blur-xl ${
                          isZero
                            ? 'border-rose-200/70 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20'
                            : isLow
                            ? 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                            : 'border-neutral-200/70 bg-white/80 dark:border-neutral-800/70 dark:bg-neutral-900/80'
                        }`}
                      >
                        {/* Header: Title & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="line-clamp-2 text-sm leading-tight font-bold text-neutral-900 dark:text-white">
                                {row.nama_barang}
                              </h3>
                              {isZero ? (
                                <Badge variant="danger" size="sm">
                                  Habis
                                </Badge>
                              ) : isLow ? (
                                <Badge variant="warning" size="sm">
                                  Menipis
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                {row.kode_barcode}
                              </span>
                              {row.id_kategori && (
                                <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                  {row.id_kategori.nama}
                                </span>
                              )}
                            </div>
                          </div>

                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${
                              row.rak_lokasi
                                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                            }`}
                          >
                            <IconMapPin size={12} className="shrink-0" />
                            {row.rak_lokasi || 'Belum diatur'}
                          </span>
                        </div>

                        {/* Details Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100/60 p-2.5 text-xs dark:bg-neutral-800/50">
                          <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Stok {activeGudang?.kode_gudang || 'Gudang'}:
                            </span>
                            <span
                              className={`text-sm font-bold ${
                                isZero
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isLow
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-neutral-900 dark:text-white'
                              }`}
                            >
                              {row.stok_gudang} {row.unit || 'pcs'}
                            </span>
                          </div>

                          <div className="flex flex-col">
                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Total Seluruh Cabang:
                            </span>
                            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                              {row.stok_global} {row.unit || 'pcs'}
                            </span>
                          </div>

                          <div className="col-span-2 flex items-center justify-between border-t border-neutral-200/50 pt-1.5 text-[11px] text-neutral-500 dark:border-neutral-700/50 dark:text-neutral-400">
                            <span>
                              Batas Min: <strong className="font-medium text-neutral-700 dark:text-neutral-300">{row.min_stok || 0}</strong>
                            </span>
                            {row.max_stok && (
                              <span>
                                Batas Max: <strong className="font-medium text-neutral-700 dark:text-neutral-300">{row.max_stok}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 text-xs"
                            leftIcon={<IconEdit size={14} />}
                            onClick={() => handleOpenEdit(row)}
                          >
                            Edit Rak
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 text-xs"
                            leftIcon={<IconArrowsExchange size={14} />}
                            onClick={() =>
                              router.push(
                                `/warehouse/transfers?action=new&itemBarcode=${encodeURIComponent(
                                  row.kode_barcode,
                                )}&asal=${activeGudangId}`,
                              )
                            }
                          >
                            Transfer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0 px-2.5"
                            leftIcon={<IconExternalLink size={15} />}
                            onClick={() =>
                              router.push(
                                `/inventory?search=${encodeURIComponent(
                                  row.kode_barcode || row.nama_barang,
                                )}`,
                              )
                            }
                            title="Buka di Katalog"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Sticky Pagination */}
                {totalPages > 1 && (
                  <ModernPagination
                    page={page}
                    totalPages={totalPages}
                    total={totalCount}
                    limit={limit}
                    onPageChange={setPage}
                    className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:hidden"
                  />
                )}
              </>
            )}
          </div>

          {/* Modal Edit Rack / Bin Location */}
          {editingItem && (
            <Modal
              isOpen={!!editingItem}
              onClose={() => setEditingItem(null)}
              title={`Atur Rak & Batas Stok - ${activeGudang?.kode_gudang || ''}`}
              isFullScreenOnMobile
              size="md"
            >
              <div className="space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {editingItem.nama_barang}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="font-mono">Barcode: {editingItem.kode_barcode}</span>
                    <span>•</span>
                    <span>
                      Stok Saat Ini:{' '}
                      <strong className="text-neutral-800 dark:text-neutral-200">
                        {editingItem.stok_gudang} {editingItem.unit || 'pcs'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Posisi Rak / Bin (Contoh: Rak A-02-B, Bin 12):
                  </label>
                  <TextInput
                    value={rakLokasi}
                    onChange={(e) => setRakLokasi(e.target.value)}
                    placeholder="Masukkan kode rak atau bin..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Stok Minimum (Alert Peringatan):
                    </label>
                    <TextInput
                      type="number"
                      value={String(minStok)}
                      onChange={(e) => setMinStok(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Stok Maksimum (Kapasitas Rak):
                    </label>
                    <TextInput
                      type="number"
                      value={maxStok}
                      onChange={(e) => setMaxStok(e.target.value)}
                      placeholder="Opsional"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                  <Button variant="secondary" onClick={() => setEditingItem(null)}>
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    loading={updateBinMutation.isPending}
                    onClick={() => updateBinMutation.mutate()}
                  >
                    Simpan Perubahan
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </AmbientLayout>
      </PullToRefresh>
    </ErrorBoundary>
  );
}

