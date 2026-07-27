'use client';
import { toast } from 'sonner';
import { useState, useCallback, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePembelianStore, useBulkPrintStore } from '@/lib/store';
import { inventoryApi, PembelianItem, purchaseApi, purchasesApi, kategoriApi, supplierApi, Supplier } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency, normalizeBarcode, generateIdempotencyKey, generateAutoBarcode, debounce } from '@/lib/utils';
import { IconShoppingCart, IconCamera, IconFileImport, IconX, IconCheck, IconDeviceFloppy, IconRefresh, IconSearch, IconPlus, IconPrinter, IconChevronUp, IconArrowRight, IconScan, IconArrowLeft } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, Badge, Banner , Modal } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Portal } from '@/components/ui/Portal';
import { AdminOnly } from '@/components/role';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import { NewItemDialog } from './NewItemDialog';
import { ItemCart } from './ItemCart';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import dynamic from 'next/dynamic';

const ImportCSVWizard = dynamic(
  () => import('@/components/purchasing/ImportCSVWizard'),
  {
    loading: () => <div className="skeleton-shimmer h-64 rounded-2xl" />,
    ssr: false,
  }
);

import { useSuppliers } from '@/lib/hooks/useSuppliers';

function PembelianPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('editId');
  
  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);

  const { items, addItem, updateQty, updateHargaBeli, updateHargaJual, removeItem, reset, getTotalSistem, getSelisih, setTotalSupplier, setTanggal, totalSupplier, tanggal, nomorNota, setNomorNota, editId, loadPembelian } = usePembelianStore();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastPurchaseItems, setLastPurchaseItems] = useState<typeof items>([]);

  // Load existing purchase if editId is provided
  useEffect(() => {
    if (editIdParam) {
      setLoading(true);
      purchasesApi.getById(editIdParam).then((res: any) => {
        if (res.data) {
          loadPembelian(res.data);
        } else {
          toast.error('Gagal memuat data transaksi');
        }
        setLoading(false);
      });
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
  
  const [inventorySearchResults, setInventorySearchResults] = useState<(import('@/types/inventory').InventoryItem & { similarity: number })[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSearchInventory = async (query: string, allInventory: import('@/types/inventory').InventoryItem[]) => {
    if (query.length < 2) {
      setInventorySearchResults([]);
      setShowAddDropdown(false);
      setSearchSelectedIndex(-1);
      return;
    }
    const result = await inventoryApi.fuzzySearch(query, allInventory);
    if (!result.error && result.data) {
      setInventorySearchResults(result.data as (import('@/types/inventory').InventoryItem & { similarity: number })[]);
      setShowAddDropdown(true); // Always show dropdown if query >= 2, to show the Add New button
    }
  };

  const debouncedSearch = useMemo(
    () => debounce((query: string, allInventory: import('@/types/inventory').InventoryItem[]) => handleSearchInventory(query, allInventory), 300),
    []
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

  const handleAddResolvedItem = useCallback((item: import('@/types/inventory').InventoryItem & { barcode?: string }) => {
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
  }, [addItem, focusInput]);

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
          setSelectedIndex((prev) => prev === null ? null : Math.max(0, prev - 1));
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
    }
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

  const handleBarcodeSubmit = useCallback(async (input: string) => {
    if (loading || submitting) return;
    
    const normalized = normalizeBarcode(input);
    if (!normalized) return;

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
        const exactMatch = fuzzyItems.find(item => item.similarity === 100);
        
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
    }
  }, [loading, submitting, handleAddResolvedItem, inventoryData]);

  const handleCreateNewFromInput = useCallback(() => {
    setShowAddDropdown(false);
    const normalized = normalizeBarcode(barcodeInput);
    const isLikelyBarcode = /^[A-Z0-9]{4,}$/i.test(normalized);
    setNewItemBarcode(isLikelyBarcode ? normalized : '');
    setNewItemName(isLikelyBarcode ? '' : barcodeInput);
    setShowNewItemDialog(true);
  }, [barcodeInput]);

  const handleCreateNewItem = useCallback(async (data: { nama_barang: string; barcode: string; kategori: string; id_kategori?: string; harga_beli: number; harga_jual: number; diskon: number }) => {
    try {
      const result = await inventoryApi.create({
        nama_barang: data.nama_barang,
        kode_barcode: data.barcode,
        id_kategori: data.id_kategori,
        harga_beli_terakhir: data.harga_beli,
        harga_jual: data.harga_jual,
        diskon: data.diskon
      });
      if (!result.error && result.data) {
        handleAddResolvedItem({
          ...result.data,
          kategori: result.data.id_kategori ?? { id: '', nama: data.kategori }
        });
        setShowNewItemDialog(false);
      } else if (result.error) {
        setError(result.error.message || 'Gagal membuat barang baru');
      }
    } catch (err) {
      console.error('Error creating item:', err);
      setError('Gagal membuat barang baru');
    }
  }, [handleAddResolvedItem]);

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
          items: items.map(item => ({
            id: item.id,
            nama_barang: item.nama_barang,
            qty: item.qty,
            harga_final: item.harga_beli,
            harga_jual: item.harga_jual,
            diskon: item.diskon
          }))
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
        const pembelianItems = items.map(item => ({
          inventory_id: item.id,
          barcode: item.barcode,
          nama_barang: item.nama_barang,
          qty: item.qty,
          harga_beli: item.harga_beli,
          harga_jual: item.harga_jual,
          diskon: item.diskon,
          harga_final: item.harga_final,
          subtotal: item.subtotal
        }));
        
        const result = await purchaseApi.submit({
          supplier_id: selectedSupplierId,
          tanggal,
          nomor_nota: nomorNota,
          items: pembelianItems as any[], // cast to any[] or PembelianItem[] if needed
          total_supplier: totalSupplier
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
  }, [items, selectedIndex, editMode, editValue, updateQty, updateHargaBeli, updateHargaJual, removeItem, focusInput]);

  const totalSistem = getTotalSistem();
  const selisih = getSelisih();
  const isValid = selisih === 0;

  return (
    <ErrorBoundary>
      <AmbientLayout>
      <AdminOnly>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)]">
        {/* Header Section */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-3 lg:gap-4 pl-2 lg:pl-0">
              <button 
                onClick={() => router.back()}
                className="lg:hidden p-2 -ml-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 transition-all"
              >
                <IconArrowLeft className="w-6 h-6" />
              </button>
              <IconShoppingCart className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0 hidden lg:block" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  {editId ? 'Revisi Transaksi' : 'Transaksi Baru'}
                </h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">
                  {editId ? 'Ubah detail barang, supplier, dan faktur untuk transaksi pembelian' : 'Catat pembelian barang dari supplier (barang masuk)'}
                </p>
              </div>
            </div>
            
            <div className="hidden xl:flex items-end gap-3 lg:gap-4">
              <div className="flex-1 min-w-[140px]">
                <DateInput
                  value={tanggal}
                  onChange={setTanggal}
                  label="Tanggal:"
                  inputSize="md"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="text-sm text-neutral-600 dark:text-neutral-300 font-semibold mb-1 block">Nota:</label>
                <input
                  type="text"
                  value={nomorNota}
                  onChange={(e) => setNomorNota(e.target.value)}
                  placeholder="Nomor nota..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between relative z-10">
            <div className="flex-1 flex gap-2 w-full">
              <form onSubmit={(e) => {
                e.preventDefault();
                handleBarcodeSubmit(barcodeInput);
              }} className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10 pointer-events-none">
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
                    setSearchSelectedIndex(prev => Math.min(prev + 1, inventorySearchResults.length));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => Math.max(prev - 1, -1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handleCreateNewFromInput();
                    } else if (searchSelectedIndex >= 0 && searchSelectedIndex < inventorySearchResults.length) {
                      handleAddResolvedItem(inventorySearchResults[searchSelectedIndex]);
                    } else if (searchSelectedIndex === inventorySearchResults.length) {
                      handleCreateNewFromInput();
                    } else {
                      handleBarcodeSubmit(barcodeInput);
                    }
                  }
                }}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 transition-all text-base lg:text-lg"
                autoFocus
              />
              {showAddDropdown && barcodeInput.length >= 2 && (
                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-[40vh] md:max-h-80 overflow-auto scroll-pb-16">
                  {(Array.isArray(inventorySearchResults) ? inventorySearchResults : []).map((inventory, idx) => (
                    <button
                      key={inventory.id}
                      id={`search-item-${idx}`}
                      type="button"
                      onClick={() => handleAddResolvedItem(inventory)}
                      className={`w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${searchSelectedIndex === idx ? 'bg-neutral-50 dark:bg-neutral-800' : ''}`}
                    >
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{inventory.nama_barang}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">{inventory.kode_barcode || 'Tanpa barcode'} | Stok: {inventory.stok}</div>
                      </div>
                      <div className="text-xs bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                        {inventory.similarity}% cocok
                      </div>
                    </button>
                  ))}
                  
                  {/* Tambah Baru Action */}
                  <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 sticky bottom-0 bg-white dark:bg-neutral-900">
                    <button
                      id={`search-item-${inventorySearchResults.length}`}
                      type="button"
                      onClick={handleCreateNewFromInput}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-300 rounded-lg transition-colors font-medium text-sm ${searchSelectedIndex === inventorySearchResults.length ? 'ring-2 ring-brand-500' : ''}`}
                    >
                      <IconPlus size={18} />
                      <span className="flex-1 text-left">Tambah &quot;{barcodeInput}&quot; sebagai barang baru</span>
                      <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-md border border-brand-200 dark:border-brand-800">Shift + Enter</kbd>
                    </button>
                  </div>
                </div>
              )}
              </form>
              <Button 
                variant="secondary" 
                onClick={() => setShowImportWizard(true)}
                className="flex items-center justify-center !p-0 w-[54px] shrink-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-xl"
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
                  const s = supplierList.find(x => x.id === id);
                  setSelectedSupplierId(id || null);
                  setSupplier(s ? s.nama : '');
                }}
                options={(Array.isArray(supplierList) ? supplierList : []).map(s => ({
                  value: s.id,
                  label: s.nama + (s.kontak ? ` (${s.kontak})` : '')
                }))}
                placeholder="-- Pilih Supplier --"
                className="min-w-[18rem]"
              />
            </div>

            <div className="hidden xl:flex flex-col gap-2 min-w-[18rem]">
              <label className="text-sm text-neutral-600 dark:text-neutral-300 font-semibold">Total Tagihan:</label>
              <PriceInput
                value={totalSupplier || 0}
                onChange={setTotalSupplier}
                className="w-full px-4 py-3 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all"
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-md text-red-600 dark:text-red-300 rounded-xl text-sm border border-red-200/50 dark:border-red-800/50 shadow-sm">{error}</div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-brand-50/80 dark:bg-brand-900/30 backdrop-blur-md text-brand-600 dark:text-brand-300 rounded-xl text-sm border border-brand-200/50 dark:border-brand-800/50 shadow-sm">{success}</div>
          )}
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6">
          <ItemCart
            items={items}
            selectedIndex={selectedIndex}
            editMode={editMode}
            editValue={editValue}
            setSelectedIndex={setSelectedIndex}
            setEditMode={setEditMode}
            setEditValue={setEditValue}
            handleEditSubmit={handleEditSubmit}
            removeItem={removeItem}
          />
        </div>

        {/* Desktop Footer Section */}
        <div className="hidden xl:block flex-shrink-0 relative bottom-0">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-4 lg:p-5 shadow-elevated">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4 border border-white/40 dark:border-white/10 shadow-sm text-center lg:text-left">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">Total Sistem</p>
                  <p className="text-sm sm:text-xl lg:text-2xl font-black text-neutral-900 dark:text-white mt-0.5">{formatCurrency(totalSistem)}</p>
                </div>
                <div className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4 border border-white/40 dark:border-white/10 shadow-sm text-center lg:text-left">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">Total Tagihan</p>
                  <p className="text-sm sm:text-xl lg:text-2xl font-black text-neutral-900 dark:text-white mt-0.5">{formatCurrency(totalSupplier)}</p>
                </div>
                <div className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4 border border-white/40 dark:border-white/10 shadow-sm text-center lg:text-left">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">Selisih</p>
                  <p className={`text-sm sm:text-xl lg:text-2xl font-black mt-0.5 ${isValid ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(selisih)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end items-center">
                <Button
                  variant="secondary"
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md border-white/40 dark:border-white/10"
                  leftIcon={<IconRefresh className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  onClick={handleSimpan}
                  disabled={items.length === 0 || submitting}
                  variant="primary"
                  size="lg"
                  className="shadow-brand px-8"
                  leftIcon={<IconDeviceFloppy className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">{submitting ? 'Menyimpan...' : (editId ? 'Simpan Revisi' : 'Simpan Pembelian')}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Mini Cart (Trigger) */}
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300">
          <div 
            className={`h-[4.5rem] px-4 flex items-center justify-between cursor-pointer transition-opacity ${items.length === 0 ? 'opacity-50 pointer-events-none' : 'opacity-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-t-3xl'}`}
            onClick={() => setIsBottomSheetOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <IconShoppingCart className="text-brand-600 dark:text-brand-400" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-tight mb-0.5">Total Sistem</p>
                <p className="text-lg font-black text-brand-600 dark:text-brand-400 leading-tight">{formatCurrency(totalSistem)}</p>
              </div>
            </div>
            
            <div className="flex items-center text-neutral-400 dark:text-neutral-500 font-medium text-sm gap-1 pr-1">
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
              <DateInput
                label="Tanggal"
                value={tanggal}
                onChange={setTanggal}
                inputSize="md"
              />

              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">Nomor Nota (Opsional)</label>
                <input
                  type="text"
                  value={nomorNota}
                  onChange={(e) => setNomorNota(e.target.value)}
                  placeholder="Contoh: INV-2023001"
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-shadow"
                />
              </div>

              <SelectInput
                label="Supplier"
                value={selectedSupplierId || ''}
                onChange={(id) => {
                  const s = supplierList.find(x => x.id === id);
                  setSelectedSupplierId(id || null);
                  setSupplier(s ? s.nama : '');
                }}
                options={(Array.isArray(supplierList) ? supplierList : []).map(s => ({
                  value: s.id,
                  label: s.nama + (s.kontak ? ` (${s.kontak})` : '')
                }))}
                placeholder="-- Pilih Supplier --"
              />

              <PriceInput
                label="Total Tagihan"
                value={totalSupplier || 0}
                onChange={setTotalSupplier}
                className="w-full focus:outline-none transition-all"
                placeholder="0"
                min={0}
              />
              
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Selisih</span>
                <span className={`text-lg font-black ${isValid ? 'text-brand-600 dark:text-brand-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(selisih)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                   setIsBottomSheetOpen(false);
                   setShowResetConfirm(true);
                }}
                className="flex-1"
                leftIcon={<IconRefresh size={18} />}
              >
                Reset
              </Button>
              <Button
                onClick={handleSimpan}
                disabled={items.length === 0 || submitting}
                variant="primary"
                className="flex-1 shadow-brand"
                leftIcon={<IconDeviceFloppy size={18} />}
              >
                {editId ? 'Simpan Revisi' : 'Simpan'}
              </Button>
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
        onComplete={(importedItems: { item: import('@/types/inventory').InventoryItem; qty: number; harga_beli: number }[]) => {
          importedItems.forEach(({ item, qty, harga_beli }) => {
            addItem({
              ...item,
              barcode: item.kode_barcode || item.barcode,
              harga_beli: harga_beli || item.harga_beli_terakhir || 0,
              diskon: item.diskon || 0,
            }, qty);
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
            Transaksi pembelian berhasil disimpan. Apakah Anda ingin langsung mencetak label barcode untuk barang-barang ini?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowSuccessDialog(false)}
            >
              Nanti Saja
            </Button>
            <Button
              variant="primary"
              leftIcon={<IconPrinter className="w-5 h-5" />}
              onClick={() => {
                resetBulkPrint();
                lastPurchaseItems.forEach(item => {
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
      </AdminOnly>
      </AmbientLayout>
    </ErrorBoundary>
  );
}

export default function PembelianPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PembelianPageContent />
    </Suspense>
  );
}
