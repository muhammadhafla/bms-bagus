'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import { warehouseStockApi, gudangApi } from '@/lib/api/warehouse';
import { kategoriApi } from '@/lib/api';
import { WarehouseItemStock, Gudang } from '@/types/warehouse';
import { useAuthStore } from '@/lib/auth';
import { queryKeys } from '@/lib/queryKeys';

export type StockStatusFilter = 'all' | 'low' | 'empty' | 'available';
export type RakStatusFilter = 'all' | 'assigned' | 'unassigned';

export function useWarehouseStocks() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const profile = useAuthStore((state) => state.profile);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const hasRole = useAuthStore((state) => state.hasRole);
  const canEditThresholds = isAdmin() || hasRole('kepala_cabang');

  const [selectedGudangId, setSelectedGudangId] = useState<string>(
    searchParams.get('gudangId') || profile?.default_gudang_id || '',
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get('search') || '',
  );
  const [categoryId, setCategoryId] = useState<string>(
    searchParams.get('categoryId') || '',
  );
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>(
    (searchParams.get('stockStatus') as StockStatusFilter) ||
      (searchParams.get('lowStockOnly') === 'true' ? 'low' : 'all'),
  );
  const [rakStatus, setRakStatus] = useState<RakStatusFilter>(
    (searchParams.get('rakStatus') as RakStatusFilter) || 'all',
  );
  const [sortBy, setSortBy] = useState<string>(
    searchParams.get('sortBy') || 'updated_at',
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc',
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const limit = 20;

  const [editingItem, setEditingItem] = useState<WarehouseItemStock | null>(
    null,
  );

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
    if (queryString !== searchParams.toString()) {
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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: kategoriRes } = useQuery({
    queryKey: queryKeys.kategori.all,
    queryFn: () => kategoriApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const kategoriList = useMemo(
    () => kategoriRes?.data || [],
    [kategoriRes?.data],
  );

  const { data: gudangRes } = useQuery({
    queryKey: queryKeys.warehouse.list,
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
    staleTime: 5 * 60 * 1000,
  });

  const gudangList: Gudang[] = useMemo(
    () => gudangRes?.data || [],
    [gudangRes?.data],
  );

  const defaultGudangId = profile?.default_gudang_id;

  const activeGudang = useMemo(() => {
    if (!gudangList.length) return null;
    if (selectedGudangId) {
      return gudangList.find((g) => g.id === selectedGudangId) || gudangList[0];
    }
    if (defaultGudangId) {
      const userGudang = gudangList.find((g) => g.id === defaultGudangId);
      if (userGudang) return userGudang;
    }
    const def = gudangList.find((g) => g.is_default);
    return def || gudangList[0];
  }, [gudangList, selectedGudangId, defaultGudangId]);

  const activeGudangId = activeGudang?.id || '';

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
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  });

  const items = stocksRes?.data?.data || [];
  const totalCount = stocksRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const error = queryError
    ? (queryError as Error).message
    : stocksRes?.error
      ? stocksRes.error.message
      : null;

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
      Boolean(
        debouncedSearch ||
          categoryId ||
          stockStatus !== 'all' ||
          rakStatus !== 'all' ||
          sortBy !== 'updated_at' ||
          sortDir !== 'desc',
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

  const handleOpenEdit = useCallback((item: WarehouseItemStock) => {
    setEditingItem(item);
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

  const invalidateStocks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouseOps.summary });
  }, [queryClient]);

  return {
    router,
    canEditThresholds,
    searchInputRef,
    limit,
    selectedGudangId,
    setSelectedGudangId,
    search,
    setSearch,
    debouncedSearch,
    categoryId,
    setCategoryId,
    stockStatus,
    setStockStatus,
    rakStatus,
    setRakStatus,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    page,
    setPage,
    isFilterOpen,
    setIsFilterOpen,
    editingItem,
    setEditingItem,
    kategoriList,
    gudangList,
    activeGudang,
    activeGudangId,
    items,
    totalCount,
    totalPages,
    stocksLoading,
    error,
    activeFilterCount,
    hasActiveFilters,
    refetch,
    resetAllFilters,
    handleOpenEdit,
    invalidateStocks,
  };
}
