'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHotkeys } from 'react-hotkeys-hook';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import {
  IconTruckDelivery,
  IconPlus,
  IconPrinter,
  IconCheck,
  IconTrash,
  IconChevronRight,
  IconSend,
  IconFileText,
  IconX,
  IconList,
  IconSearch,
  IconBuildingWarehouse,
  IconArrowDown,
} from '@tabler/icons-react';

import {
  AmbientLayout,
  Card,
  CardTitle,
  Button,
  Badge,
  DataTable,
  type Column,
  ResponsivePanel,
  ConfirmDialog,
  Tabs,
  ModernPagination,
  FilterButton,
  Spinner,
} from '@/components/ui';

import { transferStokApi } from '@/lib/api/warehouse';
import { TransferStok, StatusTransfer } from '@/types/warehouse';
import { useAuthStore } from '@/lib/auth';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function WarehouseTransfersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat transfer stok...</div>}>
      <WarehouseTransfersContent />
    </Suspense>
  );
}

function WarehouseTransfersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const { user, hasRole, isAdmin } = useAuthStore();
  const canCancelTransfer = isAdmin() || hasRole('kepala_cabang');

  // UI state
  const isMobile = useMediaQuery('(max-width: 768px)');
  const limit = isMobile ? 20 : 50;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'>((searchParams.get('status') as any) || 'ALL');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal: Detail / Receive Transfer
  const [selectedTransfer, setSelectedTransfer] = useState<TransferStok | null>(null);
  const [receiveItems, setReceiveItems] = useState<Array<{ inventory_id: string; qty_terima: number; catatan: string }>>([]);

  // Confirm dialog for cancellation
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);

  // URL synchronization
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (activeTab !== 'ALL') params.set('status', activeTab);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? '?' + queryString : ''}`;
    
    if (queryString !== searchParams.toString()) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearch, activeTab, page, pathname, router, searchParams]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle direct action from URL
  const handleOpenDetail = useCallback((transfer: TransferStok) => {
    setSelectedTransfer(transfer);
    // Initialize receive items
    setReceiveItems(
      (transfer.items || []).map((it) => ({
        inventory_id: it.inventory_id,
        qty_terima: it.qty_terima || it.qty_kirim,
        catatan: it.catatan || '',
      })),
    );
  }, []);

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      router.push('/warehouse/transfers/new');
      return;
    }
    const detailId = searchParams.get('detailId');
    if (detailId && !selectedTransfer) {
      transferStokApi.getById(detailId).then((res) => {
        if (res.data) handleOpenDetail(res.data);
      });
    }
  }, [searchParams, handleOpenDetail, router, selectedTransfer]);

  // Hotkeys
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    setSearch('');
    setActiveTab('ALL');
  }, { enableOnFormTags: true });

  // Fetch Data
  const statusFilter = activeTab === 'ALL' ? undefined : (activeTab as StatusTransfer);
  const { data: transfersRes, isLoading: transfersLoading, refetch } = useQuery({
    queryKey: ['warehouse-transfers', statusFilter, page, limit, debouncedSearch],
    queryFn: () =>
      transferStokApi.getAll({
        status: statusFilter,
        search: debouncedSearch,
        page,
        limit,
      }),
  });

  const transfers = transfersRes?.data?.data || [];
  const totalCount = transfersRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Mutations
  const kirimMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await transferStokApi.kirim(transferId, user?.id || '');
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Barang berhasil dikirim (Status: IN_TRANSIT)');
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
      setSelectedTransfer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengirim transfer');
    },
  });

  const terimaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransfer) return;
      const res = await transferStokApi.terima(selectedTransfer.id, receiveItems, user?.id || '');
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Penerimaan barang berhasil dikonfirmasi (Status: RECEIVED)');
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stocks'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
      setSelectedTransfer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengonfirmasi penerimaan');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await transferStokApi.cancel(transferId, 'Dibatalkan oleh user');
      if (res.error) throw res.error;
    },
    onSuccess: () => {
      toast.success('Transfer stok dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      setCancelTransferId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membatalkan transfer');
    },
  });

  const variantMap: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    DRAFT: 'default',
    REQUESTED: 'warning',
    APPROVED: 'info',
    IN_TRANSIT: 'warning',
    RECEIVED: 'success',
    CANCELED: 'danger',
  };

  const columns: Column<TransferStok>[] = [
    {
      key: 'nomor_transfer',
      header: 'No. Transfer',
      render: (row) => (
        <span className="font-semibold text-brand-600 dark:text-brand-400">
          {row.nomor_transfer}
        </span>
      ),
    },
    {
      key: 'rute',
      header: 'Rute Gudang',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">
            {row.gudang_asal?.nama}
          </span>
          <IconChevronRight className="h-3 w-3 text-neutral-400" />
          <span className="font-semibold text-neutral-900 dark:text-white">
            {row.gudang_tujuan?.nama}
          </span>
        </div>
      ),
    },
    {
      key: 'total_items',
      header: 'Total Muatan',
      render: (row) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {row.total_items} jenis ({row.total_qty_kirim} pcs)
        </span>
      ),
    },
    {
      key: 'kurir',
      header: 'Kurir / Ekspedisi',
      render: (row) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {row.kurir_pengirim || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={variantMap[row.status] || 'default'} size="sm">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconPrinter className="h-4 w-4 text-neutral-600" />}
            onClick={(e) => {
              e.stopPropagation();
              downloadOrShareFile(`/api/export/warehouse/surat-jalan/${row.id}`, `Surat_Jalan_${row.id}.pdf`, 'Surat Jalan');
            }}
            title="Cetak Surat Jalan"
          />
          {row.status === 'DRAFT' && canCancelTransfer && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<IconTrash className="h-4 w-4 text-rose-500" />}
              onClick={(e) => {
                e.stopPropagation();
                setCancelTransferId(row.id);
              }}
              title="Batalkan Transfer"
            />
          )}
        </div>
      ),
    },
  ];

  const pageContent = (
    <AmbientLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
          <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
            <IconTruckDelivery className="text-brand-600 dark:text-brand-400 h-6 w-6 shrink-0 lg:h-8 lg:w-8" stroke={1.5} />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                Mutasi & Transfer Stok
              </h1>
              <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                Distribusi stok antar cabang, pelacakan in-transit, dan verifikasi
              </p>
            </div>
          </div>

          <div className="animate-fade-in-up flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => router.push('/warehouse/transfers/new')}
              className="w-full sm:w-auto h-10 sm:h-auto"
            >
              Transfer Baru
            </Button>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="flex flex-col gap-3">
          <div className="animate-fade-in-up flex w-full flex-row items-center gap-2" style={{ animationDelay: '50ms' }}>
            <div className="relative flex-1">
              <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                <IconSearch size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari No. Transfer atau Kurir..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 w-full rounded-xl border border-neutral-200/60 bg-white py-2 pr-9 pl-9 text-sm shadow-sm transition-all focus:outline-none sm:py-3 sm:text-base dark:border-neutral-800/60 dark:bg-neutral-900"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-800"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
            
            <FilterButton
              onClick={() => setIsFilterOpen(true)}
              activeCount={activeTab !== 'ALL' ? 1 : 0}
              className="sm:h-[46px]"
            />
          </div>

          {(activeTab !== 'ALL' || search) && (
            <div className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap" style={{ animationDelay: '100ms' }}>
              {activeTab !== 'ALL' && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 sm:hidden dark:bg-neutral-800 dark:text-neutral-300">
                  Status: {activeTab}
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}
              {search && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Pencarian aktif
                  <button
                    onClick={() => setSearch('')}
                    className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Tabs (Kept for quick access, but can be synced with slideover) */}
        <div className="hidden sm:block">
          <Tabs
            activeId={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as any);
              setPage(1);
            }}
            items={[
              { id: 'ALL', label: 'Semua Status', icon: <IconList className="h-4 w-4" /> },
              { id: 'IN_TRANSIT', label: 'In Transit', icon: <IconTruckDelivery className="h-4 w-4" /> },
              { id: 'DRAFT', label: 'Draft', icon: <IconFileText className="h-4 w-4" /> },
              { id: 'RECEIVED', label: 'Selesai', icon: <IconCheck className="h-4 w-4" /> },
              { id: 'CANCELED', label: 'Dibatalkan', icon: <IconX className="h-4 w-4" /> },
            ]}
          />
        </div>

        {/* Data Presentation */}
        <div className="flex-1">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card padding="none" className="overflow-hidden">
              <DataTable
                columns={columns}
                data={transfers}
                keyField="id"
                loading={transfersLoading}
                className="rounded-none border-0"
                onRowClick={handleOpenDetail}
                emptyState={
                  <div className="p-8 text-center text-xs text-neutral-400">
                    Tidak ada transaksi transfer yang sesuai pencarian.
                  </div>
                }
              />
            </Card>
          </div>

          {/* Mobile Card Layout */}
          <div className="flex flex-col gap-3 lg:hidden">
            {transfersLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl border border-neutral-200/60 p-4 shadow-sm dark:border-neutral-800/60">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                  <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="mt-4 grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </div>
              ))
            ) : transfers.length === 0 ? (
              <div className="rounded-3xl border border-neutral-200/60 bg-white py-12 text-center shadow-sm dark:border-neutral-800/60 dark:bg-neutral-900">
                <p className="font-medium text-neutral-500 dark:text-neutral-400">
                  Tidak ada transaksi transfer pada filter ini.
                </p>
              </div>
            ) : (
              transfers.map((row) => (
                <div
                  key={row.id}
                  onClick={() => handleOpenDetail(row)}
                  className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white p-3.5 shadow-sm transition-all duration-200 active:scale-[0.98] hover:bg-neutral-50/90 dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">
                          {row.nomor_transfer}
                        </span>
                        <Badge variant={variantMap[row.status] || 'default'} size="sm">
                          {row.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <IconBuildingWarehouse className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1">
                          {row.gudang_asal?.nama}
                        </span>
                        <IconChevronRight className="h-3 w-3 text-neutral-400 shrink-0" />
                        <span className="font-semibold text-neutral-900 dark:text-white line-clamp-1">
                          {row.gudang_tujuan?.nama}
                        </span>
                      </div>
                    </div>
                    <div className="group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 shrink-0 rounded-lg p-1 text-neutral-400 transition-all">
                      <IconChevronRight size={18} stroke={2.5} />
                    </div>
                  </div>
                  
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[12px] border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5">
                    <div className="flex flex-col">
                      <span className="text-neutral-500">Total Muatan</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {row.total_items} jenis ({row.total_qty_kirim} pcs)
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-500">Kurir</span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {row.kurir_pengirim || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={limit}
            onPageChange={setPage}
            className="hidden rounded-xl border border-neutral-200 bg-white lg:flex dark:border-neutral-800 dark:bg-neutral-900"
          />
        )}

        {/* Mobile Pagination (Sticky) */}
        {totalPages > 1 && (
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalCount}
            limit={limit}
            onPageChange={setPage}
            className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] lg:hidden bg-white dark:bg-neutral-950"
          />
        )}

        {/* Filter Slide-over */}
        <ResponsivePanel
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filter Transfer"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Status Transfer
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'DRAFT', label: 'Draft / Permintaan' },
                  { id: 'IN_TRANSIT', label: 'Sedang Dikirim (In Transit)' },
                  { id: 'RECEIVED', label: 'Diterima (Selesai)' },
                  { id: 'CANCELED', label: 'Dibatalkan' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveTab(st.id as any)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                      activeTab === st.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-900/20 dark:text-brand-300'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                    }`}
                  >
                    <span className="font-medium text-sm">{st.label}</span>
                    {activeTab === st.id && <IconCheck size={18} />}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <Button
                variant="secondary"
                className="w-1/2"
                onClick={() => {
                  setActiveTab('ALL');
                  setSearch('');
                  setIsFilterOpen(false);
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

        {/* MODAL: Detail & Penerimaan Transfer */}
        {selectedTransfer && (
          <ResponsivePanel
            isOpen={!!selectedTransfer}
            onClose={() => setSelectedTransfer(null)}
            title={`Dokumen Transfer: ${selectedTransfer.nomor_transfer}`}
            size="xl"
          >
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-xs">
                <div>
                  <span className="text-neutral-500 block">Gudang Pengirim:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedTransfer.gudang_asal?.nama}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Gudang Penerima:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {selectedTransfer.gudang_tujuan?.nama}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Status:</span>
                  <Badge variant={variantMap[selectedTransfer.status] || 'default'} size="sm">
                    {selectedTransfer.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-neutral-500 block">Kurir / Pengantar:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.kurir_pengirim || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Tanggal Kirim:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.tanggal_kirim
                      ? new Date(selectedTransfer.tanggal_kirim).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Tanggal Terima:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.tanggal_terima
                      ? new Date(selectedTransfer.tanggal_terima).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Items Checklist - Desktop Table */}
              <div className="hidden sm:block border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Nama Barang</th>
                      <th className="px-3 py-2 text-center w-24">Qty Kirim</th>
                      <th className="px-3 py-2 text-center w-28">Qty Terima</th>
                      <th className="px-3 py-2 text-left">Catatan Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {(selectedTransfer.items || []).map((item) => {
                      const isEditable = selectedTransfer.status === 'IN_TRANSIT';
                      const receiveState = receiveItems.find(
                        (ri) => ri.inventory_id === item.inventory_id,
                      );

                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-neutral-900 dark:text-white block">
                              {item.inventory?.nama_barang}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {item.inventory?.kode_barcode}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-neutral-800 dark:text-neutral-200">
                            {item.qty_kirim} {item.inventory?.unit || 'pcs'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                max={item.qty_kirim}
                                value={receiveState?.qty_terima ?? item.qty_kirim}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setReceiveItems((prev) =>
                                    prev.map((ri) =>
                                      ri.inventory_id === item.inventory_id
                                        ? { ...ri, qty_terima: val }
                                        : ri,
                                    ),
                                  );
                                }}
                                className="w-16 rounded border border-neutral-300 bg-white px-2 py-1 text-center font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                              />
                            ) : (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {item.qty_terima} {item.inventory?.unit || 'pcs'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditable ? (
                              <input
                                type="text"
                                value={receiveState?.catatan ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setReceiveItems((prev) =>
                                    prev.map((ri) =>
                                      ri.inventory_id === item.inventory_id
                                        ? { ...ri, catatan: val }
                                        : ri,
                                    ),
                                  );
                                }}
                                placeholder="Jika ada barang rusak / kurang..."
                                className="w-full min-w-[150px] rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800"
                              />
                            ) : (
                              <span className="text-neutral-500">{item.catatan || '-'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Items Checklist - Mobile Cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {(selectedTransfer.items || []).map((item) => {
                  const isEditable = selectedTransfer.status === 'IN_TRANSIT';
                  const receiveState = receiveItems.find(
                    (ri) => ri.inventory_id === item.inventory_id,
                  );

                  return (
                    <div key={item.id} className="rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900">
                      <div className="mb-2 border-b border-neutral-100 pb-2 dark:border-neutral-800">
                        <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                          {item.inventory?.nama_barang}
                        </span>
                        <span className="text-xs text-neutral-500 font-mono">
                          {item.inventory?.kode_barcode}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <span className="block text-xs text-neutral-500 mb-1">Qty Kirim</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                            {item.qty_kirim} {item.inventory?.unit || 'pcs'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-neutral-500 mb-1">Qty Terima</span>
                          {isEditable ? (
                            <input
                              type="number"
                              min="0"
                              max={item.qty_kirim}
                              value={receiveState?.qty_terima ?? item.qty_kirim}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceiveItems((prev) =>
                                  prev.map((ri) =>
                                    ri.inventory_id === item.inventory_id
                                      ? { ...ri, qty_terima: val }
                                      : ri,
                                  ),
                                );
                              }}
                              className="w-full max-w-[100px] rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-center font-bold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                            />
                          ) : (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              {item.qty_terima} {item.inventory?.unit || 'pcs'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="block text-xs text-neutral-500 mb-1">Catatan Selisih</span>
                        {isEditable ? (
                          <input
                            type="text"
                            value={receiveState?.catatan ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReceiveItems((prev) =>
                                prev.map((ri) =>
                                  ri.inventory_id === item.inventory_id
                                    ? { ...ri, catatan: val }
                                    : ri,
                                ),
                              );
                            }}
                            placeholder="Tuliskan catatan selisih..."
                            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                          />
                        ) : (
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{item.catatan || '-'}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons (Sticky di Bawah) */}
              <div className="sticky -bottom-4 sm:-bottom-5 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 mt-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex justify-between items-center gap-2">
                <Button
                  variant="secondary"
                  leftIcon={<IconPrinter className="h-4 w-4 sm:mr-1" />}
                  onClick={() => downloadOrShareFile(`/api/export/warehouse/surat-jalan/${selectedTransfer.id}`, `Surat_Jalan_${selectedTransfer.id}.pdf`, 'Surat Jalan')}
                  title="Cetak Surat Jalan (PDF)"
                  className="px-3 sm:px-4"
                >
                  <span className="hidden md:inline">Cetak Surat Jalan (PDF)</span>
                  <span className="hidden sm:inline md:hidden">Cetak PDF</span>
                  <span className="sr-only">Cetak</span>
                </Button>

                <div className="flex gap-2 shrink-0">
                  {selectedTransfer.status === 'DRAFT' && (
                    <Button
                      variant="primary"
                      leftIcon={<IconSend className="h-4 w-4 mr-1.5" />}
                      loading={kirimMutation.isPending}
                      onClick={() => kirimMutation.mutate(selectedTransfer.id)}
                      title="Kirim Barang Sekarang"
                    >
                      <span className="hidden md:inline">Kirim Barang Sekarang</span>
                      <span className="inline md:hidden">Kirim Barang</span>
                    </Button>
                  )}

                  {selectedTransfer.status === 'IN_TRANSIT' && (
                    <Button
                      variant="primary"
                      leftIcon={<IconCheck className="h-4 w-4 mr-1.5" />}
                      loading={terimaMutation.isPending}
                      onClick={() => terimaMutation.mutate()}
                      title="Konfirmasi Penerimaan Fisik"
                    >
                      <span className="hidden md:inline">Konfirmasi Penerimaan Fisik</span>
                      <span className="inline md:hidden">Konfirmasi</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ResponsivePanel>
        )}

        {/* Confirm Dialog Cancel */}
        {cancelTransferId && (
          <ConfirmDialog
            isOpen={!!cancelTransferId}
            onCancel={() => setCancelTransferId(null)}
            onConfirm={() => cancelMutation.mutate(cancelTransferId)}
            title="Batalkan Draft Transfer"
            message="Apakah Anda yakin ingin membatalkan dokumen transfer ini? Data draft akan dihapus dari antrean."
            confirmLabel="Ya, Batalkan"
            cancelLabel="Kembali"
            danger={true}
          />
        )}
      </div>
    </AmbientLayout>
  );

  return (
    <ErrorBoundary>
      {isMobile ? (
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
              <Spinner size="sm" />
            </div>
          }
        >
          {pageContent}
        </PullToRefresh>
      ) : (
        pageContent
      )}
    </ErrorBoundary>
  );
}
