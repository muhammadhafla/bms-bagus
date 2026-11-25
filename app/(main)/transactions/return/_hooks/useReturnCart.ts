'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  returnApi,
  AvailableReturnItem,
  AggregatedReturnItem,
  BatchAllocationItem,
  SupplierReturnOption,
  AlasanRetur,
  MetodeKompensasi,
  calculateAutoFifoBatches,
} from '@/lib/api/return';
import { gudangApi } from '@/lib/api/warehouse';
import { useSuppliers } from '@/lib/hooks/useSuppliers';
import { useAuthStore } from '@/lib/auth';
import { Gudang } from '@/types/warehouse';
import { Supplier } from '@/lib/api/supplier';
import { InventoryItem } from '@/types/inventory';
import { SharedBarcodeSearchRef } from '@/components/inventory/SharedBarcodeSearch';

export const RETURN_DRAFT_STORAGE_KEY = 'draft_retur_pembelian_v2';

export function useReturnCart() {
  const profileDefaultGudangId = useAuthStore((state) => state.profile?.default_gudang_id);

  const { data: suppliers = [] } = useSuppliers();
  const [warehouses, setWarehouses] = useState<Gudang[]>([]);
  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [rawSupplierItems, setRawSupplierItems] = useState<AvailableReturnItem[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedReturnItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [metodeKompensasi, setMetodeKompensasi] = useState<MetodeKompensasi>('potong_hutang');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierReturnOption[]>([]);
  const [pendingScanItem, setPendingScanItem] = useState<InventoryItem | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const searchRef = useRef<SharedBarcodeSearchRef>(null);

  // 1. Load warehouses on mount
  useEffect(() => {
    let active = true;
    gudangApi.getAll({ activeOnly: true }).then((res) => {
      if (!active || !res.data) return;
      setWarehouses(res.data);
      const userDef = profileDefaultGudangId
        ? res.data.find((g) => g.id === profileDefaultGudangId)
        : null;
      const defaultG = userDef || res.data.find((g) => g.is_default) || res.data[0];
      if (defaultG) {
        setSelectedGudangId((prev) => prev || defaultG.id);
      }
    });
    return () => {
      active = false;
    };
  }, [profileDefaultGudangId]);

  // 2. Fetch Supplier Items with Real Physical Stock
  const loadSupplierItems = useCallback(
    async (
      supplierId: string,
      gudangId: string,
      preservedDraft?: Record<string, { qty: number; alasan: AlasanRetur }>,
    ) => {
      setLoadingItems(true);
      setError(null);

      try {
        const res = await returnApi.getAvailableItemsWithStock(supplierId, gudangId);
        if (res.error) {
          setError(res.error.message || 'Gagal memuat barang supplier');
          setRawSupplierItems([]);
          setAggregatedItems([]);
          return;
        }

        const rawList = res.data || [];
        setRawSupplierItems(rawList);

        const groups: Record<string, AvailableReturnItem[]> = {};
        for (const item of rawList) {
          if (!groups[item.inventory_id]) groups[item.inventory_id] = [];
          groups[item.inventory_id].push(item);
        }

        const aggList: AggregatedReturnItem[] = Object.keys(groups).map((invId) => {
          const batchList = [...groups[invId]];
          batchList.sort(
            (a, b) =>
              new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime(),
          );

          const totalRemaining = batchList.reduce((sum, b) => sum + (b.qty_remaining || 0), 0);
          const stokFisik = batchList[0]?.stok_fisik ?? 0;
          const maxAllowed = Math.max(0, Math.min(stokFisik, totalRemaining));

          const latestBatch = batchList[batchList.length - 1];
          const repPrice = latestBatch.harga_beli - (latestBatch.diskon || 0);

          const draftVal = preservedDraft ? preservedDraft[invId] : null;
          const initialQty = draftVal ? Math.min(draftVal.qty, maxAllowed) : 0;
          const initialAlasan = draftVal ? draftVal.alasan : 'rusak';

          const batchesWithAlloc: BatchAllocationItem[] = batchList.map((b) => ({
            pembelian_item_id: b.pembelian_item_id,
            pembelian_id: b.pembelian_id,
            nomor_nota: b.nomor_nota,
            tanggal_pembelian: b.tanggal_pembelian,
            harga_beli: b.harga_beli,
            diskon: b.diskon || 0,
            qty_original: b.qty_original,
            qty_returned: b.qty_returned,
            qty_remaining: b.qty_remaining,
            allocated_qty: 0,
          }));

          const allocated = calculateAutoFifoBatches(batchesWithAlloc, initialQty);

          return {
            inventory_id: invId,
            nama_barang: batchList[0].nama_barang,
            barcode: batchList[0].barcode,
            harga_beli_satuan: repPrice,
            stok_fisik: stokFisik,
            total_qty_remaining: totalRemaining,
            max_retur_allowed: maxAllowed,
            return_qty: initialQty,
            alasan: initialAlasan,
            batches: allocated,
          };
        });

        setAggregatedItems(aggList);
      } catch (err) {
        console.error('Error fetching return items:', err);
        setError('Terjadi kesalahan saat memuat data barang retur.');
      } finally {
        setLoadingItems(false);
      }
    },
    [],
  );

  // 3. LocalStorage Recovery on initial load
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(RETURN_DRAFT_STORAGE_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        if (parsed.supplier && parsed.gudangId) {
          setSelectedSupplier(parsed.supplier);
          setSelectedGudangId(parsed.gudangId);
          if (parsed.metodeKompensasi) setMetodeKompensasi(parsed.metodeKompensasi);
          if (parsed.note) setNote(parsed.note);

          loadSupplierItems(parsed.supplier.id, parsed.gudangId, parsed.itemsMap);
        }
      }
    } catch (e) {
      console.warn('Failed to parse return draft from localStorage', e);
    }
  }, [loadSupplierItems]);

  // 4. Auto-save to LocalStorage when return items change
  useEffect(() => {
    if (!selectedSupplier || !selectedGudangId) {
      localStorage.removeItem(RETURN_DRAFT_STORAGE_KEY);
      return;
    }

    const activeItems = aggregatedItems.filter((i) => i.return_qty > 0);
    if (activeItems.length === 0 && !note) {
      localStorage.removeItem(RETURN_DRAFT_STORAGE_KEY);
      return;
    }

    const itemsMap: Record<string, { qty: number; alasan: AlasanRetur }> = {};
    activeItems.forEach((i) => {
      itemsMap[i.inventory_id] = { qty: i.return_qty, alasan: i.alasan };
    });

    const draft = {
      supplier: selectedSupplier,
      gudangId: selectedGudangId,
      metodeKompensasi,
      note,
      itemsMap,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(RETURN_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save return draft', e);
    }
  }, [selectedSupplier, selectedGudangId, aggregatedItems, metodeKompensasi, note]);

  const handleGudangChange = (newGudangId: string) => {
    setSelectedGudangId(newGudangId);
    if (selectedSupplier) {
      const currentDraft: Record<string, { qty: number; alasan: AlasanRetur }> = {};
      aggregatedItems.forEach((i) => {
        if (i.return_qty > 0) currentDraft[i.inventory_id] = { qty: i.return_qty, alasan: i.alasan };
      });
      loadSupplierItems(selectedSupplier.id, newGudangId, currentDraft);
    }
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    loadSupplierItems(supplier.id, selectedGudangId);
  };

  const addItemToCart = useCallback((inventoryId: string, increment: number = 1) => {
    setAggregatedItems((prev) => {
      const itemIndex = prev.findIndex((i) => i.inventory_id === inventoryId);
      if (itemIndex < 0) return prev;

      const current = prev[itemIndex];
      const newQty = Math.max(0, Math.min(current.return_qty + increment, current.max_retur_allowed));

      if (newQty === current.return_qty && increment > 0) {
        setError(
          `Maksimal retur untuk "${current.nama_barang}" adalah ${current.max_retur_allowed} pcs (Stok Fisik: ${current.stok_fisik}, Sisa Nota: ${current.total_qty_remaining}).`,
        );
        return prev;
      }

      const allocatedBatches = calculateAutoFifoBatches(current.batches, newQty);
      const updated = [...prev];
      updated[itemIndex] = {
        ...current,
        return_qty: newQty,
        batches: allocatedBatches,
      };
      return updated;
    });
  }, []);

  const handleItemSelectedFromSearch = useCallback(
    async (item: InventoryItem) => {
      setError(null);

      if (selectedSupplier) {
        const existsInSupplier = aggregatedItems.find((i) => i.inventory_id === item.id);
        if (existsInSupplier) {
          addItemToCart(item.id, 1);
          searchRef.current?.clearInput();
        } else {
          setError(
            `Barang "${item.nama_barang}" tidak memiliki riwayat pembelian dari ${selectedSupplier.nama}.`,
          );
        }
        return;
      }

      try {
        const res = await returnApi.findSuppliersByBarcode(
          item.barcode || item.nama_barang,
          item.id,
        );
        if (res.error) throw res.error;

        const sups = res.data || [];
        if (sups.length === 0) {
          setError(
            `Barang "${item.nama_barang}" tidak memiliki riwayat pembelian atau sisa kuota retur telah habis.`,
          );
        } else if (sups.length === 1) {
          const matchedSup = suppliers.find((s) => s.id === sups[0].supplier_id);
          if (matchedSup) {
            setSelectedSupplier(matchedSup);
            const draft: Record<string, { qty: number; alasan: AlasanRetur }> = {
              [item.id]: { qty: 1, alasan: 'rusak' },
            };
            await loadSupplierItems(matchedSup.id, selectedGudangId, draft);
            searchRef.current?.clearInput();
          }
        } else {
          setPendingScanItem(item);
          setSupplierOptions(sups);
          setSupplierModalOpen(true);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal mencari data supplier untuk barang ini.');
      }
    },
    [selectedSupplier, aggregatedItems, suppliers, selectedGudangId, addItemToCart, loadSupplierItems],
  );

  const handleQtyChange = useCallback((inventoryId: string, qty: number) => {
    setAggregatedItems((prev) => {
      const itemIndex = prev.findIndex((i) => i.inventory_id === inventoryId);
      if (itemIndex < 0) return prev;

      const current = prev[itemIndex];
      const validQty = Math.max(0, Math.min(qty, current.max_retur_allowed));
      const allocatedBatches = calculateAutoFifoBatches(current.batches, validQty);

      const updated = [...prev];
      updated[itemIndex] = {
        ...current,
        return_qty: validQty,
        batches: allocatedBatches,
      };
      return updated;
    });
  }, []);

  const handleAlasanChange = useCallback((inventoryId: string, alasan: AlasanRetur) => {
    setAggregatedItems((prev) => {
      const itemIndex = prev.findIndex((i) => i.inventory_id === inventoryId);
      if (itemIndex < 0) return prev;
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], alasan };
      return updated;
    });
  }, []);

  const handleRemoveItem = useCallback(
    (inventoryId: string) => {
      handleQtyChange(inventoryId, 0);
    },
    [handleQtyChange],
  );

  const handleConfirmReset = useCallback(() => {
    setSelectedSupplier(null);
    setRawSupplierItems([]);
    setAggregatedItems([]);
    setNote('');
    setMetodeKompensasi('potong_hutang');
    setError(null);
    setSuccess(null);
    setShowResetConfirm(false);
    localStorage.removeItem(RETURN_DRAFT_STORAGE_KEY);
    searchRef.current?.clearInput();
  }, []);

  const clearAfterSubmit = useCallback(() => {
    localStorage.removeItem(RETURN_DRAFT_STORAGE_KEY);
    setSelectedSupplier(null);
    setRawSupplierItems([]);
    setAggregatedItems([]);
    setNote('');
  }, []);

  const activeCartItems = useMemo(
    () => aggregatedItems.filter((i) => i.return_qty > 0),
    [aggregatedItems],
  );

  const totalReturnAmount = useMemo(() => {
    return activeCartItems.reduce((total, item) => {
      const itemSubtotal = item.batches.reduce((sub, b) => {
        const netPrice = b.harga_beli - (b.diskon || 0);
        return sub + b.allocated_qty * netPrice;
      }, 0);
      return total + itemSubtotal;
    }, 0);
  }, [activeCartItems]);

  const totalReturnQty = useMemo(() => {
    return activeCartItems.reduce((sum, item) => sum + item.return_qty, 0);
  }, [activeCartItems]);

  return {
    suppliers,
    warehouses,
    selectedGudangId,
    selectedSupplier,
    setSelectedSupplier,
    rawSupplierItems,
    aggregatedItems,
    loadingItems,
    metodeKompensasi,
    setMetodeKompensasi,
    note,
    setNote,
    error,
    setError,
    success,
    setSuccess,
    expandedRows,
    setExpandedRows,
    supplierModalOpen,
    setSupplierModalOpen,
    supplierOptions,
    pendingScanItem,
    setPendingScanItem,
    showResetConfirm,
    setShowResetConfirm,
    searchRef,
    loadSupplierItems,
    handleGudangChange,
    handleSelectSupplier,
    handleItemSelectedFromSearch,
    handleQtyChange,
    handleAlasanChange,
    handleRemoveItem,
    handleConfirmReset,
    clearAfterSubmit,
    activeCartItems,
    totalReturnAmount,
    totalReturnQty,
  };
}
