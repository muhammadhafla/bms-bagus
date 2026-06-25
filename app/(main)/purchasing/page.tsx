'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePembelianStore } from '@/lib/store';
import { inventoryApi, PembelianItem, purchaseApi, kategoriApi, supplierApi, Supplier, preloadInventoryCache } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency, normalizeBarcode, generateIdempotencyKey, generateAutoBarcode } from '@/lib/utils';
import { IconShoppingCart, IconCamera, IconPackage, IconX, IconCheck, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, Badge, Banner, useToast } from '@/components/ui';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import ImportCSVWizard from '@/components/purchasing/ImportCSVWizard';

interface ItemSuggestionDialogProps {
  open: boolean;
  query: string;
  items: Array<InventoryItem & { similarity: number }>;
  onSelect: (item: InventoryItem) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

function ItemSuggestionDialog({ open, query, items, onSelect, onCreateNew, onClose }: ItemSuggestionDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-elevated w-full max-w-md p-6 border border-white/40 dark:border-white/10 animate-scale-in">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">Apakah maksud anda:</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Pencarian untuk: <span className="font-medium text-neutral-900 dark:text-neutral-100">{query}</span></p>
        
        <div className="space-y-2 mb-6 max-h-64 overflow-auto pr-2 custom-scrollbar">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left p-3 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-neutral-800/50 dark:hover:bg-neutral-800/80 border border-white/20 dark:border-white/5 transition-all flex justify-between items-center btn-press shadow-sm"
            >
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.kode_barcode || 'Tanpa barcode'}</div>
              </div>
              <div className="text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full font-medium">
                {item.similarity}% cocok
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button variant="primary" onClick={onCreateNew} className="flex-1">
            Tambah Baru
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NewItemDialogProps {
  open: boolean;
  initialBarcode?: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (data: { nama_barang: string; barcode: string; kategori: string; id_kategori?: string; harga_beli: number; harga_jual: number; diskon: number }) => void;
}

function NewItemDialog({ open, initialBarcode, initialName, onClose, onSubmit }: NewItemDialogProps) {
  const [nama_barang, setNamaBarang] = useState('');
  const [kategori, setKategori] = useState('Umum');
  const [barcode, setBarcode] = useState('');
  const [harga_beli, setHargaBeli] = useState(0);
  const [harga_jual, setHargaJual] = useState(0);
  const [diskon, setDiskon] = useState(0);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [showKategoriSuggestions, setShowKategoriSuggestions] = useState(false);
  const [filteredKategori, setFilteredKategori] = useState<string[]>([]);

  useEffect(() => {
    const loadKategori = async () => {
      const result = await kategoriApi.getAll();
      if (result.data) {
        setKategoriList(result.data.map(k => k.nama));
      }
    };
    loadKategori();
  }, []);

  useEffect(() => {
    if (open) {
      setNamaBarang(initialName || '');
      setKategori('Umum');
      setHargaBeli(0);
      setHargaJual(0);
      setDiskon(0);
      
      if (initialBarcode && initialBarcode.trim()) {
        setBarcode(initialBarcode);
      } else {
        setBarcode(generateAutoBarcode());
      }
    }
  }, [open, initialBarcode, initialName]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.trim() === '') {
      setBarcode(generateAutoBarcode());
    } else {
      setBarcode(value);
    }
  };

  const handleKategoriChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKategori(value);
    
    if (value.trim().length > 0) {
      const filtered = kategoriList.filter(k => 
        k.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setFilteredKategori(filtered);
      setShowKategoriSuggestions(filtered.length > 0);
    } else {
      setShowKategoriSuggestions(false);
    }
  };

