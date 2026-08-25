'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBulkPrintStore } from '@/lib/store';
import { inventoryApi, promoApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types/inventory';
import { Template } from '@/types';
import { fetchApi } from '@/lib/fetchApi';
import { formatCurrency, normalizeBarcode, debounce } from '@/lib/utils';
import {
  IconPrinter,
  IconCamera,
  IconDeviceFloppy,
  IconRefresh,
  IconArrowLeft,
  IconBarcode,
} from '@tabler/icons-react';
import SelectInput from '@/components/ui/SelectInput';
import { Button, AmbientLayout } from '@/components/ui';
import { toast } from 'sonner';
import { useHotkeys } from 'react-hotkeys-hook';
import { ItemCart } from './ItemCart';
import { useTableNavigation } from '@/components/inventory/useTableNavigation';
import { SharedBarcodeSearch } from '@/components/inventory/SharedBarcodeSearch';

export default function BulkPrintPage() {
  const router = useRouter();
  const { items, addItem, updateQty, removeItem, reset } = useBulkPrintStore();
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data || [];
    },
    select: (data) => data.filter((item) => !item.is_discontinued),
  });

  const { data: activePromosMap } = useQuery({
    queryKey: ['activePromos'],
    queryFn: async () => {
      return await promoApi.getActivePromosMap();
    },
  });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  // no op
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('label_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      if (data) {
        setTemplates(data);
        if (data.length > 0) {
          const defaultTemplate = data.find((t) => t.name.toLowerCase() === 'label harga');
          setSelectedTemplate(defaultTemplate ? defaultTemplate.id : data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching templates', err);
    }
  };

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const {
    selectedIndex,
    setSelectedIndex,
    editMode,
    setEditMode,
    editValue,
    setEditValue,
    handleEditSubmit,
    handleEditKeyDown,
  } = useTableNavigation({
    items,
    onRemoveItem: removeItem,
    onUpdateQty: updateQty,
    focusInput,
  });

  const handleAddResolvedItem = useCallback(
    (item: InventoryItem & { barcode?: string }) => {
      if (item.is_discontinued) {
        setError('Barang ini sudah tidak aktif (discontinue) sehingga tidak dapat dicetak.');
        return;
      }

      const activePromoDiskon = activePromosMap?.[item.id];
      const appliedDiskon = activePromoDiskon !== undefined ? activePromoDiskon : item.diskon || 0;

      addItem(
        {
          id: item.id,
          kode_barcode: item.kode_barcode || item.barcode,
          nama_barang: item.nama_barang,
          harga_jual: item.harga_jual,
          harga_beli_terakhir: item.harga_beli_terakhir || 0,
          diskon: appliedDiskon,
          stok: item.stok,
          minimum_stock: item.minimum_stock,
          kategori: item.kategori,
        },
        1,
      ); // default qty is 1
      focusInput();
      setLoading(false);
    },
    [addItem, focusInput, activePromosMap],
  );

  useHotkeys('f2', (e) => {
    e.preventDefault();
    if (items.length > 0) {
      setSelectedIndex(0);
      setEditMode('qty');
      setEditValue(items[0].qty);
    }
  }, { enableOnFormTags: true });

  useHotkeys('delete', (e) => {
    e.preventDefault();
    if (selectedIndex !== null && items[selectedIndex]) {
      removeItem(items[selectedIndex].id);
      setSelectedIndex((prev) => (prev === null ? null : Math.max(0, prev - 1)));
    }
  }, { enableOnFormTags: true });

  useHotkeys('f4', (e) => {
    e.preventDefault();
    reset();
    focusInput();
  }, { enableOnFormTags: true });

  useHotkeys('f9', (e) => {
    e.preventDefault();
    if (items.length > 0 && !submitting) {
      handleSubmit();
    }
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    setEditMode(null);
    setSelectedIndex(null);
  }, { enableOnFormTags: true });

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

  const handleSubmit = useCallback(async () => {
    if (items.length === 0) return;
    if (submitting) return;

    if (!selectedTemplate) {
      setError('Silakan pilih Template Label terlebih dahulu');
      return;
    }

    const invalidItem = items.find((item) => !item.qty || item.qty <= 0);
    if (invalidItem) {
      setError(`Qty untuk barang ${invalidItem.nama_barang} harus lebih dari 0`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload_json: { name: string; price: string; barcode: string }[] = [];
      items.forEach((item) => {
        const finalPrice = (item.harga_jual || 0) - (item.diskon || 0);
        const itemData = {
          name: item.nama_barang,
          price: formatCurrency(finalPrice),
          barcode: item.kode_barcode || item.barcode || '',
        };
        for (let i = 0; i < item.qty; i++) {
          payload_json.push(itemData);
        }
      });

      const res = await fetchApi('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: selectedTemplate,
          payload_json,
        }),
      });

      if (res.ok) {
        setSuccess('Semua antrean cetak massal berhasil dibuat');
        toast.success('Antrean cetak berhasil dibuat');
        reset();
        focusInput();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Gagal membuat antrean cetak massal');
        toast.error(errorData.error || 'Gagal membuat antrean cetak');
      }
    } catch (err: unknown) {
      console.error('Error submitting:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  }, [items, selectedTemplate, submitting, reset, focusInput]);

  return (
    <AmbientLayout>
      <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)]">
        {/* Header Section */}
        <div className="mb-4 flex-shrink-0 lg:mb-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 pl-2 lg:gap-4 lg:pl-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="-ml-2 rounded-xl p-2 text-neutral-600 transition-all hover:bg-neutral-100 active:scale-95 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <IconArrowLeft className="h-6 w-6" />
              </button>
              <IconPrinter
                className="text-brand-500 hidden h-6 w-6 shrink-0 lg:block lg:h-8 lg:w-8"
                stroke={1.5}
              />
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                  Cetak Massal
                </h1>
                <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                  Scan barang untuk cetak label sekaligus
                </p>
              </div>
            </div>

            <div className="flex w-full items-end gap-3 lg:w-auto lg:gap-4">
              <div className="w-full flex-1 lg:max-w-[250px] lg:min-w-[200px]">
                <SelectInput
                  label="Template Global:"
                  value={selectedTemplate}
                  onChange={setSelectedTemplate}
                  options={templates.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="-- Pilih Template --"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="relative max-w-2xl flex-1">
              <SharedBarcodeSearch
                onItemSelected={handleAddResolvedItem}
                allowCreateNew={false} // Users shouldn't create new items during bulk print
                disabled={loading || submitting}
                icon="barcode"
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
        <div className="shadow-elevated mb-28 flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:mb-6 lg:min-h-0 dark:border-white/10 dark:bg-neutral-900/60">
          <ItemCart
            items={items}
            selectedIndex={selectedIndex}
            editMode={editMode as 'qty' | null}
            editValue={editValue}
            setSelectedIndex={setSelectedIndex}
            setEditMode={setEditMode}
            setEditValue={setEditValue}
            handleEditSubmit={handleEditSubmit}
            handleEditKeyDown={handleEditKeyDown}
            updateQty={updateQty}
            removeItem={removeItem}
          />
        </div>

        {/* Desktop Footer Section */}
        <div className="relative bottom-0 hidden flex-shrink-0 lg:block">
          <div className="shadow-elevated rounded-3xl border border-white/40 bg-white/80 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/80">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-neutral-500">
                  Total Macam Barang: <strong>{items.length}</strong>
                </p>
                <p className="text-sm text-neutral-500">
                  Total Label yang Dicetak:{' '}
                  <strong>{items.reduce((sum, item) => sum + item.qty, 0)}</strong>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="group relative">
                  <span className="pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 group-hover:block sm:block dark:bg-neutral-700 dark:text-neutral-300">
                    F4
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      reset();
                      focusInput();
                    }}
                    className="border-white/40 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/50"
                    leftIcon={<IconRefresh className="h-5 w-5" />}
                  >
                    Reset
                  </Button>
                </div>
                <div className="group relative">
                  <span className="bg-brand-200 dark:bg-brand-900 text-brand-700 dark:text-brand-300 pointer-events-none absolute -top-2 -right-1 z-10 hidden -translate-y-1/2 transform rounded px-1.5 py-0.5 text-[10px] font-bold group-hover:block sm:block">
                    F9
                  </span>
                  <Button
                    onClick={handleSubmit}
                    disabled={items.length === 0 || submitting}
                    variant="primary"
                    className="shadow-brand px-8"
                    leftIcon={<IconPrinter className="h-5 w-5" />}
                  >
                    {submitting ? 'Memproses...' : 'Cetak Semua'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Floating Footer Section */}
        <div className="fixed right-4 bottom-4 left-4 z-50 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="rounded-[2rem] border border-neutral-200/50 bg-white/95 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-900/95 dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 pl-1">
                <p className="truncate text-xs text-neutral-500">
                  Total Macam Barang: <strong>{items.length}</strong>
                </p>
                <p className="truncate text-xs text-neutral-500">
                  Total Label Dicetak:{' '}
                  <strong>{items.reduce((sum, item) => sum + item.qty, 0)}</strong>
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center justify-end gap-2">
                <div className="relative">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      reset();
                      focusInput();
                    }}
                    className="h-10 rounded-xl border-neutral-200/50 bg-white/50 !px-4 backdrop-blur-md dark:border-neutral-700/50 dark:bg-neutral-800/50"
                    leftIcon={<IconRefresh className="h-5 w-5" />}
                  >
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                </div>
                <div className="relative">
                  <Button
                    onClick={handleSubmit}
                    disabled={items.length === 0 || submitting}
                    variant="primary"
                    className="shadow-brand h-10 rounded-xl !px-6"
                    leftIcon={<IconPrinter className="h-5 w-5" />}
                  >
                    <span className="hidden sm:inline">{submitting ? '...' : 'Cetak'}</span>
                    <span className="sm:hidden">{submitting ? '...' : 'Cetak'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AmbientLayout>
  );
}
