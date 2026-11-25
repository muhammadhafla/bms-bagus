'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { transferStokApi, gudangApi } from '@/lib/api/warehouse';
import { Gudang, TransferStok, StatusTransfer } from '@/types/warehouse';
import { useAuthStore } from '@/lib/auth';
import { useHardwareBarcodeScanner } from '@/hooks/useHardwareBarcodeScanner';
import { playScanSuccessSound, playScanErrorSound } from '@/lib/utils/audio-feedback';
import { getLocalDateString } from '@/lib/utils';
import { queryKeys, invalidateWarehouseMutation } from '@/lib/queryKeys';

export type TransferTabStatus = 'ALL' | 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED';

interface UseWarehouseTransfersParams {
  limit: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useWarehouseTransfers({
  limit,
  searchInputRef,
}: UseWarehouseTransfersParams) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const hasAnyRole = useAuthStore((s) => s.hasAnyRole);

  const userGudangId = profile?.default_gudang_id || '';
  const isRestrictedBranchUser =
    !isAdmin() &&
    !!userGudangId &&
    hasAnyRole(['staff_gudang', 'kepala_gudang', 'kepala_cabang', 'kasir']);
  const canCancelTransfer =
    isAdmin() || hasAnyRole(['kepala_gudang', 'kepala_cabang']);

