'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
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
import { formatCurrency, formatDateWIB } from '@/lib/utils';
import {
  IconArrowBack,
  IconSearch,
  IconFileExport,
  IconX,
  IconDeviceFloppy,
  IconCheck,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconBarcode,
  IconBuildingWarehouse,
  IconChevronDown,
  IconChevronUp,
  IconAlertCircle,
  IconShare,
  IconNotes,
  IconShoppingCart,
  IconExternalLink,
} from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button, AmbientLayout, Modal, Badge } from '@/components/ui';
import { SelectInput } from '@/components/ui/SelectInput';
import { Portal } from '@/components/ui/Portal';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useSuppliers } from '@/lib/hooks/useSuppliers';
import { gudangApi } from '@/lib/api/warehouse';
import { Gudang } from '@/types/warehouse';
import { useAuthStore } from '@/lib/auth';
import { SharedBarcodeSearch, SharedBarcodeSearchRef } from '@/components/inventory/SharedBarcodeSearch';
import { InventoryItem } from '@/types/inventory';

const STORAGE_KEY = 'draft_retur_pembelian_v2';

export default function ReturnPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);

  // Suppliers & Warehouses
  const { data: suppliers = [] } = useSuppliers();
  const [warehouses, setWarehouses] = useState<Gudang[]>([]);
  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<import('@/types').Supplier | null>(null);

  // Raw & Aggregated Items
  const [rawSupplierItems, setRawSupplierItems] = useState<AvailableReturnItem[]>([]);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedReturnItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Forms & Actions State
  const [metodeKompensasi, setMetodeKompensasi] = useState<MetodeKompensasi>('potong_hutang');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // UI Interactive Modals
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<SupplierReturnOption[]>([]);
  const [pendingScanItem, setPendingScanItem] = useState<InventoryItem | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [successModalData, setSuccessModalData] = useState<{
    returnId: string;
    total: number;
    itemCount: number;
    supplierNama: string;
  } | null>(null);

  // Search Ref
  const searchRef = useRef<SharedBarcodeSearchRef>(null);

  // 1. Load warehouses on mount
  useEffect(() => {
    async function loadWarehouses() {
      const res = await gudangApi.getAll({ activeOnly: true });
      if (res.data) {
        setWarehouses(res.data);
        const userDef = profile?.default_gudang_id
          ? res.data.find((g) => g.id === profile.default_gudang_id)
          : null;
        const defaultG = userDef || res.data.find((g) => g.is_default) || res.data[0];
        if (defaultG && !selectedGudangId) {
          setSelectedGudangId(defaultG.id);
        }
      }
    }
    loadWarehouses();
  }, [profile?.default_gudang_id, selectedGudangId]);

  // 2. Fetch Supplier Items with Real Physical Stock
  const loadSupplierItems = useCallback(
    async (supplierId: string, gudangId: string, preservedDraft?: Record<string, { qty: number; alasan: AlasanRetur }>) => {
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

        // Group by inventory_id
        const groups: Record<string, AvailableReturnItem[]> = {};
        for (const item of rawList) {
          if (!groups[item.inventory_id]) groups[item.inventory_id] = [];
          groups[item.inventory_id].push(item);
        }

        // Create Aggregated List
        const aggList: AggregatedReturnItem[] = Object.keys(groups).map((invId) => {
          const batchList = [...groups[invId]];
          // Urutkan nota secara FIFO: tanggal terlama lebih dulu
          batchList.sort((a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime());

          const totalRemaining = batchList.reduce((sum, b) => sum + (b.qty_remaining || 0), 0);
          const stokFisik = batchList[0]?.stok_fisik ?? 0;
          const maxAllowed = Math.max(0, Math.min(stokFisik, totalRemaining));

          // Ambil harga beli faktur terakhir sebagai representasi
          const latestBatch = batchList[batchList.length - 1];
          const repPrice = latestBatch.harga_beli - (latestBatch.diskon || 0);

          // Cek draft tersimpan jika ada
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
      } catch (err: any) {
        console.error('Error fetching return items:', err);
        setError('Terjadi kesalahan saat memuat data barang retur.');
      } finally {
        setLoadingItems(false);
      }
    },
    []
  );

  // 3. LocalStorage Recovery on initial load
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(STORAGE_KEY);
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
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const activeItems = aggregatedItems.filter((i) => i.return_qty > 0);
    if (activeItems.length === 0 && !note) {
      localStorage.removeItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save return draft', e);
    }
  }, [selectedSupplier, selectedGudangId, aggregatedItems, metodeKompensasi, note]);

  // 5. Handle Gudang change
  const handleGudangChange = (newGudangId: string) => {
    setSelectedGudangId(newGudangId);
    if (selectedSupplier) {
      // Preserve current return quantities when switching warehouse
      const currentDraft: Record<string, { qty: number; alasan: AlasanRetur }> = {};
      aggregatedItems.forEach((i) => {
        if (i.return_qty > 0) currentDraft[i.inventory_id] = { qty: i.return_qty, alasan: i.alasan };
      });
      loadSupplierItems(selectedSupplier.id, newGudangId, currentDraft);
    }
  };

  // 6. Handle Manual Select Supplier
  const handleSelectSupplier = (supplier: import('@/types').Supplier) => {
    setSelectedSupplier(supplier);
    loadSupplierItems(supplier.id, selectedGudangId);
  };

  // 7. Auto-increment / Add item to cart
  const addItemToCart = useCallback(
    (inventoryId: string, increment: number = 1) => {
      setAggregatedItems((prev) => {
        const itemIndex = prev.findIndex((i) => i.inventory_id === inventoryId);
        if (itemIndex < 0) return prev;

        const current = prev[itemIndex];
        const newQty = Math.max(0, Math.min(current.return_qty + increment, current.max_retur_allowed));

        if (newQty === current.return_qty && increment > 0) {
          setError(
            `Maksimal retur untuk "${current.nama_barang}" adalah ${current.max_retur_allowed} pcs (Stok Fisik: ${current.stok_fisik}, Sisa Nota: ${current.total_qty_remaining}).`
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
    },
    []
  );

  // 8. Handle selection from SharedBarcodeSearch
  const handleItemSelectedFromSearch = useCallback(
    async (item: InventoryItem) => {
      setError(null);

      // Skenario A: Supplier sudah dipilih
      if (selectedSupplier) {
        const existsInSupplier = aggregatedItems.find((i) => i.inventory_id === item.id);
        if (existsInSupplier) {
          addItemToCart(item.id, 1);
          searchRef.current?.clearInput();
        } else {
          // Barang ini tidak ada di daftar pembelian supplier aktif
          setError(`Barang "${item.nama_barang}" tidak memiliki riwayat pembelian dari ${selectedSupplier.nama}.`);
        }
        return;
      }

      // Skenario B: Supplier belum dipilih (Smart Scan-First)
      try {
        const res = await returnApi.findSuppliersByBarcode(item.barcode || item.nama_barang, item.id);
        if (res.error) throw res.error;

        const sups = res.data || [];
        if (sups.length === 0) {
          setError(`Barang "${item.nama_barang}" tidak memiliki riwayat pembelian atau sisa kuota retur telah habis.`);
        } else if (sups.length === 1) {
          // Hanya 1 supplier: Langsung auto-set
          const matchedSup = suppliers.find((s) => s.id === sups[0].supplier_id);
          if (matchedSup) {
            setSelectedSupplier(matchedSup as any);
            const draft: Record<string, { qty: number; alasan: AlasanRetur }> = {
              [item.id]: { qty: 1, alasan: 'rusak' },
            };
            await loadSupplierItems(matchedSup.id, selectedGudangId, draft);
            searchRef.current?.clearInput();
          }
        } else {
          // Multi-supplier: Munculkan modal
          setPendingScanItem(item);
          setSupplierOptions(sups);
          setSupplierModalOpen(true);
        }
      } catch (err: any) {
        setError(err.message || 'Gagal mencari data supplier untuk barang ini.');
      }
    },
    [selectedSupplier, aggregatedItems, suppliers, selectedGudangId, addItemToCart, loadSupplierItems]
  );

  // 9. Handle Qty change from Stepper/Input
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

  // 10. Handle Alasan change
  const handleAlasanChange = useCallback((inventoryId: string, alasan: AlasanRetur) => {
    setAggregatedItems((prev) => {
      const itemIndex = prev.findIndex((i) => i.inventory_id === inventoryId);
      if (itemIndex < 0) return prev;
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], alasan };
      return updated;
    });
  }, []);

  // 11. Remove item from cart
  const handleRemoveItem = useCallback((inventoryId: string) => {
    handleQtyChange(inventoryId, 0);
  }, [handleQtyChange]);

  // 12. Reset cart
  const handleConfirmReset = useCallback(() => {
    setSelectedSupplier(null);
    setRawSupplierItems([]);
    setAggregatedItems([]);
    setNote('');
    setMetodeKompensasi('potong_hutang');
    setError(null);
    setSuccess(null);
    setShowResetConfirm(false);
    localStorage.removeItem(STORAGE_KEY);
    searchRef.current?.clearInput();
  }, []);

  // Filtered active cart items
  const activeCartItems = useMemo(
    () => aggregatedItems.filter((i) => i.return_qty > 0),
    [aggregatedItems]
  );

  // Total Return Amount
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

  // 13. Pre-submit Preview
  const handlePrepareSubmit = useCallback(() => {
    if (!selectedSupplier) {
      setError('Pilih supplier terlebih dahulu.');
      return;
    }
    if (activeCartItems.length === 0) {
      setError('Keranjang retur masih kosong.');
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    setPreviewData({
      tanggal: today,
      supplierNama: selectedSupplier.nama,
      supplierId: selectedSupplier.id,
      gudangId: selectedGudangId,
      metodeKompensasi,
      note,
      items: activeCartItems,
      totalAmount: totalReturnAmount,
      totalQty: totalReturnQty,
    });
    setShowPreview(true);
  }, [selectedSupplier, activeCartItems, selectedGudangId, metodeKompensasi, note, totalReturnAmount, totalReturnQty]);

  // 14. Confirm Submit to DB
  const handleConfirmSubmit = useCallback(async () => {
    if (!previewData || !selectedSupplier) return;
    setSubmitting(true);
    setError(null);

    // Kumpulkan payload batch items
    const itemsPayload: { pembelian_item_id: string; inventory_id: string; qty: number }[] = [];
    previewData.items.forEach((item: AggregatedReturnItem) => {
      item.batches.forEach((batch) => {
        if (batch.allocated_qty > 0) {
          itemsPayload.push({
            pembelian_item_id: batch.pembelian_item_id,
            inventory_id: item.inventory_id,
            qty: batch.allocated_qty,
          });
        }
      });
    });

    if (itemsPayload.length === 0) {
      setError('Tidak ada rincian nota yang valid untuk disimpan.');
      setSubmitting(false);
      return;
    }

    // Bangun catatan terstruktur
    const kompensasiLabel =
      metodeKompensasi === 'potong_hutang'
        ? 'Potong Hutang'
        : metodeKompensasi === 'refund_kas'
        ? 'Refund Kas/Tunai'
        : 'Tukar Barang';

    const alasanSummary = previewData.items
      .map((i: AggregatedReturnItem) => `${i.nama_barang} (${i.alasan})`)
      .join(', ');

    const fullNote = [
      `[Penyelesaian: ${kompensasiLabel}]`,
      `[Alasan: ${alasanSummary}]`,
      note ? `Catatan: ${note}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const result = await returnApi.submitBatchReturn({
        supplier_id: selectedSupplier.id,
        supplier_nama: selectedSupplier.nama,
        tanggal: previewData.tanggal,
        note: fullNote,
        gudang_id: selectedGudangId || undefined,
        items: itemsPayload,
      });

      if (result.error) {
        setError(result.error.message || 'Gagal menyimpan transaksi retur.');
      } else {
        const returnId = result.data as string;
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.returPembelianAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.pembelianAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });

        // Clear LocalStorage
        localStorage.removeItem(STORAGE_KEY);

        setShowPreview(false);
        setSuccessModalData({
          returnId,
          total: totalReturnAmount,
          itemCount: totalReturnQty,
          supplierNama: selectedSupplier.nama,
        });

        // Reset page state
        setSelectedSupplier(null);
        setRawSupplierItems([]);
        setAggregatedItems([]);
        setNote('');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat menyimpan retur.');
    } finally {
      setSubmitting(false);
    }
  }, [previewData, selectedSupplier, selectedGudangId, metodeKompensasi, note, totalReturnAmount, totalReturnQty, queryClient]);

  // 15. Export / Print PDF Paperless
  const handleExportPdf = useCallback(async (returnId: string) => {
    try {
      await downloadOrShareFile(
        `/api/export/inventory/return/${returnId}`,
        `Surat_Retur_${returnId.slice(0, 8)}.pdf`,
        'Surat Retur Barang'
      );
    } catch (err) {
      setError('Gagal mengunduh Surat Retur PDF');
    }
  }, []);

  return (
    <AmbientLayout>
      <div className="flex min-h-[calc(100vh-2rem)] flex-col pb-48 lg:min-h-0 lg:h-[calc(100vh-2rem)] lg:pb-0">
        
        {/* TOP HEADER */}
        <div className="animate-fade-in-up mb-4 flex-shrink-0 transition-all duration-300 lg:mb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-neutral-600 shadow-sm transition hover:bg-neutral-100 hover:text-neutral-900 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label="Kembali"
              >
                <IconArrowBack className="h-5 w-5" stroke={2} />
              </button>
              <div>
                <h1 className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-xl font-extrabold tracking-tight text-transparent lg:text-3xl dark:from-brand-400 dark:to-brand-200">
                  Retur Pembelian
                </h1>
                <p className="text-xs font-medium text-neutral-500 lg:text-sm dark:text-neutral-400">
                  Pengembalian barang rusak, cacat, atau konsinyasi ke supplier
                </p>
              </div>
            </div>

            {/* Current Supplier & Warehouse Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedSupplier && (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/70 px-3.5 shadow-sm dark:border-brand-900/40 dark:bg-brand-950/40">
                  <span className="text-xs text-neutral-500">Supplier:</span>
                  <span className="text-xs sm:text-sm font-bold text-brand-700 dark:text-brand-300">
                    {selectedSupplier.nama}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="ml-1 rounded-md p-1 text-neutral-400 transition hover:bg-brand-100 hover:text-danger-500 dark:hover:bg-brand-900/60"
                    title="Ganti Supplier"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              )}
              {warehouses.length > 0 && (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 px-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
                  <IconBuildingWarehouse className="h-4 w-4 text-brand-500 shrink-0" />
                  <span className="text-xs text-neutral-500 shrink-0">Gudang:</span>
                  <div className="w-40 sm:w-48">
                    <SelectInput
                      value={selectedGudangId}
                      onChange={handleGudangChange}
                      options={warehouses.map((g) => ({
                        value: g.id,
                        label: `${g.nama}${g.is_default ? ' [Pusat]' : ''}`,
                      }))}
                      inputSize="sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ALERTS */}
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs sm:text-sm text-danger-700 dark:border-danger-800/60 dark:bg-danger-950/40 dark:text-danger-300">
              <IconAlertCircle className="h-5 w-5 shrink-0 text-danger-500" />
              <span className="flex-1 font-medium">{error}</span>
              <button onClick={() => setError(null)} className="text-danger-400 hover:text-danger-600">
                <IconX className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* SEARCH BAR & SCANNER (SHARED BARCODE SEARCH) */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SharedBarcodeSearch
                ref={searchRef}
                onItemSelected={handleItemSelectedFromSearch}
                placeholder={
                  selectedSupplier
                    ? `Cari nama atau scan barcode barang dari ${selectedSupplier.nama}...`
                    : 'Scan barcode atau ketik nama barang (Auto-detect supplier)...'
                }
                icon="scan"
                filterPredicate={
                  selectedSupplier
                    ? (item) => aggregatedItems.some((agg) => agg.inventory_id === item.id)
                    : undefined
                }
              />
            </div>

            {/* Supplier Picker if not yet selected */}
            {!selectedSupplier && suppliers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">Atau pilih manual:</span>
                <div className="w-56">
                  <SelectInput
                    value=""
                    onChange={(val) => {
                      const sup = suppliers.find((s) => s.id === val);
                      if (sup) handleSelectSupplier(sup as any);
                    }}
                    options={suppliers.map((s) => ({ value: s.id, label: s.nama }))}
                    placeholder="Pilih Supplier..."
                    inputSize="md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CART SECTION */}
        <div className="shadow-elevated animate-fade-in-up flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
          <div className="flex-1 overflow-auto p-4 lg:p-6 pb-48">
            
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-800 lg:text-lg dark:text-white">
                  Keranjang Retur
                </h2>
                <Badge variant={activeCartItems.length > 0 ? 'info' : 'default'}>
                  {activeCartItems.length} Produk ({totalReturnQty} Pcs)
                </Badge>
              </div>

              {activeCartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-danger-600 transition hover:text-danger-700 dark:text-danger-400"
                >
                  <IconTrash className="h-4 w-4" />
                  Kosongkan
                </button>
              )}
            </div>

            {loadingItems ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"></div>
                <p className="mt-3 text-xs font-medium text-neutral-500">Memuat stok & riwayat pembelian...</p>
              </div>
            ) : !selectedSupplier && activeCartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-16 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
                <IconBarcode className="mx-auto mb-3 h-12 w-12 text-neutral-400 dark:text-neutral-600" />
                <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  Belum Ada Barang di Keranjang
                </p>
                <p className="mt-1 text-xs text-neutral-500 lg:text-sm">
                  Scan barcode barang rusak di atas untuk auto-detect supplier, atau pilih supplier tujuan terlebih dahulu.
                </p>
              </div>
            ) : activeCartItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-16 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
                <IconShoppingCart className="mx-auto mb-3 h-12 w-12 text-neutral-400 dark:text-neutral-600" />
                <p className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  Keranjang Kosong
                </p>
                <p className="mt-1 text-xs text-neutral-500 lg:text-sm">
                  Ketik nama barang atau scan barcode untuk menambahkan barang milik {selectedSupplier?.nama}.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* DESKTOP TABLE */}
                <div className="hidden rounded-2xl border border-neutral-200/70 bg-white/40 lg:block dark:border-neutral-800/70 dark:bg-neutral-950/40">
                  <table className="w-full text-left">
                    <thead className="border-b border-neutral-200 bg-neutral-50/80 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-400">
                      <tr>
                        <th className="px-5 py-3.5">Produk & Barcode</th>
                        <th className="px-4 py-3.5 text-center">Stok Fisik / Sisa Beli</th>
                        <th className="px-4 py-3.5 text-right">Harga Satuan</th>
                        <th className="w-52 px-4 py-3.5">Alasan Retur</th>
                        <th className="w-28 px-3 py-3.5 text-center">Qty Retur</th>
                        <th className="px-5 py-3.5 text-right">Subtotal</th>
                        <th className="w-16 px-4 py-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {activeCartItems.map((item) => {
                        const isExpanded = !!expandedRows[item.inventory_id];
                        const itemSubtotal = item.batches.reduce((sub, b) => {
                          const netPrice = b.harga_beli - (b.diskon || 0);
                          return sub + b.allocated_qty * netPrice;
                        }, 0);

                        return (
                          <React.Fragment key={item.inventory_id}>
                            <tr className="group transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40">
                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                  {item.nama_barang}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  {item.barcode && (
                                    <span className="font-mono text-[11px] text-neutral-500">
                                      {item.barcode}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRows((prev) => ({
                                        ...prev,
                                        [item.inventory_id]: !prev[item.inventory_id],
                                      }))
                                    }
                                    className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                                  >
                                    <span>
                                      {item.batches.filter((b) => b.allocated_qty > 0).length} Nota Terkait
                                    </span>
                                    {isExpanded ? (
                                      <IconChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                      <IconChevronDown className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                    {item.stok_fisik} pcs
                                  </span>
                                  <span className="text-[10px] text-neutral-400">
                                    (Faktur: {item.total_qty_remaining})
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                {formatCurrency(item.harga_beli_satuan)}
                              </td>

                              <td className="px-4 py-3">
                                <div className="w-48">
                                  <SelectInput
                                    value={item.alasan}
                                    onChange={(val) => handleAlasanChange(item.inventory_id, val as AlasanRetur)}
                                    options={[
                                      { value: 'rusak', label: 'Rusak / Cacat' },
                                      { value: 'expired', label: 'Expired' },
                                      { value: 'salah_kirim', label: 'Salah Kirim' },
                                      { value: 'konsinyasi', label: 'Tidak Laku' },
                                      { value: 'lainnya', label: 'Lainnya' },
                                    ]}
                                    inputSize="sm"
                                    required
                                  />
                                </div>
                              </td>

                              <td className="px-3 py-4">
                                <div className="flex justify-center">
                                  <div className="inline-flex h-8 items-center rounded-lg border border-neutral-200 bg-white p-0.5 shadow-sm transition-colors hover:border-brand-400 focus-within:border-brand-500 dark:border-neutral-700 dark:bg-neutral-900">
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(item.inventory_id, item.return_qty - 1)}
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-600 active:scale-95 dark:hover:bg-neutral-800"
                                      aria-label="Kurangi Qty"
                                    >
                                      <IconMinus className="h-3 w-3" stroke={2.5} />
                                    </button>
                                    <PriceInput
                                      value={item.return_qty}
                                      onChange={(val) => handleQtyChange(item.inventory_id, val)}
                                      className="w-8 border-none bg-transparent p-0 text-center text-xs font-bold text-neutral-900 focus:ring-0 dark:text-neutral-100"
                                      min={0}
                                      max={item.max_retur_allowed}
                                      prefix=""
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(item.inventory_id, item.return_qty + 1)}
                                      disabled={item.return_qty >= item.max_retur_allowed}
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-brand-600 active:scale-95 disabled:opacity-25 dark:hover:bg-neutral-800"
                                      aria-label="Tambah Qty"
                                    >
                                      <IconPlus className="h-3 w-3" stroke={2.5} />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-right text-sm font-bold text-brand-600 dark:text-brand-400">
                                {formatCurrency(itemSubtotal)}
                              </td>

                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.inventory_id)}
                                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-950/40"
                                  title="Hapus barang"
                                >
                                  <IconTrash className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>

                            {/* COLLAPSIBLE ACCORDION: DETAIL ALOKASI NOTA */}
                            {isExpanded && (
                              <tr className="bg-brand-50/30 dark:bg-brand-950/20">
                                <td colSpan={7} className="px-6 py-3 border-y border-neutral-100 dark:border-neutral-800/50">
                                  <div className="text-xs">
                                    <p className="font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                                      Rincian Pemotongan Nota (Auto-FIFO):
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {item.batches.map((b) => (
                                        <div
                                          key={b.pembelian_item_id}
                                          className={`rounded-lg border p-2.5 text-xs ${
                                            b.allocated_qty > 0
                                              ? 'border-brand-300 bg-white font-medium text-neutral-900 shadow-sm dark:border-brand-800 dark:bg-neutral-900 dark:text-neutral-100'
                                              : 'border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/40'
                                          }`}
                                        >
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="font-mono text-[11px] font-bold">
                                              {b.nomor_nota || b.pembelian_id.slice(0, 8)}
                                            </span>
                                            <span className="text-[10px] text-neutral-500">
                                              {b.tanggal_pembelian}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center text-[11px]">
                                            <span>
                                              Alokasi: <strong className="text-brand-600 dark:text-brand-400">{b.allocated_qty}</strong> / {b.qty_remaining} pcs
                                            </span>
                                            <span>{formatCurrency(b.harga_beli - b.diskon)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARD VIEW */}
                <div className="space-y-3 lg:hidden">
                  {activeCartItems.map((item) => {
                    const itemSubtotal = item.batches.reduce((sub, b) => {
                      const netPrice = b.harga_beli - (b.diskon || 0);
                      return sub + b.allocated_qty * netPrice;
                    }, 0);

                    return (
                      <div
                        key={item.inventory_id}
                        className="rounded-2xl border border-neutral-200 bg-white/90 p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                              {item.nama_barang}
                            </h3>
                            <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                              <span>Stok Fisik: <strong>{item.stok_fisik}</strong></span>
                              <span>•</span>
                              <span>Faktur: <strong>{item.total_qty_remaining}</strong></span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.inventory_id)}
                            className="p-1 text-neutral-400 hover:text-danger-500"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-neutral-500">Alasan</label>
                            <div className="mt-0.5">
                              <SelectInput
                                value={item.alasan}
                                onChange={(val) => handleAlasanChange(item.inventory_id, val as AlasanRetur)}
                                options={[
                                  { value: 'rusak', label: 'Rusak / Cacat' },
                                  { value: 'expired', label: 'Expired' },
                                  { value: 'salah_kirim', label: 'Salah Kirim' },
                                  { value: 'konsinyasi', label: 'Tidak Laku' },
                                  { value: 'lainnya', label: 'Lainnya' },
                                ]}
                                inputSize="sm"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-neutral-500">Qty Retur</label>
                            <div className="mt-0.5 inline-flex h-9 w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-0.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.inventory_id, item.return_qty - 1)}
                                className="flex h-7 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                              >
                                <IconMinus className="h-3 w-3" stroke={2.5} />
                              </button>
                              <PriceInput
                                value={item.return_qty}
                                onChange={(val) => handleQtyChange(item.inventory_id, val)}
                                className="w-8 border-none bg-transparent p-0 text-center text-xs font-bold text-neutral-900 focus:ring-0 dark:text-neutral-100"
                                min={0}
                                max={item.max_retur_allowed}
                                prefix=""
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.inventory_id, item.return_qty + 1)}
                                disabled={item.return_qty >= item.max_retur_allowed}
                                className="flex h-7 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-25"
                              >
                                <IconPlus className="h-3 w-3" stroke={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800">
                          <span className="text-xs text-neutral-400">Subtotal:</span>
                          <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                            {formatCurrency(itemSubtotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* BOTTOM SETTLEMENT & NOTE OPTIONS */}
                <div className="mt-6 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-950/30">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Metode Kompensasi Retur:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs transition ${
                          metodeKompensasi === 'potong_hutang'
                            ? 'border-brand-500 bg-brand-50/70 font-bold text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                            : 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                        }`}>
                          <input
                            type="radio"
                            name="kompensasi"
                            value="potong_hutang"
                            checked={metodeKompensasi === 'potong_hutang'}
                            onChange={() => setMetodeKompensasi('potong_hutang')}
                            className="text-brand-500 focus:ring-brand-400"
                          />
                          <span>Potong Hutang</span>
                        </label>

                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs transition ${
                          metodeKompensasi === 'refund_kas'
                            ? 'border-brand-500 bg-brand-50/70 font-bold text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                            : 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                        }`}>
                          <input
                            type="radio"
                            name="kompensasi"
                            value="refund_kas"
                            checked={metodeKompensasi === 'refund_kas'}
                            onChange={() => setMetodeKompensasi('refund_kas')}
                            className="text-brand-500 focus:ring-brand-400"
                          />
                          <span>Refund Kas/Tunai</span>
                        </label>

                        <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs transition ${
                          metodeKompensasi === 'tukar_barang'
                            ? 'border-brand-500 bg-brand-50/70 font-bold text-brand-700 dark:border-brand-500 dark:bg-brand-950/40 dark:text-brand-300'
                            : 'border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400'
                        }`}>
                          <input
                            type="radio"
                            name="kompensasi"
                            value="tukar_barang"
                            checked={metodeKompensasi === 'tukar_barang'}
                            onChange={() => setMetodeKompensasi('tukar_barang')}
                            className="text-brand-500 focus:ring-brand-400"
                          />
                          <span>Tukar Barang Baru</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        Catatan Surat Jalan / Ekspedisi (Opsional):
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Contoh: Dititipkan supir Bpk. Joko, box ke-2..."
                        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs transition focus:border-brand-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        {activeCartItems.length > 0 && (
          <div className="fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-0 z-40 px-3 lg:sticky lg:bottom-0 lg:px-0">
            <div className="mx-auto max-w-[1920px]">
              <div className="animate-fade-in-up rounded-2xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur-xl lg:rounded-t-3xl lg:rounded-b-none lg:p-4 dark:border-neutral-800 dark:bg-neutral-900/90">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 lg:gap-6">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 lg:text-xs">
                        Item Terpilih
                      </span>
                      <p className="text-sm font-extrabold text-neutral-900 lg:text-lg dark:text-white">
                        {activeCartItems.length} Produk ({totalReturnQty} pcs)
                      </p>
                    </div>
                    <div className="h-8 w-px bg-neutral-200 dark:bg-neutral-800"></div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 lg:text-xs">
                        Total Pengembalian
                      </span>
                      <p className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-base font-extrabold text-transparent lg:text-2xl dark:from-brand-400 dark:to-brand-200">
                        {formatCurrency(totalReturnAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={submitting}
                      className="rounded-xl px-4 py-2 text-xs font-bold lg:text-sm"
                    >
                      <IconRefresh className="h-4 w-4 lg:mr-1.5" />
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handlePrepareSubmit}
                      disabled={submitting || totalReturnAmount === 0}
                      className="shadow-brand-500/20 rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg lg:text-sm"
                    >
                      <IconDeviceFloppy className="h-4 w-4 lg:mr-1.5" />
                      <span>{submitting ? 'Menyimpan...' : 'Simpan Retur'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL MULTI-SUPPLIER PICKER */}
        {supplierModalOpen && pendingScanItem && (
          <Portal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      Pilih Supplier Sumber Barang
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      Barang <strong>&quot;{pendingScanItem.nama_barang}&quot;</strong> tercatat pernah dibeli dari beberapa supplier berbeda:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSupplierModalOpen(false);
                      setPendingScanItem(null);
                    }}
                    className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
                  {supplierOptions.map((sup, idx) => {
                    const isLatest = idx === 0 && !!sup.tanggal_terakhir;
                    const hargaBersih = (sup.harga_beli ?? 0) - (sup.diskon ?? 0);

                    return (
                      <div
                        key={sup.supplier_id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isLatest
                            ? 'border-brand-300 bg-brand-50/40 shadow-sm dark:border-brand-800 dark:bg-brand-950/20'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-neutral-900 dark:text-white">
                              {sup.supplier_nama}
                            </span>
                            {isLatest && (
                              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                                Rekomendasi (Terakhir)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5 text-neutral-600 dark:text-neutral-400">
                          <div>
                            <span className="text-[10px] font-medium text-neutral-400 block">Beli Terakhir</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {sup.tanggal_terakhir ? formatDateWIB(sup.tanggal_terakhir) : '-'}
                            </span>
                            {sup.nomor_nota && (
                              <span className="text-[10px] text-neutral-400 block font-mono">
                                #{sup.nomor_nota}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-medium text-neutral-400 block">Harga Beli</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {sup.harga_beli !== undefined ? formatCurrency(hargaBersih) : '-'}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-medium text-neutral-400 block">Sisa Kuota Retur</span>
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                              {sup.total_qty_remaining} pcs
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/60 flex justify-end">
                          <Button
                            variant={isLatest ? 'primary' : 'secondary'}
                            size="sm"
                            className="text-xs font-bold rounded-xl"
                            onClick={async () => {
                              setSupplierModalOpen(false);
                              const matchedSup = suppliers.find((s) => s.id === sup.supplier_id);
                              if (matchedSup) {
                                setSelectedSupplier(matchedSup as any);
                                const draft: Record<string, { qty: number; alasan: AlasanRetur }> = {
                                  [pendingScanItem.id]: { qty: 1, alasan: 'rusak' },
                                };
                                await loadSupplierItems(matchedSup.id, selectedGudangId, draft);
                                setSuccess(`Supplier diset ke ${matchedSup.nama} dan barang ditambahkan.`);
                                setPendingScanItem(null);
                                searchRef.current?.clearInput();
                              }
                            }}
                          >
                            <IconPlus className="h-3.5 w-3.5 mr-1" />
                            Pilih Supplier Ini
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <Button
                    variant="ghost"
                    className="w-full text-xs font-semibold"
                    onClick={() => {
                      setSupplierModalOpen(false);
                      setPendingScanItem(null);
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* MODAL RESET CONFIRMATION */}
        {showResetConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-950/40">
                  <IconAlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Kosongkan Keranjang Retur?
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Seluruh barang retur yang telah discan dan draft yang tersimpan akan dihapus.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs font-semibold"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 text-xs font-bold"
                    onClick={handleConfirmReset}
                  >
                    Ya, Kosongkan
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* MODAL PREVIEW & KONFIRMASI RETUR */}
        {showPreview && previewData && (
          <Portal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Konfirmasi Retur Pembelian
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Periksa kembali barang yang akan dikembalikan ke supplier
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5 text-xs dark:border-brand-900/30 dark:bg-brand-950/20">
                    <div>
                      <span className="text-neutral-400">Supplier Tujuan:</span>
                      <p className="font-bold text-neutral-900 dark:text-white">{previewData.supplierNama}</p>
                    </div>
                    <div>
                      <span className="text-neutral-400">Penyelesaian:</span>
                      <p className="font-bold text-brand-600 dark:text-brand-400">
                        {previewData.metodeKompensasi === 'potong_hutang'
                          ? 'Potong Hutang'
                          : previewData.metodeKompensasi === 'refund_kas'
                          ? 'Refund Kas/Tunai'
                          : 'Tukar Barang Baru'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                      Daftar Barang ({previewData.items.length})
                    </h4>
                    <div className="space-y-2">
                      {previewData.items.map((item: AggregatedReturnItem) => (
                        <div
                          key={item.inventory_id}
                          className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 text-xs dark:border-neutral-800"
                        >
                          <div>
                            <p className="font-bold text-neutral-900 dark:text-white">{item.nama_barang}</p>
                            <span className="text-[11px] text-neutral-400">Alasan: {item.alasan}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {item.return_qty} pcs
                            </span>
                            <p className="font-semibold text-brand-600 dark:text-brand-400">
                              {formatCurrency(
                                item.batches.reduce((sub, b) => sub + b.allocated_qty * (b.harga_beli - b.diskon), 0)
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <span className="text-xs font-semibold text-neutral-500">Total Nilai Retur:</span>
                    <span className="text-lg font-extrabold text-neutral-900 dark:text-white">
                      {formatCurrency(previewData.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <Button
                    variant="secondary"
                    className="flex-1 text-xs font-semibold"
                    onClick={() => setShowPreview(false)}
                    disabled={submitting}
                  >
                    Periksa Kembali
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 text-xs font-bold"
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                  </Button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {/* MODAL SUKSES TRANSAKSI RETUR */}
        {successModalData && (
          <Portal>
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-neutral-900">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-950/40">
                  <IconCheck className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">
                  Retur Berhasil Disimpan!
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Dokumen retur ke <strong>{successModalData.supplierNama}</strong> telah berhasil dicatat.
                </p>

                <div className="my-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-left text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-neutral-400">No. Bukti Retur:</span>
                    <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      {successModalData.returnId.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-neutral-400">Total Produk:</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {successModalData.itemCount} pcs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Nominal:</span>
                    <span className="font-extrabold text-brand-600 dark:text-brand-400">
                      {formatCurrency(successModalData.total)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="primary"
                    className="w-full text-xs font-bold shadow-lg"
                    onClick={() => handleExportPdf(successModalData.returnId)}
                  >
                    <IconFileExport className="mr-1.5 h-4 w-4" />
                    Cetak / Bagikan Surat Retur (PDF)
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1 text-xs font-semibold"
                      onClick={() => setSuccessModalData(null)}
                    >
                      Buat Retur Baru
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 text-xs font-semibold"
                      onClick={() => router.push('/transactions/history?tab=retur_pembelian')}
                    >
                      Lihat Riwayat
                      <IconExternalLink className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}

      </div>
    </AmbientLayout>
  );
}
