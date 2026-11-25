'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useHotkeys } from 'react-hotkeys-hook';
import { InventoryItem, InventoryDeletionCheck } from '@/types/inventory';
import { InventoryStock } from '@/types/warehouse';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { warehouseStockApi } from '@/lib/api/warehouse';
import { useAuthStore, useIsAdmin } from '@/lib/auth';

export interface InventoryEditForm {
  nama_barang: string;
  kode_barcode: string;
  id_kategori: string;
  harga_beli_terakhir: number;
  harga_jual: number;
  diskon: number;
  minimum_stock: number;
}

export interface InventoryPaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

interface UseInventoryTableStateParams {
  items: InventoryItem[];
  onUpdate: (id: string, data: Partial<InventoryItem>) => void;
  onDelete?: (id: string) => Promise<boolean | void> | void;
  onRefresh?: () => void;
}

export function useInventoryTableState({
  items,
  onUpdate,
  onDelete,
  onRefresh,
}: UseInventoryTableStateParams) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSnoozing, setIsBulkSnoozing] = useState(false);
  const [showBulkSnoozeOpts, setShowBulkSnoozeOpts] = useState(false);
  const bulkSnoozeRef = useRef<HTMLDivElement>(null);

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [editForm, setEditForm] = useState<InventoryEditForm>({
    nama_barang: '',
    kode_barcode: '',
    id_kategori: '',
    harga_beli_terakhir: 0,
    harga_jual: 0,
    diskon: 0,
    minimum_stock: 0,
  });

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSourceItems, setMergeSourceItems] = useState<InventoryItem[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [deletionBlockedInfo, setDeletionBlockedInfo] =
    useState<InventoryDeletionCheck | null>(null);
  const [discontinueConfirm, setDiscontinueConfirm] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [warehouseStocks, setWarehouseStocks] = useState<InventoryStock[]>([]);
  const [loadingWarehouseStocks, setLoadingWarehouseStocks] = useState(false);

  const isAdminUser = useIsAdmin();
  const hasRole = useAuthStore((state) => state.hasRole);
  const canViewHPP = isAdminUser || hasRole('finance');
  const canEdit = isAdminUser || hasRole('kepala_cabang');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        bulkSnoozeRef.current &&
        !bulkSnoozeRef.current.contains(event.target as Node)
      ) {
        setShowBulkSnoozeOpts(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBulkSnooze = useCallback(
    async (days: number) => {
      if (selectedIds.size === 0) return;
      setIsBulkSnoozing(true);
      try {
        const idsArray = Array.from(selectedIds);
        await inventoryApi.snoozeLowStockBulk(idsArray, days);
        toast.success(`${idsArray.length} barang berhasil di-snooze`);
        setSelectedIds(new Set());
        onRefresh?.();
      } catch {
        toast.error('Gagal melakukan snooze massal');
      } finally {
        setIsBulkSnoozing(false);
        setShowBulkSnoozeOpts(false);
      }
    },
    [selectedIds, onRefresh],
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openSlideOver = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      nama_barang: item.nama_barang || '',
      kode_barcode: item.kode_barcode || '',
      id_kategori:
        typeof item.id_kategori === 'object'
          ? item.id_kategori?.nama || ''
          : item.id_kategori || '',
      harga_beli_terakhir: item.harga_beli_terakhir || 0,
      harga_jual: item.harga_jual || 0,
      diskon: item.diskon || 0,
      minimum_stock: item.minimum_stock || 0,
    });
    setIsSlideOverOpen(true);
    setLoadingWarehouseStocks(true);
    warehouseStockApi
      .getStockByItem(item.id)
      .then((res) => {
        setWarehouseStocks(res.data || []);
        setLoadingWarehouseStocks(false);
      })
      .catch(() => {
        setWarehouseStocks([]);
        setLoadingWarehouseStocks(false);
      });
  }, []);

  const closeSlideOver = useCallback(() => {
    setIsSlideOverOpen(false);
    setSelectedItem(null);
    setWarehouseStocks([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;

    let id_kategori: string | undefined;
    if (editForm.id_kategori) {
      const kategoriResult = await kategoriApi.getByName(editForm.id_kategori);
      id_kategori = kategoriResult.data?.id;
    }

    const updateData: Record<string, unknown> = {
      nama_barang: editForm.nama_barang,
      kode_barcode: editForm.kode_barcode,
      ...(id_kategori && { id_kategori }),
      harga_beli_terakhir: editForm.harga_beli_terakhir,
      harga_jual: editForm.harga_jual,
      diskon: editForm.diskon,
      minimum_stock: editForm.minimum_stock,
    };

    const result = await inventoryApi.update(selectedItem.id, updateData);
    if (!result.error && result.data) {
      const updatedItem = {
        ...result.data,
        id_kategori: result.data.id_kategori || result.data.kategori,
      };
      onUpdate(selectedItem.id, updatedItem);
      toast.success('Perubahan disimpan');
    } else {
      toast.error('Gagal menyimpan perubahan');
    }
    closeSlideOver();
  }, [selectedItem, editForm, onUpdate, closeSlideOver]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem || !onDelete) return;

    const res = await onDelete(selectedItem.id);
    if (res !== false) {
      setDeleteConfirm(false);
      closeSlideOver();
    }
  }, [selectedItem, onDelete, closeSlideOver]);

  const handlePromptDelete = useCallback(async () => {
    if (!selectedItem) return;
    setIsCheckingDelete(true);
    try {
      const res = await inventoryApi.checkCanDelete(selectedItem.id);
      if (res.error || !res.data) {
        toast.error(res.error?.message || 'Gagal memeriksa kelayakan hapus');
        return;
      }

      if (res.data.can_delete) {
        setDeleteConfirm(true);
      } else {
        setDeletionBlockedInfo(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memeriksa data');
    } finally {
      setIsCheckingDelete(false);
    }
  }, [selectedItem]);

  const handleOpenBulkMerge = useCallback(() => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;
    setMergeSourceItems(selected);
    setMergeModalOpen(true);
  }, [items, selectedIds]);

  const handleOpenBulkDelete = useCallback(() => {
    const selected = items.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;
    setBulkDeleteModalOpen(true);
  }, [items, selectedIds]);

  const handleMergeSuccess = useCallback(() => {
    setSelectedIds(new Set());
    closeSlideOver();
    if (onRefresh) onRefresh();
  }, [closeSlideOver, onRefresh]);

  const handleBulkDeleteSuccess = useCallback(() => {
    setSelectedIds(new Set());
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  const handleToggleDiscontinue = useCallback(async () => {
    if (!selectedItem) return;

    const result = await inventoryApi.toggleDiscontinued(selectedItem.id);
    if (!result.error && result.data) {
      toast.success(
        `Barang berhasil ${selectedItem.is_discontinued ? 'diaktifkan' : 'dihentikan'}`,
      );
      onUpdate(selectedItem.id, result.data);
    } else {
      toast.error('Gagal mengubah status');
    }
    setDiscontinueConfirm(false);
    closeSlideOver();
  }, [selectedItem, onUpdate, closeSlideOver]);

  useHotkeys(
    'ctrl+s, cmd+s',
    (e) => {
      e.preventDefault();
      handleSave();
    },
    { enableOnFormTags: true, enabled: isSlideOverOpen },
  );

  return {
    selectedIds,
    isBulkSnoozing,
    showBulkSnoozeOpts,
    setShowBulkSnoozeOpts,
    bulkSnoozeRef,
    selectedItem,
    isSlideOverOpen,
    editForm,
    setEditForm,
    deleteConfirm,
    setDeleteConfirm,
    mergeModalOpen,
    setMergeModalOpen,
    mergeSourceItems,
    setMergeSourceItems,
    bulkDeleteModalOpen,
    setBulkDeleteModalOpen,
    isCheckingDelete,
    deletionBlockedInfo,
    setDeletionBlockedInfo,
    discontinueConfirm,
    setDiscontinueConfirm,
    printModalOpen,
    setPrintModalOpen,
    historyModalOpen,
    setHistoryModalOpen,
    warehouseStocks,
    loadingWarehouseStocks,
    isAdminUser,
    canViewHPP,
    canEdit,
    handleBulkSnooze,
    toggleSelectAll,
    toggleSelect,
    openSlideOver,
    closeSlideOver,
    handleSave,
    handleDelete,
    handlePromptDelete,
    handleOpenBulkMerge,
    handleOpenBulkDelete,
    handleMergeSuccess,
    handleBulkDeleteSuccess,
    handleToggleDiscontinue,
  };
}