  const [activeTab, setActiveTab] = useState<TransferTabStatus>(
    (searchParams.get('status') as TransferTabStatus) || 'ALL',
  );
  const [selectedGudangId, setSelectedGudangId] = useState(
    isRestrictedBranchUser ? userGudangId : searchParams.get('gudangId') || '',
  );
  const effectiveGudangId = isRestrictedBranchUser ? userGudangId : selectedGudangId;

  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [dateFilterPreset, setDateFilterPreset] = useState<
    'all' | 'today' | '7days' | '30days' | 'custom'
  >(() => {
    if (searchParams.get('startDate') || searchParams.get('endDate')) return 'custom';
    return 'all';
  });

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(
    searchParams.get('search') || '',
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedTransfer, setSelectedTransfer] = useState<TransferStok | null>(null);
  const [receiveItems, setReceiveItems] = useState<
    Array<{ inventory_id: string; qty_terima: number | string; catatan: string }>
  >([]);
  const [cancelTransferId, setCancelTransferId] = useState<string | null>(null);
  const [destinationWarning, setDestinationWarning] = useState<string | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const { data: gudangListRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });
  const warehouses: Gudang[] = useMemo(
    () => gudangListRes?.data || [],
    [gudangListRes?.data],
  );

  const userAssignedWarehouse = useMemo(() => {
    if (!userGudangId) return null;
    return warehouses.find((g) => g.id === userGudangId) || null;
  }, [warehouses, userGudangId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (activeTab !== 'ALL') params.set('status', activeTab);
    if (!isRestrictedBranchUser && selectedGudangId)
      params.set('gudangId', selectedGudangId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = `${pathname}${queryString ? '?' + queryString : ''}`;

    if (queryString !== searchParams.toString()) {
      router.replace(newUrl, { scroll: false });
    }
  }, [
    debouncedSearch,
    activeTab,
    selectedGudangId,
    startDate,
    endDate,
    page,
    pathname,
    router,
    searchParams,
    isRestrictedBranchUser,
  ]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleOpenDetail = useCallback(
    async (transfer: TransferStok) => {
      const initialItems = (transfer.items || []).map((it) => ({
        inventory_id: it.inventory_id || it.inventory?.id || '',
        qty_terima: it.qty_terima || it.qty_kirim,
        catatan: it.catatan || '',
      }));
      setSelectedTransfer(transfer);
      setReceiveItems(initialItems);

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

      try {
        const res = await transferStokApi.getById(transfer.id);
        if (res.data) {
          setSelectedTransfer(res.data);
          setReceiveItems(
            (res.data.items || []).map((it) => ({
              inventory_id: it.inventory_id || it.inventory?.id || '',
              qty_terima: it.qty_terima || it.qty_kirim,
              catatan: it.catatan || '',
            })),
          );
        }
      } catch (err) {
        console.error('Error fetching latest transfer detail:', err);
      }
    },
    [profile?.default_gudang_id, isAdmin, userAssignedWarehouse?.nama],
  );

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

  const statusFilter =
    activeTab === 'ALL' ? undefined : (activeTab as StatusTransfer);
  const {
    data: transfersRes,
    isLoading: transfersLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'warehouse-transfers',
      statusFilter,
      effectiveGudangId,
      startDate,
      endDate,
      page,
      limit,
      debouncedSearch,
    ],
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

  const transfers = useMemo(
    () => transfersRes?.data?.data || [],
    [transfersRes?.data?.data],
  );
  const totalCount = transfersRes?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const handleBarcodeScanned = useCallback(
    async (scannedText: string) => {
      let candidate = scannedText.trim();
      if (!candidate) return;

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
        const fromCache = transfers.find(
          (t) =>
            t.nomor_transfer.toLowerCase() === candidate.toLowerCase() ||
            t.id.toLowerCase() === candidate.toLowerCase(),
        );

        if (fromCache) {
          const res = await transferStokApi.getById(fromCache.id);
          transferData = res.data;
        } else {
          const resById = await transferStokApi.getById(candidate);
          if (resById.data) {
            transferData = resById.data;
          } else {
            const resSearch = await transferStokApi.getAll({
              search: candidate,
              limit: 1,
            });
            if (resSearch.data?.data && resSearch.data.data.length > 0) {
              const fullRes = await transferStokApi.getById(
                resSearch.data.data[0].id,
              );
              transferData = fullRes.data;
            }
          }
        }

        if (!transferData) {
          playScanErrorSound();
          toast.error(`Surat jalan "${candidate}" tidak ditemukan dalam database.`);
          return;
        }

        setIsCameraScannerOpen(false);

        const defaultGudangId = profile?.default_gudang_id;
        if (
          defaultGudangId &&
          transferData.gudang_tujuan_id &&
          defaultGudangId !== transferData.gudang_tujuan_id
        ) {
          setDestinationWarning(
            `Perhatian: Muatan ini ditujukan ke ${transferData.gudang_tujuan?.nama || 'Gudang Lain'}, bukan gudang tugas utama Anda.`,
          );
        } else {
          setDestinationWarning(null);
        }

        if (transferData.status === 'IN_TRANSIT') {
          playScanSuccessSound();
          handleOpenDetail(transferData);
          toast.success(
            `Surat Jalan ${transferData.nomor_transfer} siap diverifikasi!`,
          );
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
          toast.warning(
            `Surat Jalan ${transferData.nomor_transfer} masih berstatus DRAFT (belum dikirim dari gudang asal).`,
          );
        } else if (transferData.status === 'CANCELED') {
          playScanErrorSound();
          handleOpenDetail(transferData);
          toast.error(
            `Surat Jalan ${transferData.nomor_transfer} telah dibatalkan.`,
          );
        } else {
          playScanSuccessSound();
          handleOpenDetail(transferData);
        }
      } catch (err) {
        console.error('Error handling scanned barcode:', err);
        playScanErrorSound();
        toast.error('Gagal memproses pemindaian surat jalan.');
      }
    },
    [transfers, profile, handleOpenDetail],
  );

  useHardwareBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
  });

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
    queryClient.invalidateQueries({ queryKey: ['warehouse-summary'] });
    toast.success('Data mutasi transfer diperbarui');
  }, [refetch, queryClient]);

  useHotkeys(
    'ctrl+k, cmd+k',
    (e) => {
      e.preventDefault();
      searchInputRef.current?.focus();
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      setSearch('');
      setActiveTab('ALL');
    },
    { enableOnFormTags: true },
  );

  useHotkeys('shift+r', (e) => {
    e.preventDefault();
    handleManualRefresh();
  });

  const applyDatePreset = (preset: 'all' | 'today' | '7days' | '30days') => {
    setDateFilterPreset(preset);
    setPage(1);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = getLocalDateString(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(getLocalDateString(past));
      setEndDate(getLocalDateString(now));
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(getLocalDateString(past));
      setEndDate(getLocalDateString(now));
    }
  };

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

  const kirimMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const res = await transferStokApi.kirim(transferId, user?.id || null);
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Barang berhasil dikirim (Status: IN_TRANSIT)');
      invalidateWarehouseMutation(queryClient);
      setSelectedTransfer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengirim transfer');
    },
  });

  const terimaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTransfer) return;
      const cleanItems = (selectedTransfer.items || []).map((it) => {
        const targetId = it.inventory_id || it.inventory?.id || it.id;
        const rec = receiveItems.find((r) => r.inventory_id === targetId);
        const qtyTerima =
          rec?.qty_terima === '' ? 0 : Number(rec?.qty_terima ?? it.qty_kirim);
        return {
          inventory_id: targetId,
          qty_terima: Math.max(0, qtyTerima),
          catatan: rec?.catatan?.trim() || '',
        };
      });
      const res = await transferStokApi.terima(
        selectedTransfer.id,
        cleanItems,
        user?.id || null,
      );
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success('Penerimaan barang berhasil dikonfirmasi (Status: RECEIVED)');
      invalidateWarehouseMutation(queryClient);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouseOps.transfers });
      setCancelTransferId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal membatalkan transfer');
    },
  });

  const handleTerimaSemuaSempurna = () => {
    if (!selectedTransfer?.items) return;
    setReceiveItems(
      selectedTransfer.items.map((it) => ({
        inventory_id: it.inventory_id || it.inventory?.id || it.id,
        qty_terima: it.qty_kirim,
        catatan: '',
      })),
    );
    toast.success('Kuantitas terima disamakan dengan jumlah kirim');
  };

  const handleConfirmTerima = () => {
    if (!selectedTransfer) return;

    if (isRestrictedBranchUser && selectedTransfer.gudang_tujuan_id !== userGudangId) {
      toast.error(
        'Otoritas Ditolak: Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik barang.',
      );
      return;
    }

    const itemsWithMissingNote = (selectedTransfer.items || []).filter((it) => {
      const targetId = it.inventory_id || it.inventory?.id || it.id;
      const rec = receiveItems.find((r) => r.inventory_id === targetId);
      const qtyTerima =
        rec?.qty_terima === '' ? 0 : Number(rec?.qty_terima ?? it.qty_kirim);
      const catatan = rec?.catatan?.trim() || '';
      return qtyTerima < it.qty_kirim && !catatan;
    });

    if (itemsWithMissingNote.length > 0) {
      const barangNames = itemsWithMissingNote
        .map((it) => it.inventory?.nama_barang)
        .filter(Boolean)
        .join(', ');
      toast.error(
        `Wajib mengisi catatan selisih untuk barang yang kurang: ${barangNames}`,
      );
      return;
    }

    terimaMutation.mutate();
  };

  const activeFilterCount =
    (activeTab !== 'ALL' ? 1 : 0) +
    (selectedGudangId ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  const selectedWarehouseObj = warehouses.find((w) => w.id === selectedGudangId);

  return {
    router,
    userGudangId,
    isRestrictedBranchUser,
    canCancelTransfer,
    activeTab,
    setActiveTab,
    selectedGudangId,
    setSelectedGudangId,
    effectiveGudangId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateFilterPreset,
    setDateFilterPreset,
    search,
    setSearch,
    page,
    setPage,
    isFilterOpen,
    setIsFilterOpen,
    selectedTransfer,
    setSelectedTransfer,
    receiveItems,
    setReceiveItems,
    cancelTransferId,
    setCancelTransferId,
    destinationWarning,
    isCameraScannerOpen,
    setIsCameraScannerOpen,
    warehouses,
    userAssignedWarehouse,
    transfers,
    transfersLoading,
    totalCount,
    totalPages,
    activeFilterCount,
    selectedWarehouseObj,
    handleOpenDetail,
    handleBarcodeScanned,
    handleManualRefresh,
    applyDatePreset,
    handleResetFilters,
    kirimMutation,
    terimaMutation,
    cancelMutation,
    handleTerimaSemuaSempurna,
    handleConfirmTerima,
  };
}
