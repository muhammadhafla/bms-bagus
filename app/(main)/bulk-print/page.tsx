'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useBulkPrintStore } from '@/lib/store';
import { inventoryApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types/inventory';
import { formatCurrency, normalizeBarcode } from '@/lib/utils';
import { IconPrinter, IconCamera, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout, useToast } from '@/components/ui';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
import { ItemSuggestionDialog } from '../purchasing/ItemSuggestionDialog';
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

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'qty' | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionItems, setSuggestionItems] = useState<any[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
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

  const handleAddResolvedItem = useCallback((item: any) => {
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
      
      const fuzzyResult = await inventoryApi.fuzzySearch(normalized, inventoryData || []);
      
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
      
      setError('Barang tidak ditemukan di database.');
      setLoading(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Terjadi kesalahan saat memproses barcode');
      setLoading(false);
    }
  }, [loading, submitting, handleAddResolvedItem, inventoryData]);

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
      const payload_json: any[] = [];
      items.forEach(item => {
        const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
        const itemData = {
          name: item.nama_barang,
          price: formatCurrency(finalPrice),
          barcode: item.kode_barcode || item.barcode
        };
        for (let i = 0; i < item.qty; i++) {
          payload_json.push(itemData);
        }
      });

      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Terjadi kesalahan sistem');
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

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconCamera size={20} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Scan barcode barang..."
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
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={items.length === 0 || submitting}
                  variant="primary"
                  size="lg"
                  className="shadow-brand px-8"
                  leftIcon={<IconPrinter className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">{submitting ? 'Memproses...' : 'Cetak Semua'}</span>
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
        onCreateNew={() => setShowSuggestionDialog(false)}
        onClose={() => {
          setShowSuggestionDialog(false);
          setBarcodeInput('');
          focusInput();
        }}
      />

    </AmbientLayout>
  );
}
