'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useBulkPrintStore } from '@/lib/store';
import { inventoryApi } from '@/lib/api';
import { supabase } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types/inventory';
import { Template } from '@/types';
import { formatCurrency, normalizeBarcode, debounce } from '@/lib/utils';
import { IconPrinter, IconCamera, IconDeviceFloppy, IconRefresh, IconSearch } from '@tabler/icons-react';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, useToast } from '@/components/ui';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import { ItemCart } from './ItemCart';

export default function BulkPrintPage() {
  const { items, addItem, updateQty, removeItem, reset } = useBulkPrintStore();
  const { showToast } = useToast();

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data || [];
    },
  });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'qty' | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  
  const [inventorySearchResults, setInventorySearchResults] = useState<(InventoryItem & { similarity: number })[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);

  const handleSearchInventory = async (query: string, allInventory: InventoryItem[]) => {
    if (query.length < 2) {
      setInventorySearchResults([]);
      setShowAddDropdown(false);
      setSearchSelectedIndex(-1);
      return;
    }
    const result = await inventoryApi.fuzzySearch(query, allInventory);
    if (!result.error && result.data) {
      setInventorySearchResults(result.data as (InventoryItem & { similarity: number })[]);
      setShowAddDropdown(result.data.length > 0);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce((query: string, allInventory: InventoryItem[]) => handleSearchInventory(query, allInventory), 300),
    []
  );
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/templates', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setSelectedTemplate(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching templates', err);
    }
  };

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleAddResolvedItem = useCallback((item: InventoryItem & { barcode?: string }) => {
    addItem({
      id: item.id,
      kode_barcode: item.kode_barcode || item.barcode,
      nama_barang: item.nama_barang,
      harga_jual: item.harga_jual,
      harga_beli_terakhir: item.harga_beli_terakhir || 0,
      diskon: item.diskon || 0,
      stok: item.stok,
      minimum_stock: item.minimum_stock,
      kategori: item.kategori,
    }, 1); // default qty is 1
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
      
      setError('Barang tidak ditemukan di database.');
      setLoading(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan saat memproses barcode');
      setLoading(false);
    }
  }, [loading, submitting, handleAddResolvedItem, inventoryData, inventorySearchResults]);

  const handleSubmit = useCallback(async () => {
    if (items.length === 0) return;
    if (submitting) return;

    if (!selectedTemplate) {
      setError('Silakan pilih Template Label terlebih dahulu');
      return;
    }

    const invalidItem = items.find(item => !item.qty || item.qty <= 0);
    if (invalidItem) {
      setError(`Qty untuk barang ${invalidItem.nama_barang} harus lebih dari 0`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload_json: { name: string; price: string; barcode: string }[] = [];
      items.forEach(item => {
        const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
        const itemData = {
          name: item.nama_barang,
          price: formatCurrency(finalPrice),
          barcode: item.kode_barcode || item.barcode || ''
        };
        for (let i = 0; i < item.qty; i++) {
          payload_json.push(itemData);
        }
      });

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          payload_json
        })
      });

      if (res.ok) {
        setSuccess('Semua antrean cetak massal berhasil dibuat');
        showToast('Antrean cetak berhasil dibuat', 'success');
        reset();
        focusInput();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Gagal membuat antrean cetak massal');
        showToast(errorData.error || 'Gagal membuat antrean cetak', 'error');
      }
    } catch (err: unknown) {
      console.error('Error submitting:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [items, selectedTemplate, submitting, reset, focusInput, showToast]);

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
    }

    setEditMode(null);
    setSelectedIndex(null);
    focusInput();
  }, [selectedIndex, editMode, editValue, updateQty, removeItem, focusInput]);

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)]">
        {/* Header Section */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconPrinter className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Cetak Massal</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Scan barang untuk cetak label sekaligus</p>
              </div>
            </div>
            
            <div className="flex items-end gap-3 lg:gap-4">
              <div className="flex-1 min-w-[200px] max-w-[250px]">
                <SelectInput
                  label="Template Global:"
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                  options={templates.map(t => ({ value: t.id, label: t.name }))}
                  placeholder="-- Pilih Template --"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between relative z-10">
            <form onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeSubmit(barcodeInput);
            }} className="flex-1 relative max-w-2xl">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconSearch size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Cari atau scan barcode barang..."
                value={barcodeInput}
                onChange={(e) => {
                  setBarcodeInput(e.target.value);
                  setSearchSelectedIndex(-1);
                  debouncedSearch(e.target.value, inventoryData || []);
                }}
                onFocus={() => {
                  if (inventorySearchResults.length > 0) setShowAddDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowAddDropdown(false), 200);
                }}
                onKeyDown={(e) => {
                  if (!showAddDropdown) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => Math.min(prev + 1, inventorySearchResults.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSearchSelectedIndex(prev => Math.max(prev - 1, -1));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchSelectedIndex >= 0 && searchSelectedIndex < inventorySearchResults.length) {
                      handleAddResolvedItem(inventorySearchResults[searchSelectedIndex]);
                    } else {
                      handleBarcodeSubmit(barcodeInput);
                    }
                  }
                }}
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-base lg:text-lg"
                autoFocus
              />
              {showAddDropdown && inventorySearchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-[40vh] md:max-h-64 overflow-auto">
                  {inventorySearchResults.map((inventory, idx) => (
                    <button
                      key={inventory.id}
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
                </div>
              )}
            </form>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-md text-red-600 dark:text-red-300 rounded-xl text-sm border border-red-200/50 dark:border-red-800/50 shadow-sm">{error}</div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-brand-50/80 dark:bg-brand-900/30 backdrop-blur-md text-brand-600 dark:text-brand-300 rounded-xl text-sm border border-brand-200/50 dark:border-brand-800/50 shadow-sm">{success}</div>
          )}
        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[400px] lg:min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-28 lg:mb-6">
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
        <div className="hidden lg:block flex-shrink-0 relative bottom-0">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 shadow-elevated">
            <div className="flex items-center justify-between gap-4">
              
              <div className="flex-1">
                <p className="text-sm text-neutral-500">Total Macam Barang: <strong>{items.length}</strong></p>
                <p className="text-sm text-neutral-500">Total Label yang Dicetak: <strong>{items.reduce((sum, item) => sum + item.qty, 0)}</strong></p>
              </div>

              <div className="flex gap-3 justify-end items-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    reset();
                    focusInput();
                  }}
                  className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md border-white/40 dark:border-white/10"
                  leftIcon={<IconRefresh className="w-5 h-5" />}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={items.length === 0 || submitting}
                  variant="primary"
                  className="shadow-brand px-8"
                  leftIcon={<IconPrinter className="w-5 h-5" />}
                >
                  {submitting ? 'Memproses...' : 'Cetak Semua'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Floating Footer Section */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-700/50 rounded-[2rem] p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
            <div className="flex items-center justify-between gap-3">
              
              <div className="flex-1 min-w-0 pl-1">
                <p className="text-xs text-neutral-500 truncate">Total Macam Barang: <strong>{items.length}</strong></p>
                <p className="text-xs text-neutral-500 truncate">Total Label Dicetak: <strong>{items.reduce((sum, item) => sum + item.qty, 0)}</strong></p>
              </div>

              <div className="flex gap-2 justify-end items-center flex-shrink-0">
                <Button
                  variant="secondary"
                  onClick={() => {
                    reset();
                    focusInput();
                  }}
                  className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md border-neutral-200/50 dark:border-neutral-700/50 !px-4 h-10 rounded-xl"
                  leftIcon={<IconRefresh className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={items.length === 0 || submitting}
                  variant="primary"
                  className="shadow-brand !px-6 h-10 rounded-xl"
                  leftIcon={<IconPrinter className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">{submitting ? '...' : 'Cetak'}</span>
                  <span className="sm:hidden">{submitting ? '...' : 'Cetak'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>

    </AmbientLayout>
  );
}
