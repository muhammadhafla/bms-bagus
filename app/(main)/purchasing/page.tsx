'use client';
import { toast } from 'sonner';
import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePembelianStore, useBulkPrintStore } from '@/lib/store';
import {
  inventoryApi,
  PembelianItem,
  purchaseApi,
  purchasesApi,
  kategoriApi,
  supplierApi,
  Supplier,
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types/inventory';
import {
  formatCurrency,
  normalizeBarcode,
  generateIdempotencyKey,
  generateAutoBarcode,
  debounce,
} from '@/lib/utils';
import {
  IconShoppingCart,
  IconCamera,
  IconFileImport,
  IconX,
  IconCheck,
  IconDeviceFloppy,
  IconRefresh,
  IconSearch,
  IconPlus,
  IconPrinter,
  IconChevronUp,
  IconArrowRight,
  IconScan,
  IconArrowLeft,
} from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, Badge, Banner, Modal, TextInput } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Portal } from '@/components/ui/Portal';
import { AdminOnly } from '@/components/role';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import { NewItemDialog } from './NewItemDialog';
import { ItemCart } from './ItemCart';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import dynamic from 'next/dynamic';

const ImportCSVWizard = dynamic(() => import('@/components/purchasing/ImportCSVWizard'), {
  loading: () => <div className="skeleton-shimmer h-64 rounded-2xl" />,
  ssr: false,
});

import { useSuppliers } from '@/lib/hooks/useSuppliers';

function PembelianPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('editId');

  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);

  const {
    items,
    addItem,
    updateQty,
    updateHargaBeli,
    updateHargaJual,
    removeItem,
    reset,
    getTotalSistem,
    getSelisih,
    setTotalSupplier,
    setTanggal,
    totalSupplier,
    tanggal,
    nomorNota,
    setNomorNota,
    editId,
    loadPembelian,
  } = usePembelianStore();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastPurchaseItems, setLastPurchaseItems] = useState<typeof items>([]);

  // Load existing purchase if editId is provided
  useEffect(() => {
    if (editIdParam) {
      let cancelled = false;
      setLoading(true);
      purchasesApi.getById(editIdParam).then((res: any) => {
        if (cancelled) return;
        if (res.data) {
          loadPembelian(res.data);
        } else {
          toast.error('Gagal memuat data transaksi');
        }
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    } else {
      // Clear store if not editing (just in case they navigated from edit to new)
      if (editId) {
        reset();
      }
    }
  }, [editIdParam, editId, loadPembelian, reset]);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data || [];
    },
  });

  const [barcodeInput, setBarcodeInput] = useState('');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'qty' | 'harga' | 'harga_jual' | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [confirmDiscontinuedItem, setConfirmDiscontinuedItem] = useState<
    (import('@/types/inventory').InventoryItem & { barcode?: string }) | null
  >(null);

  const [inventorySearchResults, setInventorySearchResults] = useState<
    (import('@/types/inventory').InventoryItem & { similarity: number })[]
  >([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const searchSeqRef = useRef(0);
  const isProcessingBarcodeRef = useRef(false);

  const handleSearchInventory = useCallback(
    async (query: string, allInventory: import('@/types/inventory').InventoryItem[]) => {
      const seq = ++searchSeqRef.current;
      if (query.length < 2) {
        setInventorySearchResults([]);
        setShowAddDropdown(false);
        setSearchSelectedIndex(-1);
        return;
      }
      const result = await inventoryApi.fuzzySearch(query, allInventory);
      if (seq !== searchSeqRef.current) return;

      if (!result.error && result.data) {
        setInventorySearchResults(
          result.data as (import('@/types/inventory').InventoryItem & { similarity: number })[],
        );
        setShowAddDropdown(true); // Always show dropdown if query >= 2, to show the Add New button
      }
    },
    [],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce(
        (query: string, allInventory: import('@/types/inventory').InventoryItem[]) =>
          handleSearchInventory(query, allInventory),
        300,
      ),
    [handleSearchInventory],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const { data: supplierList = [] } = useSuppliers();
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const performAddItem = useCallback(
    (item: import('@/types/inventory').InventoryItem & { barcode?: string }) => {
      addItem({
        id: item.id,
        barcode: item.kode_barcode,
        nama_barang: item.nama_barang,
        harga_jual: item.harga_jual,
        harga_beli: item.harga_beli_terakhir || 0,
        diskon: item.diskon || 0,
        stok: item.stok,
        minimum_stock: item.minimum_stock,
        kategori: item.kategori,
      });
      setBarcodeInput('');
      setShowAddDropdown(false);
      setInventorySearchResults([]);
      focusInput();
      setLoading(false);
    },
    [addItem, focusInput],
  );

  const handleAddResolvedItem = useCallback(
    (item: import('@/types/inventory').InventoryItem & { barcode?: string }) => {
      if (item.is_discontinued) {
        setConfirmDiscontinuedItem(item);
        return;
      }
      performAddItem(item);
    },
    [performAddItem],
  );

  const handleConfirmDiscontinued = useCallback(async () => {
    if (!confirmDiscontinuedItem) return;
    try {
      setLoading(true);
      await inventoryApi.update(confirmDiscontinuedItem.id, { is_discontinued: false });
      performAddItem(confirmDiscontinuedItem);
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengaktifkan barang.');
      setLoading(false);
    } finally {
      setConfirmDiscontinuedItem(null);
    }
  }, [confirmDiscontinuedItem, performAddItem]);

  useKeyboardShortcuts([
    {
      key: 'F2',
      handler: () => {
        if (items.length > 0) {
          setSelectedIndex(0);
          setEditMode('qty');
          setEditValue(items[0].qty);
        }
      },
      description: 'Edit Qty baris pertama',
      allowInInput: true,
    },
    {
      key: 'F3',
      handler: () => {
        if (items.length > 0) {
          setSelectedIndex(0);
          setEditMode('harga');
          setEditValue(items[0].harga_beli || 0);
        }
      },
      description: 'Edit Harga baris pertama',
      allowInInput: true,
    },
    {
      key: 'F4',
      handler: () => {
        if (items.length > 0) {
          setSelectedIndex(0);
          setEditMode('harga_jual');
          setEditValue(items[0].harga_jual || 0);
        }
      },
      description: 'Edit Harga Jual baris pertama',
      allowInInput: true,
    },
    {
      key: 'Delete',
      handler: () => {
        if (selectedIndex !== null && items[selectedIndex]) {
          removeItem(items[selectedIndex].id);
          setSelectedIndex((prev) => (prev === null ? null : Math.max(0, prev - 1)));
        }
      },
      description: 'Hapus item terpilih',
      allowInInput: true,
    },
    {
      key: 'Escape',
      handler: () => {
        setEditMode(null);
        setSelectedIndex(null);
      },
      description: 'Batal edit',
      allowInInput: true,
    },
    {
      key: 'F6',
      handler: () => {
        setShowResetConfirm(true);
      },
      description: 'Reset form',
      allowInInput: true,
    },
    {
      key: 'F9',
      handler: () => {
        if (items.length > 0 && !submitting) {
          handleSimpan();
        }
      },
      description: 'Simpan Pembelian',
      allowInInput: true,
    },
  ]);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (searchSelectedIndex >= 0) {
      const el = document.getElementById(`search-item-${searchSelectedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [searchSelectedIndex]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleBarcodeSubmit = useCallback(
    async (input: string) => {
      if (loading || submitting || isProcessingBarcodeRef.current) return;

      const normalized = normalizeBarcode(input);
      if (!normalized) return;

      isProcessingBarcodeRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const exactResult = await inventoryApi.getByExactBarcode(normalized);

        if (exactResult.data) {
          handleAddResolvedItem(exactResult.data);
          return;
        }

        const fuzzyResult = await inventoryApi.fuzzySearch(normalized, inventoryData || []);

        if (fuzzyResult.data && fuzzyResult.data.length > 0) {
          const fuzzyItems = fuzzyResult.data as Array<InventoryItem & { similarity: number }>;
          const exactMatch = fuzzyItems.find((item) => item.similarity === 100);

          if (exactMatch) {
            handleAddResolvedItem(exactMatch);
            return;
          }
        }

        const isLikelyBarcode = /^[A-Z0-9]{4,}$/i.test(normalized);

        setNewItemBarcode(isLikelyBarcode ? normalized : '');
        setNewItemName(isLikelyBarcode ? '' : normalized);
        setShowNewItemDialog(true);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError('Terjadi kesalahan saat memproses barcode');
        setLoading(false);
      } finally {
        isProcessingBarcodeRef.current = false;
      }
    },
    [loading, submitting, handleAddResolvedItem, inventoryData],
  );

  const handleCreateNewFromInput = useCallback(() => {
    setShowAddDropdown(false);
    const normalized = normalizeBarcode(barcodeInput);
    const isLikelyBarcode = /^[A-Z0-9]{4,}$/i.test(normalized);
    setNewItemBarcode(isLikelyBarcode ? normalized : '');
    setNewItemName(isLikelyBarcode ? '' : barcodeInput);
    setShowNewItemDialog(true);
  }, [barcodeInput]);

  const handleCreateNewItem = useCallback(
    async (data: {
      nama_barang: string;
      barcode: string;
      kategori: string;
      id_kategori?: string;
      harga_beli: number;
      harga_jual: number;
      diskon: number;
    }) => {
      try {
        const result = await inventoryApi.create({
          nama_barang: data.nama_barang,
          kode_barcode: data.barcode,
          id_kategori: data.id_kategori,
          harga_beli_terakhir: data.harga_beli,
          harga_jual: data.harga_jual,
          diskon: data.diskon,
        });
        if (!result.error && result.data) {
          handleAddResolvedItem({
            ...result.data,
            kategori: result.data.id_kategori ?? { id: '', nama: data.kategori },
          });
          setShowNewItemDialog(false);
        } else if (result.error) {
          setError(result.error.message || 'Gagal membuat barang baru');
        }
      } catch (err) {
        console.error('Error creating item:', err);
        setError('Gagal membuat barang baru');
      }
    },
    [handleAddResolvedItem],
  );

  const handleSimpan = async () => {
    if (items.length === 0) {
      toast.error('Keranjang belanja kosong');
      return;
    }

    setSubmitting(true);

    try {
      if (editId) {
        const result = await purchaseApi.updateBatch({
          pembelian_id: editId,
          supplier_id: selectedSupplierId,
          tanggal,
          nomor_nota: nomorNota,
          items: items.map((item) => ({
            id: item.id,
            nama_barang: item.nama_barang,
            qty: item.qty,
            harga_final: item.harga_beli || 0,
            harga_jual: item.harga_jual,
            diskon: item.diskon,
          })),
        });

        if (result.error) {
          throw new Error(result.error.message || 'Gagal merevisi transaksi');
        }

        toast.success('Revisi transaksi berhasil disimpan');
        setLastPurchaseItems([...items]);
        reset();
        setSelectedSupplierId(null);
        setSupplier('');

        router.push('/transactions/history?type=pembelian');
      } else {
        const pembelianItems = items.map((item) => ({
          inventory_id: item.id,
          barcode: item.barcode,
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_beli: item.harga_beli,
          harga_jual: item.harga_jual,
          diskon: item.diskon,
          harga_final: item.harga_final,
          subtotal: item.subtotal,
        }));

        const result = await purchaseApi.submit({
          supplier_id: selectedSupplierId,
          tanggal,
          nomor_nota: nomorNota,
          items: pembelianItems as any[], // cast to any[] or PembelianItem[] if needed
          total_supplier: totalSupplier,
        });

        if (result.error) {
          throw new Error(result.error.message || 'Gagal menyimpan transaksi');
        }

        toast.success('Transaksi berhasil disimpan');
        setLastPurchaseItems([...items]);
        setShowSuccessDialog(true);
        reset();
        setSelectedSupplierId(null);
        setSupplier('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = useCallback(() => {
    if (selectedIndex === null || !editMode) return;

    const value = editValue;
    if (isNaN(value) || value < 0) return;

    const itemId = items[selectedIndex].id;

    if (editMode === 'qty') {
      if (value === 0) {
        removeItem(itemId);
      } else {
        updateQty(itemId, value);
      }
    } else if (editMode === 'harga') {
      updateHargaBeli(itemId, value);
    } else if (editMode === 'harga_jual') {
      updateHargaJual(itemId, value);
    }

    setEditMode(null);
    setSelectedIndex(null);
    focusInput();
  }, [
    items,
    selectedIndex,
    editMode,
    editValue,
    updateQty,
    updateHargaBeli,
    updateHargaJual,
    removeItem,
    focusInput,
  ]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (['Enter', 'ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        const value = editValue;
        if (!isNaN(value) && value >= 0) {
          const itemId = items[index].id;
          if (editMode === 'qty') {
            if (value === 0) removeItem(itemId);
            else updateQty(itemId, value);
          } else if (editMode === 'harga') {
            updateHargaBeli(itemId, value);
          } else if (editMode === 'harga_jual') {
            updateHargaJual(itemId, value);
          }
        }

        let nextIndex = index;
        let nextMode = editMode;

        if (e.key === 'Enter') {
          setEditMode(null);
          setSelectedIndex(null);
          focusInput();
          return;
        } else if (e.key === 'ArrowUp') {
          nextIndex = Math.max(0, index - 1);
        } else if (e.key === 'ArrowDown') {
          nextIndex = index + 1;
        } else if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (editMode === 'harga_jual') nextMode = 'harga';
            else if (editMode === 'harga') nextMode = 'qty';
            else if (editMode === 'qty') {
              nextMode = 'harga_jual';
              nextIndex = Math.max(0, index - 1);
            }
          } else {
            if (editMode === 'qty') nextMode = 'harga';
            else if (editMode === 'harga') nextMode = 'harga_jual';
            else if (editMode === 'harga_jual') {
              nextMode = 'qty';
              nextIndex = index + 1;
            }
          }
        }

        if (items[nextIndex] && nextMode) {
          setSelectedIndex(nextIndex);
          setEditMode(nextMode);
          if (nextMode === 'qty') setEditValue(items[nextIndex].qty);
          else if (nextMode === 'harga') setEditValue(items[nextIndex].harga_beli || 0);
          else if (nextMode === 'harga_jual') setEditValue(items[nextIndex].harga_jual || 0);
        } else {
          setEditMode(null);
          setSelectedIndex(null);
          focusInput();
        }
      }
    },
    [
      items,
      editMode,
      editValue,
      updateQty,
      updateHargaBeli,
      updateHargaJual,
      removeItem,
      focusInput,
    ],
  );

  const totalSistem = getTotalSistem();
  const selisih = getSelisih();
  const isValid = selisih === 0;

  return (
    <ErrorBoundary>
      <AmbientLayout>
        <AdminOnly>
          <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)]">
            {/* Header Section */}
            <div className="mb-4 flex-shrink-0 lg:mb-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 pl-2 lg:gap-4 lg:pl-0">
                  <button
                    onClick={() => router.back()}
                    className="-ml-2 rounded-xl p-2 text-neutral-600 transition-all hover:bg-neutral-100 active:scale-95 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    <IconArrowLeft className="h-6 w-6" />
                  </button>
                  <IconShoppingCart
                    className="text-brand-500 hidden h-6 w-6 shrink-0 lg:block lg:h-8 lg:w-8"
                    stroke={1.5}
                  />
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                      {editId ? 'Revisi Transaksi' : 'Transaksi Baru'}
                    </h1>
                    <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                      {editId
                        ? 'Ubah detail barang, supplier, dan faktur untuk transaksi pembelian'
                        : 'Catat pembelian barang dari supplier (barang masuk)'}
                    </p>
                  </div>
                </div>

                <div className="hidden items-end gap-3 lg:gap-4 xl:flex">
                  <div className="min-w-[140px] flex-1">
                    <DateInput
                      value={tanggal}
                      onChange={setTanggal}
                      label="Tanggal:"
                      inputSize="md"
                    />
                  </div>
                  <div className="min-w-[140px] flex-1">
                    <TextInput
                      label="Nota:"
                      value={nomorNota}
                      onChange={(e) => setNomorNota(e.target.value)}
                      placeholder="Nomor nota..."
                      inputSize="md"
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex w-full flex-1 gap-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleBarcodeSubmit(barcodeInput);
                    }}
                    className="relative flex-1"
                  >
                    <div className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-neutral-400">
                      <IconScan size={22} />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Cari atau scan barcode..."
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value);
                        setSearchSelectedIndex(-1);
                        debouncedSearch(e.target.value, inventoryData || []);
                      }}
                      onFocus={() => {
                        if (barcodeInput.length >= 2) setShowAddDropdown(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowAddDropdown(false), 200);
                      }}
                      onKeyDown={(e) => {
                        if (!showAddDropdown) return;
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSearchSelectedIndex((prev) =>
                            Math.min(prev + 1, inventorySearchResults.length),
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSearchSelectedIndex((prev) => Math.max(prev - 1, -1));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            handleCreateNewFromInput();
                          } else if (
                            searchSelectedIndex >= 0 &&
                            searchSelectedIndex < inventorySearchResults.length
                          ) {
                            handleAddResolvedItem(inventorySearchResults[searchSelectedIndex]);
                          } else if (searchSelectedIndex === inventorySearchResults.length) {
                            handleCreateNewFromInput();
                          } else {
                            handleBarcodeSubmit(barcodeInput);
                          }
                        }
                      }}
                      disabled={loading}
                      className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-white py-3.5 pr-4 pl-12 text-base shadow-sm backdrop-blur-md transition-all focus:ring-2 focus:outline-none focus:ring-inset lg:text-lg dark:border-neutral-700 dark:bg-neutral-900"
                      autoFocus
                    />
                    {showAddDropdown && barcodeInput.length >= 2 && (
                      <div className="absolute z-20 mt-2 max-h-[40vh] w-full scroll-pb-16 overflow-auto rounded-xl border border-neutral-200 bg-white shadow-xl md:max-h-80 dark:border-neutral-700 dark:bg-neutral-900">
                        {(Array.isArray(inventorySearchResults) ? inventorySearchResults : []).map(
                          (inventory, idx) => (
                            <button
                              key={inventory.id}
                              id={`search-item-${idx}`}
                              type="button"
                              onClick={() => handleAddResolvedItem(inventory)}
                              className={`flex w-full items-center justify-between border-b border-neutral-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800 ${searchSelectedIndex === idx ? 'bg-neutral-50 dark:bg-neutral-800' : ''}`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                    {inventory.nama_barang}
                                  </span>
                                  {inventory.is_discontinued && (
                                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                      Discontinue
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                  {inventory.kode_barcode || 'Tanpa barcode'} | Stok:{' '}
                                  {inventory.stok}
                                </div>
                              </div>
                              <div className="bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 ml-2 rounded-full px-2 py-1 text-xs whitespace-nowrap">
                                {inventory.similarity}% cocok
                              </div>
                            </button>
                          ),
                        )}

                        {/* Tambah Baru Action */}
                        <div className="sticky bottom-0 border-t border-neutral-100 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
                          <button
                            id={`search-item-${inventorySearchResults.length}`}
                            type="button"
                            onClick={handleCreateNewFromInput}
                            className={`bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-300 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${searchSelectedIndex === inventorySearchResults.length ? 'ring-brand-500 ring-2' : ''}`}
                          >
                            <IconPlus size={18} />
                            <span className="flex-1 text-left">
                              Tambah &quot;{barcodeInput}&quot; sebagai barang baru
                            </span>
                            <kbd className="bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 hidden rounded-md border px-2 py-0.5 text-[10px] font-semibold sm:inline-block">
                              Shift + Enter
                            </kbd>
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                  <Button
                    variant="secondary"
                    onClick={() => setShowImportWizard(true)}
                    className="flex w-[54px] shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white !p-0 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
                    title="Import CSV"
                  >
                    <IconFileImport size={22} className="text-neutral-600 dark:text-neutral-400" />
                  </Button>
                </div>

                <div className="animate-fade-in-up hidden xl:block">
                  <SelectInput
                    label="Supplier"
                    value={selectedSupplierId || ''}
                    onChange={(id) => {
                      const s = supplierList.find((x) => x.id === id);
                      setSelectedSupplierId(id || null);
                      setSupplier(s ? s.nama : '');
                    }}
                    options={(Array.isArray(supplierList) ? supplierList : []).map((s) => ({
                      value: s.id,
                      label: s.nama + (s.kontak ? ` (${s.kontak})` : ''),
                    }))}
                    placeholder="-- Pilih Supplier --"
                    className="min-w-[18rem]"
                  />
                </div>

                <div className="hidden min-w-[18rem] flex-col gap-2 xl:flex">
                  <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                    Total Tagihan:
                  </label>
                  <PriceInput
                    value={totalSupplier || 0}
                    onChange={setTotalSupplier}
                    className="focus:border-brand-500 focus:shadow-brand w-full rounded-xl border border-white/40 bg-white/50 px-4 py-3 shadow-sm backdrop-blur-md transition-all focus:outline-none dark:border-white/10 dark:bg-neutral-900/50"
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200/50 bg-red-50/80 p-3 text-sm text-red-600 shadow-sm backdrop-blur-md dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-brand-50/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 border-brand-200/50 dark:border-brand-800/50 mt-4 rounded-xl border p-3 text-sm shadow-sm backdrop-blur-md">
                  {success}
                </div>
              )}
            </div>

            {/* Main Table Area */}
            <div className="shadow-elevated mb-6 flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:min-h-0 dark:border-white/10 dark:bg-neutral-900/60">
              <ItemCart
                items={items}
                selectedIndex={selectedIndex}
                editMode={editMode}
                editValue={editValue}
                setSelectedIndex={setSelectedIndex}
                setEditMode={setEditMode}
                setEditValue={setEditValue}
                handleEditSubmit={handleEditSubmit}
                handleEditKeyDown={handleEditKeyDown}
                removeItem={removeItem}
              />
            </div>

            {/* Desktop Footer Section */}
            <div className="relative bottom-0 hidden flex-shrink-0 xl:block">
              <div className="shadow-elevated rounded-3xl border border-white/40 bg-white/80 p-4 backdrop-blur-xl lg:p-5 dark:border-white/10 dark:bg-neutral-900/80">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 text-center shadow-sm backdrop-blur-md lg:rounded-2xl lg:px-5 lg:py-4 lg:text-left dark:border-white/10 dark:bg-neutral-950/50">
                      <p className="text-[10px] font-medium whitespace-nowrap text-neutral-500 sm:text-xs lg:text-sm dark:text-neutral-400">
                        Total Sistem
                      </p>
                      <p className="mt-0.5 text-sm font-black text-neutral-900 sm:text-xl lg:text-2xl dark:text-white">
                        {formatCurrency(totalSistem)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 text-center shadow-sm backdrop-blur-md lg:rounded-2xl lg:px-5 lg:py-4 lg:text-left dark:border-white/10 dark:bg-neutral-950/50">
                      <p className="text-[10px] font-medium whitespace-nowrap text-neutral-500 sm:text-xs lg:text-sm dark:text-neutral-400">
                        Total Tagihan
                      </p>
                      <p className="mt-0.5 text-sm font-black text-neutral-900 sm:text-xl lg:text-2xl dark:text-white">
                        {formatCurrency(totalSupplier)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/40 bg-white/50 px-3 py-2.5 text-center shadow-sm backdrop-blur-md lg:rounded-2xl lg:px-5 lg:py-4 lg:text-left dark:border-white/10 dark:bg-neutral-950/50">
                      <p className="text-[10px] font-medium whitespace-nowrap text-neutral-500 sm:text-xs lg:text-sm dark:text-neutral-400">
                        Selisih
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-black sm:text-xl lg:text-2xl ${isValid ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {formatCurrency(selisih)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <div className="group relative">
                      <span className="pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 group-hover:block sm:block dark:bg-neutral-700 dark:text-neutral-300">
                        F6
                      </span>
                      <Button
                        variant="secondary"
                        onClick={() => setShowResetConfirm(true)}
                        className="border-white/40 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/50"
                        leftIcon={<IconRefresh className="h-5 w-5" />}
                      >
                        <span className="hidden sm:inline">Reset</span>
                      </Button>
                    </div>
                    <div className="group relative">
                      <span className="bg-brand-200 dark:bg-brand-900 text-brand-700 dark:text-brand-300 pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded px-1.5 py-0.5 text-[10px] font-bold group-hover:block sm:block">
                        F9
                      </span>
                      <Button
                        onClick={handleSimpan}
                        disabled={items.length === 0 || submitting}
                        variant="primary"
                        size="lg"
                        className="shadow-brand px-8"
                        leftIcon={<IconDeviceFloppy className="h-5 w-5" />}
                      >
                        <span className="hidden sm:inline">
                          {submitting
                            ? 'Menyimpan...'
                            : editId
                              ? 'Simpan Revisi'
                              : 'Simpan Pembelian'}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Mini Cart (Trigger) */}
            <div className="fixed right-0 bottom-0 left-0 z-[40] rounded-t-3xl border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 xl:hidden dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
              <div
                className={`flex h-[4.5rem] cursor-pointer items-center justify-between px-4 transition-opacity ${items.length === 0 ? 'pointer-events-none opacity-50' : 'rounded-t-3xl opacity-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                onClick={() => setIsBottomSheetOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-brand-50 dark:bg-brand-900/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <IconShoppingCart className="text-brand-600 dark:text-brand-400" size={20} />
                  </div>
                  <div>
                    <p className="mb-0.5 text-[10px] leading-tight font-medium text-neutral-500 dark:text-neutral-400">
                      Total Sistem
                    </p>
                    <p className="text-brand-600 dark:text-brand-400 text-lg leading-tight font-black">
                      {formatCurrency(totalSistem)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 pr-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">
                  <span>Checkout</span>
                  <IconArrowRight size={18} />
                </div>
              </div>
            </div>

            {/* Vaul Bottom Sheet for Checkout Details */}
            <Modal
              isOpen={isBottomSheetOpen}
              onClose={() => setIsBottomSheetOpen(false)}
              isBottomSheetOnMobile
              title="Selesaikan Pembelian"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4">
                  <DateInput label="Tanggal" value={tanggal} onChange={setTanggal} inputSize="md" />

                  <div>
                    <TextInput
                      label="Nomor Nota (Opsional)"
                      value={nomorNota}
                      onChange={(e) => setNomorNota(e.target.value)}
                      placeholder="Contoh: INV-2023001"
                      inputSize="md"
                    />
                  </div>

                  <SelectInput
                    label="Supplier"
                    value={selectedSupplierId || ''}
                    onChange={(id) => {
                      const s = supplierList.find((x) => x.id === id);
                      setSelectedSupplierId(id || null);
                      setSupplier(s ? s.nama : '');
                    }}
                    options={(Array.isArray(supplierList) ? supplierList : []).map((s) => ({
                      value: s.id,
                      label: s.nama + (s.kontak ? ` (${s.kontak})` : ''),
                    }))}
                    placeholder="-- Pilih Supplier --"
                  />

                  <PriceInput
                    label="Total Tagihan"
                    value={totalSupplier || 0}
                    onChange={setTotalSupplier}
                    className="w-full transition-all focus:outline-none"
                    placeholder="0"
                    min={0}
                  />

                  <div className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Selisih
                    </span>
                    <span
                      className={`text-lg font-black ${isValid ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {formatCurrency(selisih)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <div className="relative flex-1">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsBottomSheetOpen(false);
                        setShowResetConfirm(true);
                      }}
                      className="w-full"
                      leftIcon={<IconRefresh size={18} />}
                    >
                      Reset
                    </Button>
                  </div>
                  <div className="relative flex-1">
                    <Button
                      onClick={handleSimpan}
                      disabled={items.length === 0 || submitting}
                      variant="primary"
                      className="shadow-brand w-full"
                      leftIcon={<IconDeviceFloppy size={18} />}
                    >
                      {editId ? 'Simpan Revisi' : 'Simpan'}
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>
          </div>

          <NewItemDialog
            open={showNewItemDialog}
            initialBarcode={newItemBarcode}
            initialName={newItemName}
            onClose={() => {
              setShowNewItemDialog(false);
              setBarcodeInput('');
              focusInput();
            }}
            onSubmit={handleCreateNewItem}
          />

          <ImportCSVWizard
            open={showImportWizard}
            onClose={() => {
              setShowImportWizard(false);
              focusInput();
            }}
            onComplete={(
              importedItems: {
                item: import('@/types/inventory').InventoryItem;
                qty: number;
                harga_beli: number;
              }[],
            ) => {
              importedItems.forEach(({ item, qty, harga_beli }) => {
                addItem(
                  {
                    ...item,
                    barcode: item.kode_barcode || item.barcode,
                    harga_beli: harga_beli || item.harga_beli_terakhir || 0,
                    diskon: item.diskon || 0,
                  },
                  qty,
                );
              });
              setShowImportWizard(false);
              setSuccess(`${importedItems.length} macam barang berhasil diimpor`);
              focusInput();
            }}
          />

          <Modal
            isOpen={showSuccessDialog}
            onClose={() => setShowSuccessDialog(false)}
            title="Pembelian Berhasil"
          >
            <div className="p-6">
              <p className="mb-6 text-neutral-600 dark:text-neutral-400">
                Transaksi pembelian berhasil disimpan. Apakah Anda ingin langsung mencetak label
                barcode untuk barang-barang ini?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowSuccessDialog(false)}>
                  Nanti Saja
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<IconPrinter className="h-5 w-5" />}
                  onClick={() => {
                    resetBulkPrint();
                    lastPurchaseItems.forEach((item) => {
                      if (item.qty > 0) {
                        addBulkPrintItem(item, item.qty);
                      }
                    });
                    router.push('/bulk-print');
                  }}
                >
                  Cetak Label Sekarang
                </Button>
              </div>
            </div>
          </Modal>

          <ConfirmDialog
            isOpen={showResetConfirm}
            title="Konfirmasi Reset"
            message="Apakah Anda yakin ingin mengosongkan daftar pembelian? Semua item yang telah dimasukkan akan dihapus."
            confirmLabel="Ya, Reset"
            cancelLabel="Batal"
            onConfirm={() => {
              reset();
              setTotalSupplier(0);
              focusInput();
              setShowResetConfirm(false);
              setIsBottomSheetOpen(false);
            }}
            onCancel={() => setShowResetConfirm(false)}
            danger={true}
          />

          <ConfirmDialog
            isOpen={!!confirmDiscontinuedItem}
            title="Aktifkan Barang"
            message={`Barang "${confirmDiscontinuedItem?.nama_barang}" saat ini berstatus Discontinue. Yakin ingin menambahkannya ke daftar pembelian? (Status barang akan otomatis kembali aktif).`}
            confirmLabel="Ya, Aktifkan & Tambahkan"
            cancelLabel="Batal"
            onConfirm={handleConfirmDiscontinued}
            onCancel={() => {
              setConfirmDiscontinuedItem(null);
              focusInput();
            }}
          />
        </AdminOnly>
      </AmbientLayout>
    </ErrorBoundary>
  );
}

export default function PembelianPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="border-brand-500 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      }
    >
      <PembelianPageContent />
    </Suspense>
  );
}