  const handleSelectKategori = (nama: string) => {
    setKategori(nama);
    setShowKategoriSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nama_barang.trim()) {
      const kategoriResult = await kategoriApi.getOrCreate(kategori.trim());
      const id_kategori = kategoriResult.data?.id;
      
      onSubmit({ 
        nama_barang: nama_barang.trim(), 
        barcode, 
        kategori,
        id_kategori,
        harga_beli,
        harga_jual,
        diskon
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl shadow-elevated w-full max-w-md p-6 border border-white/40 dark:border-white/10 animate-scale-in">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Barang Baru</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Nama Barang</label>
            <input
              type="text"
              value={nama_barang}
              onChange={(e) => setNamaBarang(e.target.value)}
              className="w-full px-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-neutral-100"
              autoFocus
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Barcode 
              <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-2">(kosongkan untuk auto generate)</span>
            </label>
            <input
              type="text"
              value={barcode}
              onChange={handleBarcodeChange}
              className="w-full px-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all font-mono text-neutral-900 dark:text-neutral-100"
            />
            {barcode.startsWith('AUTO-') && (
              <p className="text-xs text-brand-600 dark:text-brand-400 mt-1.5 flex items-center gap-1">
                <IconCheck size={14} /> Barcode dihasilkan otomatis oleh sistem
              </p>
            )}
          </div>
          
          <div className="mb-5 relative">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Kategori</label>
            <input
              type="text"
              value={kategori}
              onChange={handleKategoriChange}
              onFocus={() => kategoriList.length > 0 && setShowKategoriSuggestions(true)}
              onBlur={() => setTimeout(() => setShowKategoriSuggestions(false), 200)}
              className="w-full px-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-neutral-100"
              placeholder="Masukkan nama kategori"
              autoComplete="off"
            />
            
            {showKategoriSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl shadow-lg z-10 overflow-hidden">
                {filteredKategori.map((nama) => (
                  <button
                    key={nama}
                    type="button"
                    onClick={() => handleSelectKategori(nama)}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 text-sm text-neutral-900 dark:text-neutral-100 transition-colors"
                  >
                    {nama}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Harga Beli</label>
              <PriceInput
                value={harga_beli}
                onChange={setHargaBeli}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Harga Jual</label>
              <PriceInput
                value={harga_jual}
                onChange={setHargaJual}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Diskon (Rp)</label>
              <PriceInput
                value={diskon}
                onChange={setDiskon}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 transition-all"
                min={0}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Batal
            </Button>
            <Button variant="primary" type="submit" className="flex-1">
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PembelianPage() {
  const { items, addItem, updateQty, updateHargaBeli, removeItem, reset, getTotalSistem, getSelisih, setTotalSupplier, setTanggal, totalSupplier, tanggal } = usePembelianStore();
  const { showToast } = useToast();
  
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
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionItems, setSuggestionItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleAddResolvedItem = useCallback((item: any) => {
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
    setShowSuggestionDialog(false);
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
    preloadInventoryCache();
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
      
      const fuzzyResult = await inventoryApi.fuzzySearch(normalized);
      
      if (fuzzyResult.data && fuzzyResult.data.length > 0) {
        const fuzzyItems = fuzzyResult.data as Array<InventoryItem & { similarity: number }>;
        const exactMatch = fuzzyItems.find(item => item.similarity === 100);
        
        if (exactMatch) {
          handleAddResolvedItem(exactMatch);
          return;
        }
        
        if (fuzzyItems.length === 1 && fuzzyItems[0].similarity >= 80) {
          handleAddResolvedItem(fuzzyItems[0]);
          return;
        }
        
        setSuggestionQuery(normalized);
        setSuggestionItems(fuzzyResult.data);
        setShowSuggestionDialog(true);
        setLoading(false);
        return;
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
  }, [loading, submitting, handleAddResolvedItem]);

  const handleCreateNewFromSuggestion = useCallback(() => {
    setShowSuggestionDialog(false);
    const isLikelyBarcode = /^\d{8,}$/.test(suggestionQuery);
    setNewItemBarcode(isLikelyBarcode ? suggestionQuery : '');
    setNewItemName(isLikelyBarcode ? '' : suggestionQuery);
    setShowNewItemDialog(true);
  }, [suggestionQuery]);

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
        reset();
        setTotalSupplier(0);
        setSelectedSupplierId(null);
        setSupplier('');
        focusInput();
      }
    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Terjadi kesalahan');
      showToast(err.message || 'Terjadi kesalahan', 'error');
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
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
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

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex-1 relative animate-fade-in-up" style={{ animationDelay: '50ms' }}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconCamera size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Scan barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeSubmit(barcodeInput);
                  }
                }}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-base lg:text-lg"
                autoFocus
              />
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
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

            <div className="flex flex-col gap-2 min-w-[18rem] animate-fade-in-up" style={{ animationDelay: '150ms' }}>
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
            <div className="mt-4 p-3 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-md text-red-600 dark:text-red-300 rounded-xl text-sm border border-red-200/50 dark:border-red-800/50 animate-fade-in shadow-sm">{error}</div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-brand-50/80 dark:bg-brand-900/30 backdrop-blur-md text-brand-600 dark:text-brand-300 rounded-xl text-sm border border-brand-200/50 dark:border-brand-800/50 animate-fade-in shadow-sm">{success}</div>
          )}
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-20">
              <div className="w-28 h-28 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
                <IconCamera className="w-14 h-14 text-neutral-400" stroke={1.5} />
              </div>
              <p className="text-lg font-bold text-neutral-600 dark:text-neutral-300">Scan barcode untuk menambah barang</p>
              <p className="text-sm text-neutral-500 mt-2">Atau tekan F2 untuk edit Qty, F3 untuk edit harga</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto h-full custom-scrollbar">
              <table className="w-full min-w-[900px] hidden lg:table">
                <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-12">#</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Barcode</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Qty</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Beli</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Subtotal</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {items.map((item, index) => (
                  <tr 
                    key={`${item.id}-${index}`} 
                    className={`transition-colors ${selectedIndex === index ? 'bg-brand-50/50 dark:bg-brand-900/30' : 'hover:bg-white/50 dark:hover:bg-neutral-800/50'}`}
                  >
                    <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-mono text-neutral-900 dark:text-neutral-100">{item.barcode}</td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
                    <td className="px-4 py-3 text-right">
                      {selectedIndex === index && editMode === 'qty' ? (
                        <PriceInput
                          value={editValue}
                          onChange={setEditValue}
                          onBlur={handleEditSubmit}
                          className="w-20 px-3 py-1.5 border-2 border-brand-500 rounded-lg shadow-brand"
                          min={1}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedIndex(index);
                            setEditMode('qty');
                            setEditValue(item.qty);
                          }}
                          className="px-3 py-1.5 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-20 block ml-auto transition-colors font-medium"
                        >
                          {item.qty}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {selectedIndex === index && editMode === 'harga' ? (
                        <PriceInput
                          value={editValue}
                          onChange={setEditValue}
                          onBlur={handleEditSubmit}
                          className="w-28 px-3 py-1.5 border-2 border-brand-500 rounded-lg shadow-brand"
                          min={0}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedIndex(index);
                            setEditMode('harga');
                            setEditValue(item.harga_beli || 0);
                          }}
                          className="px-3 py-1.5 text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg w-28 block ml-auto transition-colors font-medium text-neutral-700 dark:text-neutral-300"
                        >
                          {formatCurrency(item.harga_beli || 0)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 text-lg btn-press p-2 rounded-xl transition-colors"
                      >
                        <IconX size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Mobile Cards Layout */}
            <div className="block lg:hidden space-y-3 p-4">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}-mobile`} className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl p-4 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm relative transition-all">
                  <button 
                    onClick={() => removeItem(index)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition-colors btn-press"
                  >
                    <IconX size={18} />
                  </button>
                  <div className="pr-10 mb-3">
                    <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight mb-1">{item.nama_barang}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.barcode}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Qty</label>
                      {selectedIndex === index && editMode === 'qty' ? (
                        <PriceInput
                          value={editValue}
                          onChange={setEditValue}
                          onBlur={handleEditSubmit}
                          className="w-full px-3 py-2.5 border-2 border-brand-500 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          min={1}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedIndex(index);
                            setEditMode('qty');
                            setEditValue(item.qty);
                          }}
                          className="w-full px-3 py-2.5 text-left bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl font-medium text-neutral-900 dark:text-white shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {item.qty}
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Harga Beli</label>
                      {selectedIndex === index && editMode === 'harga' ? (
                        <PriceInput
                          value={editValue}
                          onChange={setEditValue}
                          onBlur={handleEditSubmit}
                          className="w-full px-3 py-2.5 border-2 border-brand-500 rounded-xl bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                          min={0}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedIndex(index);
                            setEditMode('harga');
                            setEditValue(item.harga_beli || 0);
                          }}
                          className="w-full px-3 py-2.5 text-left bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-700/50 rounded-xl font-medium text-neutral-700 dark:text-neutral-300 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {formatCurrency(item.harga_beli || 0)}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end items-end pt-3 border-t border-neutral-100 dark:border-neutral-800/50">
                    <div className="text-right">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-0.5">Subtotal</div>
                      <div className="font-black text-brand-600 dark:text-brand-400 text-lg leading-none">{formatCurrency(item.subtotal)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="flex-shrink-0 animate-fade-in-up sticky bottom-4 z-20 lg:relative lg:bottom-0" style={{ animationDelay: '250ms' }}>
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

      <ItemSuggestionDialog
        open={showSuggestionDialog}
        query={suggestionQuery}
        items={suggestionItems}
        onSelect={handleAddResolvedItem}
        onCreateNew={handleCreateNewFromSuggestion}
        onClose={() => {
          setShowSuggestionDialog(false);
          setBarcodeInput('');
          focusInput();
        }}
      />

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
        onComplete={(importedItems) => {
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
    </AmbientLayout>
  );
}