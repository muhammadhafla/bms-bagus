'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePembelianStore, useBulkPrintStore } from '@/lib/store';
import { inventoryApi, PembelianItem, purchaseApi, kategoriApi, supplierApi, Supplier } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency, normalizeBarcode, generateIdempotencyKey, generateAutoBarcode, debounce } from '@/lib/utils';
import { IconShoppingCart, IconCamera, IconPackage, IconX, IconCheck, IconDeviceFloppy, IconRefresh, IconSearch, IconPlus, IconPrinter } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, Badge, Banner, useToast, Modal } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import { NewItemDialog } from './NewItemDialog';
import { ItemCart } from './ItemCart';
import ImportCSVWizard from '@/components/purchasing/ImportCSVWizard';

export default function PembelianPage() {
  const router = useRouter();
  const resetBulkPrint = useBulkPrintStore((state) => state.reset);
  const addBulkPrintItem = useBulkPrintStore((state) => state.addItem);

  const { items, addItem, updateQty, updateHargaBeli, removeItem, reset, getTotalSistem, getSelisih, setTotalSupplier, setTanggal, totalSupplier, tanggal } = usePembelianStore();
  const { showToast } = useToast();

  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastPurchaseItems, setLastPurchaseItems] = useState<typeof items>([]);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data || [];
    },
  });
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'qty' | 'harga' | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemName, setNewItemName] = useState('');
  
  const [inventorySearchResults, setInventorySearchResults] = useState<(import('@/types/inventory').InventoryItem & { similarity: number })[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const handleSearchInventory = async (query: string, allInventory: import('@/types/inventory').InventoryItem[]) => {
    if (query.length < 2) {
      setInventorySearchResults([]);
      setShowAddDropdown(false);
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
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
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
      key: 'Delete',
      handler: () => {
        if (selectedIndex !== null) {
          removeItem(selectedIndex);
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
    const loadSuppliers = async () => {
      const result = await supplierApi.getAll();
      if (result.data) {
        setSupplierList(result.data);
      }
    };
    loadSuppliers();
  }, []);


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
      
      if (inventorySearchResults.length > 0) {
        handleAddResolvedItem(inventorySearchResults[0]);
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
        
        if (fuzzyItems[0].similarity >= 80) {
          handleAddResolvedItem(fuzzyItems[0]);
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
  }, [loading, submitting, handleAddResolvedItem, inventoryData, inventorySearchResults]);

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

  const handleSubmit = useCallback(async () => {
    if (items.length === 0) return;
    if (submitting) return;

    const invalidItem = items.find(item => !item.qty || item.qty <= 0);
    if (invalidItem) {
      setError(`Qty untuk barang ${invalidItem.nama_barang} harus lebih dari 0`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const supplierId = selectedSupplierId;

      const pembelianItems: PembelianItem[] = items.map(item => ({
        inventory_id: item.id,
        barcode: item.barcode,
        nama_barang: item.nama_barang,
        qty: item.qty,
        harga_beli: item.harga_beli || 0,
        diskon: item.diskon,
        harga_final: item.harga_final,
        subtotal: item.subtotal,
      }));

      const idempotencyKey = generateIdempotencyKey();
      
      const result = await purchaseApi.submit({
        supplier_id: supplierId,
        supplier_nama: supplier.trim() || null,
        tanggal,
        items: pembelianItems,
        total_supplier: totalSupplier,
        idempotency_key: idempotencyKey,
      });

      if (result.error) {
        console.error('Pembelian error:', result.error);
        const errorMsg = result.error.message 
          || result.error 
          || 'Gagal menyimpan pembelian';
        setError(String(errorMsg));
        showToast(String(errorMsg), 'error');
      } else {
        setSuccess('Pembelian berhasil disimpan');
        showToast('Pembelian berhasil disimpan', 'success');
        setLastPurchaseItems([...items]);
        setShowSuccessDialog(true);
        reset();
        setTotalSupplier(0);
        setSelectedSupplierId(null);
        setSupplier('');
        focusInput();
      }
    } catch (err: unknown) {
      console.error('Error submitting:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [items, tanggal, totalSupplier, submitting, reset, setTotalSupplier, focusInput, selectedSupplierId, supplier, showToast]);

  const handleEditSubmit = useCallback(() => {
    if (selectedIndex === null || !editMode) return;
    
    const value = editValue;
    if (isNaN(value) || value < 0) return;

    if (editMode === 'qty') {
      if (value === 0) {
        removeItem(selectedIndex);
      } else {
        updateQty(selectedIndex, value);
      }
    } else if (editMode === 'harga') {
      updateHargaBeli(selectedIndex, value);
    }

    setEditMode(null);
    setSelectedIndex(null);
    focusInput();
  }, [selectedIndex, editMode, editValue, updateQty, updateHargaBeli, removeItem, focusInput]);

  const totalSistem = getTotalSistem();
  const selisih = getSelisih();
  const isValid = selisih === 0;

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)]">
        {/* Header Section */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconShoppingCart className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Pembelian</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Input data barang masuk</p>
              </div>
            </div>
            
            <div className="flex items-end gap-3 lg:gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setShowImportWizard(true)}
                className="flex items-center justify-center gap-2 !p-3 lg:!px-4 lg:!py-3 h-[50px] lg:h-auto"
                title="Import CSV"
              >
                <IconPackage size={22} className="shrink-0" />
                <span className="hidden lg:inline font-medium">Import CSV</span>
              </Button>
              <div className="flex-1 min-w-[140px] max-w-[200px]">
                <DateInput
                  value={tanggal}
                  onChange={setTanggal}
                  label="Tanggal:"
                  inputSize="md"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between relative z-10">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeSubmit(barcodeInput);
            }} className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconSearch size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Cari atau scan barcode..."
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  debouncedSearch(e.target.value, inventoryData || []);
                }}
                onFocus={() => {
                  if (barcodeInput.length >= 2) setShowAddDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowAddDropdown(false), 200);
                }}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-base lg:text-lg"
                autoFocus
              />
              {showAddDropdown && barcodeInput.length >= 2 && (
                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-[40vh] md:max-h-80 overflow-auto">
                  {inventorySearchResults.map((inventory) => (
                    <button
                      key={inventory.id}
                      type="button"
                      onClick={() => handleAddResolvedItem(inventory)}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 last:border-0"
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
                      type="button"
                      onClick={handleCreateNewFromInput}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 dark:text-brand-300 rounded-lg transition-colors font-medium text-sm"
                    >
                      <IconPlus size={18} />
                      Tambah &quot;{barcodeInput}&quot; sebagai barang baru
                    </button>
                  </div>
                </div>
              )}
            </form>
            
            <div className="animate-fade-in-up">
              <SelectInput
                label="Supplier"
                value={selectedSupplierId || ''}
                onChange={(id) => {
                  const s = supplierList.find(x => x.id === id);
                  setSelectedSupplierId(id || null);
                  setSupplier(s ? s.nama : '');
                }}
                options={supplierList.map(s => ({
                  value: s.id,
                  label: s.nama + (s.kontak ? ` (${s.kontak})` : '')
                }))}
                placeholder="-- Pilih Supplier --"
                className="min-w-[18rem]"
              />
            </div>

            <div className="flex flex-col gap-2 min-w-[18rem]">
              <label className="text-sm text-neutral-600 dark:text-neutral-300 font-semibold">Total Supplier:</label>
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

        {/* Footer Section */}
        <div className="flex-shrink-0 sticky bottom-4 z-20 lg:relative lg:bottom-0">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-4 lg:p-5 shadow-elevated">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4 border border-white/40 dark:border-white/10 shadow-sm text-center lg:text-left">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">Total Sistem</p>
                  <p className="text-sm sm:text-xl lg:text-2xl font-black text-neutral-900 dark:text-white mt-0.5">{formatCurrency(totalSistem)}</p>
                </div>
                <div className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-xl lg:rounded-2xl px-3 py-2.5 lg:px-5 lg:py-4 border border-white/40 dark:border-white/10 shadow-sm text-center lg:text-left">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-neutral-500 dark:text-neutral-400 font-medium whitespace-nowrap">Total Supplier</p>
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
                  onClick={() => {
                    reset();
                    setTotalSupplier(0);
                    focusInput();
                  }}
                  className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md border-white/40 dark:border-white/10"
                  leftIcon={<IconRefresh className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={items.length === 0 || submitting}
                  variant="primary"
                  size="lg"
                  className="shadow-brand px-8"
                  leftIcon={<IconDeviceFloppy className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">{submitting ? 'Menyimpan...' : 'Simpan Pembelian'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

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
    </AmbientLayout>
  );
}
