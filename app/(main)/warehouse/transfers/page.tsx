'use client';

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from 'react';
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
  IconRefresh,
  IconCalendar,
  IconAlertTriangle,
  IconClock,
  IconCircleCheck,
  IconChevronDown,
  IconSparkles,
  IconScan,
} from '@tabler/icons-react';

import {
  AmbientLayout,
  Card,
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
  DateInput,
  SelectInput,
} from '@/components/ui';
import EmptyState from '@/components/ui/EmptyState';

import { transferStokApi, gudangApi } from '@/lib/api/warehouse';
import { TransferStok, StatusTransfer, Gudang } from '@/types/warehouse';
import { useAuthStore } from '@/lib/auth';
import { playScanSuccessSound, playScanErrorSound } from '@/lib/utils/audio-feedback';
import { useHardwareBarcodeScanner } from '@/hooks/useHardwareBarcodeScanner';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
const SuratJalanCameraScannerModal = dynamic(
  () => import('@/components/warehouse/SuratJalanCameraScannerModal'),
  { ssr: false },
);

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
  
  const { user, profile, hasRole, isAdmin } = useAuthStore();
  const isRestrictedBranchUser = !isAdmin() && !!profile?.default_gudang_id;
  const userGudangId = profile?.default_gudang_id || '';
  const canCancelTransfer = isAdmin() || hasRole('kepala_cabang');

  // UI state
  const isMobile = useMediaQuery('(max-width: 768px)');
  const limit = isMobile ? 20 : 50;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState<'ALL' | 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'>(
    (searchParams.get('status') as any) || 'ALL',
  );
  const [selectedGudangId, setSelectedGudangId] = useState(
    isRestrictedBranchUser ? userGudangId : (searchParams.get('gudangId') || '')
  );
  const effectiveGudangId = isRestrictedBranchUser ? userGudangId : selectedGudangId;

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>(() => {
    if (searchParams.get('startDate') || searchParams.get('endDate')) return 'custom';
    return 'all';
  });

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal: Detail / Receive Transfer
  const [selectedTransfer, setSelectedTransfer] = useState<TransferStok | null>(null);
  const [receiveItems, setReceiveItems] = useState<Array<{ inventory_id: string; qty_terima: number; catatan: string }>>([]);

  // Confirm dialog for cancellation
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);

  // Fetch Gudang List for filtering
  const { data: gudangListRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });
  const warehouses: Gudang[] = useMemo(() => gudangListRes?.data || [], [gudangListRes?.data]);

  const userAssignedWarehouse = useMemo(() => {
    if (!userGudangId) return null;
    return warehouses.find((g) => g.id === userGudangId) || null;
  }, [warehouses, userGudangId]);

  // URL synchronization
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (activeTab !== 'ALL') params.set('status', activeTab);
    if (!isRestrictedBranchUser && selectedGudangId) params.set('gudangId', selectedGudangId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? '?' + queryString : ''}`;
    
    if (queryString !== searchParams.toString()) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearch, activeTab, selectedGudangId, startDate, endDate, page, pathname, router, searchParams, isRestrictedBranchUser]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Destination Guard state
  const [destinationWarning, setDestinationWarning] = useState<string | null>(null);

  // Handle direct action from URL or Item Selection
  const handleOpenDetail = useCallback((transfer: TransferStok) => {
    setSelectedTransfer(transfer);
    setReceiveItems(
      (transfer.items || []).map((it) => ({
        inventory_id: it.inventory_id,
        qty_terima: it.qty_terima || it.qty_kirim,
        catatan: it.catatan || '',
      })),
    );

    // Destination Warehouse Guard: Cek apakah user adalah staf dari gudang tujuan
    const targetGudangId = profile?.default_gudang_id;
    if (
      targetGudangId &&
      !isAdmin() &&
      transfer.gudang_tujuan_id &&
      targetGudangId !== transfer.gudang_tujuan_id
    ) {
      setDestinationWarning(
        `Perhatian: Muatan ini ditujukan ke ${transfer.gudang_tujuan?.nama || 'Gudang Lain'}, bukan cabang tugas Anda (${userAssignedWarehouse?.nama || 'Terkunci'}). Anda tidak memiliki wewenang mengonfirmasi penerimaan fisik.`,
      );
    } else {
      setDestinationWarning(null);
    }
  }, [profile?.default_gudang_id, isAdmin, userAssignedWarehouse?.nama]);

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

  // Fetch Data
  const statusFilter = activeTab === 'ALL' ? undefined : (activeTab as StatusTransfer);
  const {
    data: transfersRes,
    isLoading: transfersLoading,
    isFetching: transfersFetching,
    refetch,
  } = useQuery({
    queryKey: ['warehouse-transfers', statusFilter, effectiveGudangId, startDate, endDate, page, limit, debouncedSearch],
    queryFn: () =>
      transferStokApi.getAll({
        status: statusFilter,
        gudangId: effectiveGudangId || undefined,
        startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
        search: debouncedSearch,
        page,
        limit,
      }),
  });

  const transfers = useMemo(() => transfersRes?.data?.data || [], [transfersRes?.data?.data]);
  const totalCount = transfersRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  // Scanner state
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Barcode / QR Code Scan Handler
  const handleBarcodeScanned = useCallback(
    async (scannedText: string) => {
      let candidate = scannedText.trim();
      if (!candidate) return;

      // Extract ID if scanned from QR Code URL (e.g. ?detailId=xxx)
      if (candidate.includes('detailId=')) {
        try {
          const url = new URL(candidate);
          const detailParam = url.searchParams.get('detailId');
          if (detailParam) candidate = detailParam;
        } catch {
          const match = candidate.match(/detailId=([^&]+)/);
          if (match) candidate = match[1];
        }
      }

      toast.info(`Memproses kode: ${candidate}...`);

      try {
        let transferData: TransferStok | null = null;

        // 1. Check local cached page list
        const fromCache = transfers.find(
          (t) =>
            t.nomor_transfer.toLowerCase() === candidate.toLowerCase() ||
            t.id.toLowerCase() === candidate.toLowerCase(),
        );

        if (fromCache) {
          const res = await transferStokApi.getById(fromCache.id);
          transferData = res.data;
        } else {
          // 2. Fetch by ID
          const resById = await transferStokApi.getById(candidate);
          if (resById.data) {
            transferData = resById.data;
          } else {
            // 3. Search by nomor_transfer
            const resSearch = await transferStokApi.getAll({ search: candidate, limit: 1 });
            if (resSearch.data?.data && resSearch.data.data.length > 0) {
              const fullRes = await transferStokApi.getById(resSearch.data.data[0].id);
              transferData = fullRes.data;
            }
          }
        }

        if (!transferData) {
          playScanErrorSound();
          toast.error(`Surat jalan "${candidate}" tidak ditemukan dalam database.`);
          return;
        }

        // Close camera scanner modal if open
        setIsCameraScannerOpen(false);

        // Destination Warehouse Guard: Cek kecocokan gudang tujuan dengan gudang tugas staf
        const userGudangId = profile?.default_gudang_id;
        if (
          userGudangId &&
          transferData.gudang_tujuan_id &&
          userGudangId !== transferData.gudang_tujuan_id
        ) {
          setDestinationWarning(
            `Perhatian: Muatan ini ditujukan ke ${transferData.gudang_tujuan?.nama || 'Gudang Lain'}, bukan gudang tugas utama Anda.`,
          );
        } else {
          setDestinationWarning(null);
        }

        // Status Validation & Audio Feedback
        if (transferData.status === 'IN_TRANSIT') {
          playScanSuccessSound();
          handleOpenDetail(transferData);
          toast.success(`Surat Jalan ${transferData.nomor_transfer} siap diverifikasi!`);
        } else if (transferData.status === 'RECEIVED') {
          playScanErrorSound();
          handleOpenDetail(transferData);
          toast.warning(
            `Dokumen ini sudah selesai diterima pada ${new Date(
              transferData.tanggal_terima || transferData.updated_at,
            ).toLocaleDateString('id-ID')} oleh ${
              transferData.received_by_profile?.nama || 'Staf Penerima'
            }.`,
          );
        } else if (transferData.status === 'DRAFT') {
          playScanErrorSound();
          handleOpenDetail(transferData);
          toast.warning(`Surat Jalan ${transferData.nomor_transfer} masih berstatus DRAFT (belum dikirim dari gudang asal).`);
        } else if (transferData.status === 'CANCELED') {
          playScanErrorSound();
          handleOpenDetail(transferData);
          toast.error(`Surat Jalan ${transferData.nomor_transfer} telah dibatalkan.`);
        } else {
          playScanSuccessSound();
          handleOpenDetail(transferData);
        }
      } catch (err: any) {
        console.error('Error handling scanned barcode:', err);
        playScanErrorSound();
        toast.error('Gagal memproses pemindaian surat jalan.');
      }
    },
    [transfers, profile, handleOpenDetail],
  );

  // Hook Barcode Scanner Fisik (USB / Bluetooth)
  useHardwareBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
  });

  // Manual Refresh Handler
  const handleManualRefresh = useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
    toast.success('Data mutasi transfer diperbarui');
  }, [refetch, queryClient]);

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

  useHotkeys('shift+r', (e) => {
    e.preventDefault();
    handleManualRefresh();
  });

  // Date Presets Handler
  const applyDatePreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    setDateFilterPreset(preset);
    setPage(1);
    const now = new Date();
    const format = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = format(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(format(past));
      setEndDate(format(now));
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(format(past));
      setEndDate(format(now));
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setActiveTab('ALL');
    setSelectedGudangId('');
    setStartDate('');
    setEndDate('');
    setDateFilterPreset('all');
    setSearch('');
    setPage(1);
    setIsFilterOpen(false);
  };

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

  // Action: Terima Semua Sesuai Qty Kirim
  const handleTerimaSemuaSempurna = () => {
    if (!selectedTransfer?.items) return;
    setReceiveItems(
      selectedTransfer.items.map((it) => ({
        inventory_id: it.inventory_id,
        qty_terima: it.qty_kirim,
        catatan: '',
      })),
    );
    toast.success('Kuantitas terima disamakan dengan jumlah kirim');
  };

  // Action: Validasi & Konfirmasi Penerimaan
  const handleConfirmTerima = () => {
    if (!selectedTransfer) return;

    // RBAC Guard: Hanya staf gudang tujuan atau Admin yang boleh mengonfirmasi
    if (isRestrictedBranchUser && selectedTransfer.gudang_tujuan_id !== userGudangId) {
      toast.error('Otoritas Ditolak: Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik barang.');
      return;
    }

    // Cek apakah ada barang yang selisih (qty terima < qty kirim) namun catatan kosong
    const itemsWithMissingNote = (selectedTransfer.items || []).filter((it) => {
      const rec = receiveItems.find((r) => r.inventory_id === it.inventory_id);
      const qtyTerima = rec?.qty_terima ?? it.qty_kirim;
      const catatan = rec?.catatan?.trim() || '';
      return qtyTerima < it.qty_kirim && !catatan;
    });

    if (itemsWithMissingNote.length > 0) {
      const barangNames = itemsWithMissingNote
        .map((it) => it.inventory?.nama_barang)
        .filter(Boolean)
        .join(', ');
      toast.error(`Wajib mengisi catatan selisih untuk barang yang kurang: ${barangNames}`);
      return;
    }

    terimaMutation.mutate();
  };

  // Status Badge Configuration & Indonesian Localization
  const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'info' | 'success' | 'danger' | 'default'; icon: any }> = {
    DRAFT: { label: 'Draft', variant: 'default', icon: IconFileText },
    REQUESTED: { label: 'Diajukan', variant: 'warning', icon: IconClock },
    APPROVED: { label: 'Disetujui', variant: 'info', icon: IconCheck },
    IN_TRANSIT: { label: 'Dalam Pengiriman', variant: 'warning', icon: IconTruckDelivery },
    RECEIVED: { label: 'Selesai Diterima', variant: 'success', icon: IconCircleCheck },
    CANCELED: { label: 'Dibatalkan', variant: 'danger', icon: IconX },
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, variant: 'default', icon: IconFileText };
    const IconComponent = config.icon;
    return (
      <Badge variant={config.variant} size="sm" className="inline-flex items-center gap-1">
        <IconComponent size={12} stroke={2} />
        <span>{config.label}</span>
      </Badge>
    );
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
      render: (row) => renderStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<IconPrinter className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />}
            onClick={(e) => {
              e.stopPropagation();
              downloadOrShareFile(`/api/export/warehouse/surat-jalan/${row.id}`, `Surat_Jalan_${row.id}.pdf`, 'Surat Jalan');
            }}
            title="Cetak Surat Jalan (PDF)"
            aria-label={`Cetak Surat Jalan ${row.nomor_transfer}`}
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
              title="Batalkan Dokumen Transfer"
              aria-label={`Batalkan Dokumen Transfer ${row.nomor_transfer}`}
            />
          )}
        </div>
      ),
    },
  ];

  // Active filter count calculation
  const activeFilterCount =
    (activeTab !== 'ALL' ? 1 : 0) +
    (selectedGudangId ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  const selectedWarehouseObj = warehouses.find((w) => w.id === selectedGudangId);

  const pageContent = (
    <AmbientLayout>
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
          <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
            <IconTruckDelivery className="text-brand-600 dark:text-brand-400 h-6 w-6 shrink-0 lg:h-8 lg:w-8" stroke={1.5} />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                Mutasi & Transfer Stok
              </h1>
              <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                Distribusi stok fisik antar cabang, pelacakan in-transit, dan verifikasi penerimaan.
              </p>
            </div>
          </div>

          <div className="animate-fade-in-up hidden sm:flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => router.push('/warehouse/transfers/new')}
              className="h-10 sm:h-auto whitespace-nowrap"
            >
              Transfer Baru
            </Button>
          </div>
        </div>

        {/* Search, Warehouse Quick Selector & Filter Section */}
        <div className="flex flex-col gap-3">
          <div className="animate-fade-in-up flex w-full flex-row items-center gap-2" style={{ animationDelay: '50ms' }}>
            {/* Search Input dengan Tombol Scan Terintegrasi */}
            <div className="relative flex-1">
              <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                <IconSearch size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari transfer / kurir... (Ctrl+K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 w-full h-10 sm:h-[46px] rounded-xl border border-neutral-200/60 bg-white pr-24 pl-9 text-sm shadow-sm transition-all focus:outline-none sm:pr-28 sm:text-base dark:border-neutral-800/60 dark:bg-neutral-900"
              />
              
              {/* Right Action Icons in Search Bar */}
              <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1">
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      searchInputRef.current?.focus();
                    }}
                    aria-label="Hapus teks pencarian"
                    className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-800"
                  >
                    <IconX size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  title="Pindai barcode surat jalan via kamera"
                  aria-label="Pindai barcode surat jalan via kamera"
                  className="flex items-center gap-1 rounded-lg bg-brand-50 hover:bg-brand-100 border border-brand-200/80 px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-bold text-brand-700 active:scale-95 transition-all dark:bg-brand-950/60 dark:border-brand-800 dark:text-brand-300"
                >
                  <IconScan size={16} className="text-brand-600 dark:text-brand-400" />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            {/* Desktop Warehouse Quick Selector / Assigned Branch Badge */}
            {isRestrictedBranchUser ? (
              <div
                className="hidden lg:flex items-center gap-2 px-3.5 h-[46px] rounded-xl border border-neutral-200/80 bg-neutral-50/90 dark:border-neutral-800 dark:bg-neutral-900/60 shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm"
                title={userAssignedWarehouse?.nama || 'Cabang Penugasan'}
              >
                <IconBuildingWarehouse size={16} className="text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="truncate max-w-[200px]">
                  Cabang: {userAssignedWarehouse?.nama || 'Terkunci'}
                </span>
              </div>
            ) : (
              <div className="hidden lg:block w-64 shrink-0">
                <div className="relative">
                  <select
                    value={selectedGudangId}
                    onChange={(e) => {
                      setSelectedGudangId(e.target.value);
                      setPage(1);
                    }}
                    aria-label="Pilih filter gudang"
                    className="w-full appearance-none rounded-xl border border-neutral-200/60 bg-white py-3 pr-8 pl-9 text-xs font-semibold text-neutral-800 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800/60 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    <option value="">Semua Gudang (Cabang/Pusat)</option>
                    {warehouses.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} ({g.kode_gudang})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <IconBuildingWarehouse size={16} />
                  </div>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <IconChevronDown size={14} />
                  </div>
                </div>
              </div>
            )}
            
            {/* Filter Drawer Trigger */}
            <FilterButton
              onClick={() => setIsFilterOpen(true)}
              activeCount={activeFilterCount}
              className="!mt-0 !mr-0 !h-10 !w-10 sm:!h-[46px] sm:!w-auto"
            />

            {/* Mobile Transfer Baru Button (Dinamis: Icon-only di layar sempit, Icon+Teks di layar lebih lega) */}
            <Button
              variant="primary"
              onClick={() => router.push('/warehouse/transfers/new')}
              title="Transfer Baru"
              aria-label="Buat Transfer Baru"
              className="sm:hidden relative flex !h-10 !w-10 min-[400px]:!w-auto !min-h-0 shrink-0 items-center justify-center rounded-xl !p-0 min-[400px]:!px-3.5"
            >
              <IconPlus size={18} className="shrink-0" />
              <span className="hidden min-[400px]:inline ml-1 text-xs font-semibold whitespace-nowrap">
                Baru
              </span>
            </Button>
          </div>

          {/* Active Filter Chips */}
          {(activeFilterCount > 0 || search) && (
            <div className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap" style={{ animationDelay: '100ms' }}>
              {activeTab !== 'ALL' && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200/60 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:border-brand-800 dark:text-brand-300">
                  Status: {STATUS_CONFIG[activeTab]?.label || activeTab}
                  <button
                    onClick={() => setActiveTab('ALL')}
                    aria-label="Hapus filter status"
                    className="text-brand-400 transition-colors hover:text-brand-600 dark:hover:text-brand-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}
              {effectiveGudangId && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300">
                  Gudang: {selectedWarehouseObj?.nama || userAssignedWarehouse?.nama || 'Terpilih'}
                  {!isRestrictedBranchUser && (
                    <button
                      onClick={() => setSelectedGudangId('')}
                      aria-label="Hapus filter gudang"
                      className="text-blue-400 transition-colors hover:text-blue-600 dark:hover:text-blue-200"
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>
              )}
              {(startDate || endDate) && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/60 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300">
                  Tanggal: {startDate || '...'} s/d {endDate || '...'}
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setDateFilterPreset('all');
                    }}
                    aria-label="Hapus filter tanggal"
                    className="text-amber-400 transition-colors hover:text-amber-600 dark:hover:text-amber-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}
              {search && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Pencarian: &quot;{search}&quot;
                  <button
                    onClick={() => setSearch('')}
                    aria-label="Hapus pencarian aktif"
                    className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              )}
              <button
                onClick={handleResetFilters}
                className="text-xs text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200 ml-1"
              >
                Reset Semua
              </button>
            </div>
          )}
        </div>

        {/* Status Tabs */}
        <div className="hidden sm:block">
          <Tabs
            activeId={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as any);
              setPage(1);
            }}
            items={[
              { id: 'ALL', label: 'Semua Status', icon: <IconList className="h-4 w-4" /> },
              { id: 'IN_TRANSIT', label: 'Dalam Pengiriman', icon: <IconTruckDelivery className="h-4 w-4" /> },
              { id: 'DRAFT', label: 'Draft', icon: <IconFileText className="h-4 w-4" /> },
              { id: 'RECEIVED', label: 'Selesai Diterima', icon: <IconCheck className="h-4 w-4" /> },
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
                  <EmptyState
                    title="Tidak ada transaksi transfer stok"
                    description={
                      activeFilterCount > 0 || search
                        ? 'Tidak ada dokumen mutasi yang cocok dengan filter atau pencarian Anda.'
                        : 'Belum ada riwayat dokumen mutasi transfer stok antar cabang.'
                    }
                    illustration={
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                        <IconTruckDelivery size={32} stroke={1.5} />
                      </div>
                    }
                    action={
                      activeFilterCount > 0 || search
                        ? {
                            label: 'Reset Filter',
                            onClick: handleResetFilters,
                            variant: 'secondary',
                          }
                        : {
                            label: 'Buat Transfer Baru',
                            onClick: () => router.push('/warehouse/transfers/new'),
                            variant: 'primary',
                          }
                    }
                  />
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
              <EmptyState
                title="Tidak ada transfer ditemukan"
                description={
                  activeFilterCount > 0 || search
                    ? 'Coba sesuaikan filter atau kata kunci pencarian Anda.'
                    : 'Belum ada transaksi transfer stok tercatat.'
                }
                illustration={
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                    <IconTruckDelivery size={32} stroke={1.5} />
                  </div>
                }
                action={
                  activeFilterCount > 0 || search
                    ? {
                        label: 'Reset Filter',
                        onClick: handleResetFilters,
                        variant: 'secondary',
                      }
                    : {
                        label: 'Transfer Baru',
                        onClick: () => router.push('/warehouse/transfers/new'),
                        variant: 'primary',
                      }
                }
              />
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
                        {renderStatusBadge(row.status)}
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

        {/* Filter Slide-over Panel */}
        <ResponsivePanel
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filter Dokumen Transfer"
        >
          <div className="space-y-6">
            {/* Filter Status */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Status Transfer
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'IN_TRANSIT', label: 'Dalam Pengiriman' },
                  { id: 'DRAFT', label: 'Draft / Permintaan' },
                  { id: 'RECEIVED', label: 'Selesai Diterima' },
                  { id: 'CANCELED', label: 'Dibatalkan' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveTab(st.id as any)}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      activeTab === st.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-900/20 dark:text-brand-300'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                    }`}
                  >
                    <span className="font-medium text-xs sm:text-sm">{st.label}</span>
                    {activeTab === st.id && <IconCheck size={16} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Gudang */}
            <div className="flex flex-col gap-2">
              <label htmlFor="filter-gudang-select" className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Gudang Cabang Penugasan
              </label>
              {isRestrictedBranchUser ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
                  <IconBuildingWarehouse size={18} className="text-brand-600 dark:text-brand-400 shrink-0" />
                  <div>
                    <div className="font-bold">{userAssignedWarehouse?.nama || 'Cabang Tugas'}</div>
                    <div className="text-[11px] text-neutral-500 font-normal">Data mutasi otomatis dibatasi hanya untuk transfer masuk & keluar cabang ini.</div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="filter-gudang-select"
                    value={selectedGudangId}
                    onChange={(e) => setSelectedGudangId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-neutral-200/80 bg-white py-2.5 pr-8 pl-9 text-xs sm:text-sm font-medium text-neutral-800 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    <option value="">Semua Gudang</option>
                    {warehouses.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nama} ({g.kode_gudang})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <IconBuildingWarehouse size={16} />
                  </div>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    <IconChevronDown size={14} />
                  </div>
                </div>
              )}
            </div>

            {/* Filter Rentang Tanggal */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Rentang Tanggal Pembuatan / Kirim
              </label>

              {/* Presets */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'Semua Waktu' },
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7days', label: '7 Hari Terakhir' },
                  { id: '30days', label: '30 Hari Terakhir' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyDatePreset(preset.id as any)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium text-center transition-all ${
                      dateFilterPreset === preset.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-900/20 dark:text-brand-300'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <DateInput
                    label="Dari Tanggal"
                    value={startDate}
                    onChange={(val) => {
                      setStartDate(val);
                      setDateFilterPreset('custom');
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <DateInput
                    label="Sampai Tanggal"
                    value={endDate}
                    onChange={(val) => {
                      setEndDate(val);
                      setDateFilterPreset('custom');
                    }}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>
            </div>
            
            {/* Action Buttons in Drawer */}
            <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <Button
                variant="secondary"
                className="w-1/2"
                onClick={handleResetFilters}
              >
                Reset Filter
              </Button>
              <Button
                variant="primary"
                className="w-1/2"
                onClick={() => {
                  setPage(1);
                  setIsFilterOpen(false);
                }}
              >
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
              {/* Destination Warehouse Guard Warning */}
              {destinationWarning && (
                <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-800 dark:text-amber-200 text-xs animate-fade-in">
                  <IconAlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium">{destinationWarning}</span>
                </div>
              )}

              {/* Status Milestone Timeline */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-neutral-100/70 dark:bg-neutral-900/70 p-3 border border-neutral-200/50 dark:border-neutral-800/50">
                {/* Step 1: Draft */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      selectedTransfer.status === 'CANCELED'
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                        : 'bg-brand-600 text-white'
                    }`}
                  >
                    1
                  </div>
                  <span className="mt-1 font-semibold text-neutral-900 dark:text-white text-xs">
                    Draft Dibuat
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {selectedTransfer.created_at
                      ? new Date(selectedTransfer.created_at).toLocaleDateString('id-ID')
                      : '-'}
                  </span>
                </div>

                {/* Step 2: In Transit */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      ['IN_TRANSIT', 'RECEIVED'].includes(selectedTransfer.status)
                        ? 'bg-amber-500 text-white'
                        : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800'
                    }`}
                  >
                    2
                  </div>
                  <span className="mt-1 font-semibold text-neutral-900 dark:text-white text-xs">
                    Pengiriman
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {selectedTransfer.tanggal_kirim
                      ? new Date(selectedTransfer.tanggal_kirim).toLocaleDateString('id-ID')
                      : 'Menunggu Kirim'}
                  </span>
                </div>

                {/* Step 3: Received */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      selectedTransfer.status === 'RECEIVED'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800'
                    }`}
                  >
                    3
                  </div>
                  <span className="mt-1 font-semibold text-neutral-900 dark:text-white text-xs">
                    Selesai Diterima
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {selectedTransfer.tanggal_terima
                      ? new Date(selectedTransfer.tanggal_terima).toLocaleDateString('id-ID')
                      : 'Menunggu Fisik'}
                  </span>
                </div>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 text-xs border border-neutral-100 dark:border-neutral-800">
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
                  <div className="mt-0.5">{renderStatusBadge(selectedTransfer.status)}</div>
                </div>
                <div>
                  <span className="text-neutral-500 block">Kurir / Pengantar:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.kurir_pengirim || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Waktu Kirim:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.tanggal_kirim
                      ? new Date(selectedTransfer.tanggal_kirim).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Waktu Terima:</span>
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {selectedTransfer.tanggal_terima
                      ? new Date(selectedTransfer.tanggal_terima).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Quick Action: Terima Semua Sesuai Kirim (Saat IN_TRANSIT) */}
              {selectedTransfer.status === 'IN_TRANSIT' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-brand-50 border border-brand-200/80 p-3.5 dark:bg-brand-950/30 dark:border-brand-800/60 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
                      <IconSparkles size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-950 dark:text-brand-100">
                        Verifikasi Muatan Fisik
                      </p>
                      <p className="text-[11px] text-brand-700/80 dark:text-brand-300/80 leading-tight">
                        Pastikan jumlah barang fisik sesuai surat jalan sebelum konfirmasi.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleTerimaSemuaSempurna}
                    leftIcon={<IconCheck size={15} />}
                    className="w-full sm:w-auto shrink-0 text-xs py-2.5 sm:py-2 font-bold shadow-sm"
                  >
                    Terima Semua Sempurna
                  </Button>
                </div>
              )}

              {/* Items Checklist - Desktop Table */}
              <div className="hidden sm:block border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-xs min-w-[500px]">
                  <thead className="bg-neutral-100/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold">
                    <tr>
                      <th className="px-3 py-2.5 text-left">Nama Barang</th>
                      <th className="px-3 py-2.5 text-center w-24">Qty Kirim</th>
                      <th className="px-3 py-2.5 text-center w-32">Qty Terima</th>
                      <th className="px-3 py-2.5 text-left">Catatan Selisih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {(selectedTransfer.items || []).map((item) => {
                      const isEditable = selectedTransfer.status === 'IN_TRANSIT';
                      const receiveState = receiveItems.find(
                        (ri) => ri.inventory_id === item.inventory_id,
                      );
                      const currentQtyTerima = receiveState?.qty_terima ?? item.qty_kirim;
                      const hasSelisih = currentQtyTerima < item.qty_kirim;

                      return (
                        <tr
                          key={item.id}
                          className={hasSelisih ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                        >
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-neutral-900 dark:text-white block">
                              {item.inventory?.nama_barang}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              {item.inventory?.kode_barcode}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-neutral-800 dark:text-neutral-200">
                            {item.qty_kirim} {item.inventory?.unit || 'pcs'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isEditable ? (
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.qty_kirim}
                                  value={currentQtyTerima}
                                  aria-label={`Jumlah terima ${item.inventory?.nama_barang || ''}`}
                                  onChange={(e) => {
                                    const parsed = parseInt(e.target.value) || 0;
                                    const clamped = Math.min(item.qty_kirim, Math.max(0, parsed));
                                    setReceiveItems((prev) =>
                                      prev.map((ri) =>
                                        ri.inventory_id === item.inventory_id
                                          ? { ...ri, qty_terima: clamped }
                                          : ri,
                                      ),
                                    );
                                  }}
                                  className={`w-20 rounded-lg border px-2 py-1.5 text-center font-bold text-neutral-900 transition-all dark:bg-neutral-800 dark:text-white ${
                                    hasSelisih
                                      ? 'border-amber-400 bg-amber-50/80 text-amber-900 dark:border-amber-600 dark:text-amber-200'
                                      : 'border-neutral-300 bg-white dark:border-neutral-700'
                                  }`}
                                />
                                {hasSelisih && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                    <IconAlertTriangle size={11} /> Selisih -{item.qty_kirim - currentQtyTerima}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.qty_terima} {item.inventory?.unit || 'pcs'}
                                </span>
                                {item.qty_terima < item.qty_kirim && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                    (Selisih -{item.qty_kirim - item.qty_terima})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {isEditable ? (
                              <div>
                                <input
                                  type="text"
                                  value={receiveState?.catatan ?? ''}
                                  aria-label={`Catatan selisih ${item.inventory?.nama_barang || ''}`}
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
                                  placeholder={
                                    hasSelisih
                                      ? 'Wajib: Keterangan barang kurang/rusak...'
                                      : 'Catatan opsional...'
                                  }
                                  className={`w-full min-w-[150px] rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                                    hasSelisih && !receiveState?.catatan?.trim()
                                      ? 'border-amber-400 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-950/20'
                                      : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                                  }`}
                                />
                              </div>
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
                  const currentQtyTerima = receiveState?.qty_terima ?? item.qty_kirim;
                  const hasSelisih = currentQtyTerima < item.qty_kirim;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-3 shadow-sm transition-all ${
                        hasSelisih
                          ? 'border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                          : 'border-neutral-200/80 bg-white dark:border-neutral-800/80 dark:bg-neutral-900'
                      }`}
                    >
                      <div className="mb-2 border-b border-neutral-100 pb-2 dark:border-neutral-800 flex items-start justify-between">
                        <div>
                          <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
                            {item.inventory?.nama_barang}
                          </span>
                          <span className="text-xs text-neutral-500 font-mono">
                            {item.inventory?.kode_barcode}
                          </span>
                        </div>
                        {hasSelisih && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <IconAlertTriangle size={11} /> -{item.qty_kirim - currentQtyTerima} pcs
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                        <div className="flex flex-col justify-center rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-2.5 border border-neutral-100 dark:border-neutral-800">
                          <span className="block text-[11px] text-neutral-500 font-medium">Qty Kirim</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm mt-0.5">
                            {item.qty_kirim} <span className="text-xs font-normal text-neutral-500">{item.inventory?.unit || 'pcs'}</span>
                          </span>
                        </div>
                        <div className="flex flex-col justify-center rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-2.5 border border-neutral-100 dark:border-neutral-800">
                          <div className="flex items-center justify-between">
                            <span className="block text-[11px] text-neutral-500 font-medium">Qty Terima</span>
                            {isEditable && currentQtyTerima < item.qty_kirim && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiveItems((prev) =>
                                    prev.map((ri) =>
                                      ri.inventory_id === item.inventory_id
                                        ? { ...ri, qty_terima: item.qty_kirim }
                                        : ri,
                                    ),
                                  );
                                }}
                                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                              >
                                Samakan
                              </button>
                            )}
                          </div>
                          {isEditable ? (
                            <input
                              type="number"
                              min="0"
                              max={item.qty_kirim}
                              value={currentQtyTerima}
                              aria-label={`Jumlah terima ${item.inventory?.nama_barang || ''}`}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value) || 0;
                                const clamped = Math.min(item.qty_kirim, Math.max(0, parsed));
                                setReceiveItems((prev) =>
                                  prev.map((ri) =>
                                    ri.inventory_id === item.inventory_id
                                      ? { ...ri, qty_terima: clamped }
                                      : ri,
                                  ),
                                );
                              }}
                              className={`w-full mt-1 rounded-lg border py-1 px-2 text-center text-sm font-bold text-neutral-900 transition-all dark:text-white ${
                                hasSelisih
                                  ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200'
                                  : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                              }`}
                            />
                          ) : (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                              {item.qty_terima} <span className="text-xs font-normal text-neutral-500">{item.inventory?.unit || 'pcs'}</span>
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
                            aria-label={`Catatan selisih ${item.inventory?.nama_barang || ''}`}
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
                              placeholder={
                                hasSelisih
                                  ? 'Wajib diisi keterangan selisih...'
                                  : 'Tuliskan catatan selisih jika ada...'
                              }
                              className={`w-full rounded-lg border px-3 py-1.5 text-xs transition-all ${
                                hasSelisih && !receiveState?.catatan?.trim()
                                  ? 'border-amber-400 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-950/20'
                                  : 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'
                              }`}
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
              {(() => {
                const itemsWithSelisih = (selectedTransfer.items || []).filter((it) => {
                  const rec = receiveItems.find((r) => r.inventory_id === it.inventory_id);
                  const currentQty = rec?.qty_terima ?? it.qty_kirim;
                  return currentQty < it.qty_kirim;
                });
                const totalSelisihQty = (selectedTransfer.items || []).reduce((acc, it) => {
                  const rec = receiveItems.find((r) => r.inventory_id === it.inventory_id);
                  const currentQty = rec?.qty_terima ?? it.qty_kirim;
                  return acc + (it.qty_kirim - currentQty);
                }, 0);

                return (
                  <div className="sticky -bottom-4 sm:-bottom-5 -mx-4 sm:-mx-5 px-4 sm:px-5 pb-4 sm:pb-5 pt-3 mt-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col gap-2 shadow-lg sm:shadow-none">
                    {selectedTransfer.status === 'IN_TRANSIT' && itemsWithSelisih.length > 0 && (
                      <div className="flex sm:hidden items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <IconAlertTriangle size={13} className="shrink-0" />
                          <span>Ada selisih {itemsWithSelisih.length} barang</span>
                        </span>
                        <span className="bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          -{totalSelisihQty} pcs
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center gap-2">
                      <Button
                        variant="secondary"
                        leftIcon={<IconPrinter className="h-4 w-4 sm:mr-1" />}
                        onClick={() =>
                          downloadOrShareFile(
                            `/api/export/warehouse/surat-jalan/${selectedTransfer.id}`,
                            `Surat_Jalan_${selectedTransfer.id}.pdf`,
                            'Surat Jalan',
                          )
                        }
                        title="Cetak Surat Jalan (PDF)"
                        aria-label="Cetak Surat Jalan PDF"
                        className="px-3 sm:px-4 shrink-0"
                      >
                        <span className="hidden md:inline">Cetak Surat Jalan (PDF)</span>
                        <span className="hidden sm:inline md:hidden">Cetak PDF</span>
                        <span className="inline sm:hidden text-xs">PDF</span>
                      </Button>

                      <div className="flex items-center gap-2 shrink-0">
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

                        {selectedTransfer.status === 'IN_TRANSIT' && (() => {
                          const isUserDestinationStaff = isAdmin() || (
                            !!userGudangId && selectedTransfer.gudang_tujuan_id === userGudangId
                          );

                          return (
                            <>
                              {itemsWithSelisih.length > 0 && (
                                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                  <IconAlertTriangle size={13} />
                                  <span>Selisih -{totalSelisihQty} pcs ({itemsWithSelisih.length} jenis)</span>
                                </div>
                              )}
                              <Button
                                variant="primary"
                                leftIcon={<IconCheck className="h-4 w-4 mr-1.5" />}
                                loading={terimaMutation.isPending}
                                disabled={!isUserDestinationStaff || terimaMutation.isPending}
                                onClick={handleConfirmTerima}
                                title={
                                  !isUserDestinationStaff
                                    ? 'Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik'
                                    : 'Konfirmasi Penerimaan Fisik'
                                }
                              >
                                <span className="hidden md:inline">Konfirmasi Penerimaan Fisik</span>
                                <span className="inline md:hidden">Konfirmasi</span>
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}
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
            isLoading={cancelMutation.isPending}
          />
        )}

        {/* Modal Scanner Kamera untuk Surat Jalan */}
        <SuratJalanCameraScannerModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScanSuccess={handleBarcodeScanned}
        />
      </div>
    </AmbientLayout>
  );

  return (
    <ErrorBoundary>
      <PullToRefresh
        onRefresh={handleManualRefresh}
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
    </ErrorBoundary>
  );
}
