'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePembelianStore } from '@/lib/store';
import { inventoryApi, PembelianItem, purchaseApi, kategoriApi, supplierApi, Supplier, preloadInventoryCache } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency, normalizeBarcode, generateIdempotencyKey, generateAutoBarcode } from '@/lib/utils';
import { IconShoppingCart, IconCamera, IconPackage, IconX, IconCheck } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import DateInput from '@/components/ui/DateInput';
import SelectInput from '@/components/ui/SelectInput';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Banner } from '@/components/ui';

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
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-elevated w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800 animate-scale-in">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">Apakah maksud anda:</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Pencarian untuk: <span className="font-medium text-neutral-900 dark:text-neutral-100">{query}</span></p>
        
        <div className="space-y-2 mb-6 max-h-64 overflow-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-all flex justify-between items-center btn-press"
            >
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{item.nama_barang}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.kode_barcode || 'Tanpa barcode'}</div>
              </div>
              <div className="text-xs bg-accent-teal-100 dark:bg-accent-teal-900/40 text-accent-teal-700 dark:text-accent-teal-300 px-2.5 py-1 rounded-full font-medium">
                {item.similarity}% cocok
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" onClick={onCreateNew}>
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
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-elevated w-full max-w-md p-6 border border-neutral-200 dark:border-neutral-800 animate-scale-in">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">Barang Baru</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Nama Barang</label>
            <input
              type="text"
              value={nama_barang}
              onChange={(e) => setNamaBarang(e.target.value)}
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-neutral-100"
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
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all font-mono text-neutral-900 dark:text-neutral-100"
            />
            {barcode.startsWith('AUTO-') && (
              <p className="text-xs text-accent-teal-600 dark:text-accent-teal-400 mt-1.5 flex items-center gap-1">
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
              className="w-full px-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-neutral-100"
              placeholder="Masukkan nama kategori"
              autoComplete="off"
            />
            
            {showKategoriSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-10 overflow-hidden">
                {filteredKategori.map((nama) => (
                  <button
                    key={nama}
                    type="button"
                    onClick={() => handleSelectKategori(nama)}
                    className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100 transition-colors"
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
                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Harga Jual</label>
              <PriceInput
                value={harga_jual}
                onChange={setHargaJual}
                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Diskon (Rp)</label>
              <PriceInput
                value={diskon}
                onChange={setDiskon}
                className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500"
                min={0}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
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
  
  const [barcodeInput, setBarcodeInput] = useState('');
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
  const editInputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (items.length > 0) {
          setSelectedIndex(0);
          setEditMode('qty');
          setEditValue(items[0].qty);
          setTimeout(() => editInputRef.current?.focus(), 0);
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (items.length > 0) {
          setSelectedIndex(0);
          setEditMode('harga');
          setEditValue(items[0].harga_beli || 0);
          setTimeout(() => editInputRef.current?.focus(), 0);
        }
      } else if (e.key === 'Delete' && selectedIndex !== null) {
        e.preventDefault();
        removeItem(selectedIndex);
        setSelectedIndex((prev) => {
          if (prev === null) return null;
          return Math.max(0, prev - 1);
        });
      } else if (e.key === 'Escape') {
        setEditMode(null);
        setSelectedIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, removeItem]);

  const handleBarcodeSubmit = useCallback(async (input: string) => {
    if (loading || submitting) return;
    
    const normalized = normalizeBarcode(input);
    if (!normalized) return;

    setLoading(true);
    setError(null);

    try {
      const exactResult = await inventoryApi.getByExactBarcode(normalized);
      
      if (exactResult.data) {
        const item = exactResult.data;
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
        focusInput();
        setLoading(false);
        return;
      }
      
      const fuzzyResult = await inventoryApi.fuzzySearch(normalized);
      
      if (fuzzyResult.data && fuzzyResult.data.length > 0) {
        const fuzzyItems = fuzzyResult.data as Array<InventoryItem & { similarity: number }>;
        const exactMatch = fuzzyItems.find(item => item.similarity === 100);
        
        if (exactMatch) {
          addItem({
            id: exactMatch.id,
            barcode: exactMatch.kode_barcode,
            nama_barang: exactMatch.nama_barang,
            harga_jual: exactMatch.harga_jual,
            harga_beli: exactMatch.harga_beli_terakhir || 0,
            diskon: exactMatch.diskon || 0,
            stok: exactMatch.stok,
            minimum_stock: exactMatch.minimum_stock,
            kategori: exactMatch.kategori,
          });
          setBarcodeInput('');
          focusInput();
          setLoading(false);
          return;
        }
        
        if (fuzzyItems.length === 1 && fuzzyItems[0].similarity >= 80) {
          const item = fuzzyItems[0];
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
          focusInput();
          setLoading(false);
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
      setError('Terjadi kesalahan');
      setLoading(false);
    }
  }, [loading, submitting, addItem, focusInput]);

  const handleSelectSuggestedItem = useCallback((item: InventoryItem) => {
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
    setShowSuggestionDialog(false);
    setBarcodeInput('');
    focusInput();
  }, [addItem, focusInput]);

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
        addItem({
          id: result.data.id,
          barcode: result.data.kode_barcode,
          nama_barang: result.data.nama_barang,
          harga_jual: result.data.harga_jual,
          harga_beli: result.data.harga_beli_terakhir || 0,
          diskon: result.data.diskon || 0,
          stok: 0,
          minimum_stock: 0,
          kategori: result.data.id_kategori ?? { id: '', nama: data.kategori },
        });
        setShowNewItemDialog(false);
        setBarcodeInput('');
        focusInput();
      } else if (result.error) {
        setError(result.error.message || 'Gagal membuat barang baru');
      }
    } catch (err) {
      console.error('Error creating item:', err);
      setError('Gagal membuat barang baru');
    }
  }, [addItem, focusInput]);

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
      } else {
        setSuccess('Pembelian berhasil disimpan');
        reset();
        setTotalSupplier(0);
        setSelectedSupplierId(null);
        setSupplier('');
        focusInput();
      }
    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }, [items, tanggal, totalSupplier, submitting, reset, setTotalSupplier, focusInput, selectedSupplierId, supplier]);

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
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-500 rounded-xl flex items-center justify-center shadow-brand">
              <IconShoppingCart className="w-6 h-6 text-white" stroke={1.5} />
            </div>
            <div>
              <h1 className="text-h2 font-bold tracking-tight">Pembelian</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Input barang masuk</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <DateInput
              value={tanggal}
              onChange={setTanggal}
              label="Tanggal:"
              inputSize="sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex-1 relative">
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
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-lg"
              autoFocus
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
              options={supplierList.map(s => ({
                value: s.id,
                label: s.nama + (s.kontak ? ` (${s.kontak})` : '')
              }))}
              placeholder="-- Pilih Supplier --"
              className="min-w-[18rem]"
            />

          <div className="flex flex-col gap-2 min-w-[18rem]">
            <label className="text-sm text-neutral-600 dark:text-neutral-300 font-semibold">Total Supplier:</label>
            <PriceInput
              value={totalSupplier || 0}
              onChange={setTotalSupplier}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all"
              placeholder="0"
              min={0}
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-accent-rose-50 dark:bg-accent-rose-950 text-accent-rose-600 dark:text-accent-rose-200 rounded-xl text-sm border border-accent-rose-200 dark:border-accent-rose-800 animate-fade-in">{error}</div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-accent-teal-50 dark:bg-accent-teal-950 text-accent-teal-600 dark:text-accent-teal-200 rounded-xl text-sm border border-accent-teal-200 dark:border-accent-teal-800 animate-fade-in">{success}</div>
        )}
      </header>

      <main className="flex-1 overflow-auto p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-20">
            <div className="w-28 h-28 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl flex items-center justify-center mb-5 shadow-card">
              <IconCamera className="w-14 h-14 text-neutral-400" stroke={1} />
            </div>
            <p className="text-lg font-semibold text-neutral-600 dark:text-neutral-300">Scan barcode untuk menambah barang</p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1.5">atau tekan F2 untuk edit qty, F3 untuk edit harga</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-card">
            <table className="w-full min-w-[900px]">
              <thead className="bg-neutral-50 dark:bg-neutral-950 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-12">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Barcode</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Barang</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Harga Beli</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Diskon</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400">Subtotal</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item, index) => (
                <tr 
                  key={`${item.id}-${index}`} 
                  className={`transition-colors ${selectedIndex === index ? 'bg-brand-50 dark:bg-brand-900/30' : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                >
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-mono text-neutral-900 dark:text-neutral-100">{item.barcode}</td>
                  <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{item.nama_barang}</td>
                  <td className="px-4 py-3 text-right">
                    {selectedIndex === index && editMode === 'qty' ? (
                      <PriceInput
                        value={editValue}
                        onChange={setEditValue}
                        onBlur={handleEditSubmit}
                        className="w-20 px-2 py-1 border-2 border-brand-500 rounded-lg"
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
                        className="px-2 py-1 text-right hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg w-20 block ml-auto btn-press"
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
                        className="w-24 px-2 py-1 border-2 border-brand-500 rounded-lg"
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
                        className="px-2 py-1 text-right hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg w-24 block ml-auto btn-press"
                      >
                        {formatCurrency(item.harga_beli || 0)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                    {formatCurrency(item.diskon)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(item.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeItem(index)}
                      className="text-accent-rose-500 hover:text-accent-rose-700 dark:text-accent-rose-400 dark:hover:text-accent-rose-200 text-lg btn-press p-1 rounded-lg transition-colors"
                    >
                      <IconX size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </main>

      <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl px-5 py-4 shadow-card border border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Sistem</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalSistem)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl px-5 py-4 shadow-card border border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Supplier</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalSupplier)}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl px-5 py-4 shadow-card border border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Selisih</p>
              <p className={`text-2xl font-bold ${isValid ? 'text-accent-teal-600 dark:text-accent-teal-300' : 'text-accent-rose-600 dark:text-accent-rose-300'}`}>
                {formatCurrency(selisih)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                setTotalSupplier(0);
                focusInput();
              }}
            >
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={items.length === 0 || submitting}
              variant="primary"
              size="lg"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Pembelian'}
            </Button>
          </div>
        </div>
      </footer>

      <ItemSuggestionDialog
        open={showSuggestionDialog}
        query={suggestionQuery}
        items={suggestionItems}
        onSelect={handleSelectSuggestedItem}
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
    </div>
  );
}