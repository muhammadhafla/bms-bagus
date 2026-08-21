'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { debounce, formatDateWIB, normalizeBarcode } from '@/lib/utils';
import { StockOpname, StockOpnameItem, stockOpnameApi } from '@/lib/api/stockOpname';
import { stockAdjustmentApi } from '@/lib/api/stockAdjustment';
import { inventoryApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  IconArrowLeft,
  IconCheck,
  IconX,
  IconSend,
  IconLoader2,
  IconDeviceFloppy,
  IconRefresh,
  IconPlus,
  IconMinus,
  IconSearch,
  IconTrash,
  IconBarcode,
  IconBox,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SharedBarcodeSearch } from '@/components/inventory/SharedBarcodeSearch';
import { Portal } from '@/components/ui/Portal';
import SelectInput from '@/components/ui/SelectInput';
import TextareaInput from '@/components/ui/TextareaInput';
import { Button, Breadcrumb, Badge, Card, AmbientLayout } from '@/components/ui';
import { AdminOnly } from '@/components/role';

const reasonOptions = [
  { value: 'salah_input', label: 'Kesalahan Input' },
  { value: 'rusak', label: 'Barang Rusak' },
  { value: 'hilang', label: 'Barang Hilang' },
  { value: 'kadaluarsa', label: 'Kadaluarsa' },
  { value: 'salah_hitung', label: 'Kesalahan Hitung' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function StockOpnameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opnameId = params.id as string;

  const [opname, setOpname] = useState<StockOpname | null>(null);
  const [items, setItems] = useState<StockOpnameItem[]>([]);
  const [originalItems, setOriginalItems] = useState<StockOpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data || [];
    },
  });
  const addToast = ({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) => {
    toast(message);
  };
  const addSearchRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [opnameResult, itemsResult] = await Promise.all([
      stockOpnameApi.getById(opnameId),
      stockOpnameApi.getItems(opnameId),
    ]);

    if (!opnameResult.error && opnameResult.data) {
      setOpname(opnameResult.data);
    } else if (opnameResult.error) {
      console.error('Error fetching opname:', opnameResult.error);
    }
    if (!itemsResult.error && itemsResult.data) {
      setItems(itemsResult.data);
      setOriginalItems(JSON.parse(JSON.stringify(itemsResult.data)));
      setHasChanges(false);
    } else if (itemsResult.error) {
      console.error('Error fetching items:', itemsResult.error);
    }
    setLoading(false);
  }, [opnameId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateItem = (itemId: string, field: string, value: string | number | null) => {
    if (opname?.status !== 'draft') return;
    setItems((prev) => {
      const newItems = prev.map((item) => {
        if (item.id !== itemId) return item;

        const updated = { ...item, [field]: value } as StockOpnameItem;

        if (field === 'physical_stock') {
          updated.difference = (value as number) - item.system_stock;
        }

        return updated;
      });

      setHasChanges(JSON.stringify(newItems) !== JSON.stringify(originalItems));
      return newItems;
    });
  };

  const saveChanges = async () => {
    setSaving(true);

    const changedItems = items.filter((item, index) => {
      return JSON.stringify(item) !== JSON.stringify(originalItems[index]);
    });

    if (changedItems.length === 0) {
      setSaving(false);
      return true;
    }

    setSaveProgress({ current: 0, total: changedItems.length });

    try {
      let current = 0;
      for (const item of changedItems) {
        await stockOpnameApi.updateItem(item.id, {
          physical_stock: item.physical_stock,
          system_stock: item.system_stock,
          reason: item.reason || undefined,
          note: item.note || undefined,
        });
        current++;
        setSaveProgress({ current, total: changedItems.length });
      }

      setOriginalItems(JSON.parse(JSON.stringify(items)));
      setHasChanges(false);
      addToast({ type: 'success', message: 'Perubahan berhasil disimpan' });
      setSaving(false);
      setTimeout(() => setSaveProgress({ current: 0, total: 0 }), 500);
      return true;
    } catch (error) {
      addToast({ type: 'error', message: 'Gagal menyimpan perubahan' });
      setSaving(false);
      setTimeout(() => setSaveProgress({ current: 0, total: 0 }), 500);
      return false;
    }
  };

  const discardChanges = () => {
    setItems(JSON.parse(JSON.stringify(originalItems)));
    setHasChanges(false);
    setShowConfirmDiscard(false);
    addToast({ type: 'info', message: 'Perubahan dibatalkan' });
  };

  // Manual search logic was replaced by SharedBarcodeSearch

  const addItemToOpname = async (inventory: import('@/types/inventory').InventoryItem) => {
    // The search component handles resetting its own state internally

    const result = await stockOpnameApi.addItem(opnameId, inventory.id);
    if (!result.error && result.data) {
      const newItem = result.data as StockOpnameItem;
      setItems((prev) => [newItem, ...prev]);
      setOriginalItems((prev) => [newItem, ...prev]);
      addToast({ type: 'success', message: `${inventory.nama_barang} ditambahkan` });

      // Auto focus ke input kuantitas barang yang baru ditambahkan
      setTimeout(() => {
        const mobileInput = document.getElementById(`input-phys-qty-${newItem.id}`);
        const deskInput = document.getElementById(`input-phys-qty-desk-${newItem.id}`);
        const inputToFocus = deskInput && window.innerWidth >= 1024 ? deskInput : mobileInput;

        if (inputToFocus) {
          inputToFocus.focus();
          (inputToFocus as HTMLInputElement).select();
        }
      }, 100);
    } else {
      addToast({ type: 'error', message: result.error?.message || 'Gagal menambahkan barang' });
    }
  };

  const removeItem = async (itemId: string) => {
    await stockOpnameApi.deleteItem(itemId);
    setItems((prev) => {
      const filtered = prev.filter((i) => i.id !== itemId);
      return filtered;
    });
    setOriginalItems((prev) => {
      const filtered = prev.filter((i) => i.id !== itemId);
      return filtered;
    });
  };

  const handleSubmit = async () => {
    if (hasChanges) {
      const saved = await saveChanges();
      if (!saved) return;
    }

    setSaving(true);
    const result = await stockOpnameApi.submitForApproval(opnameId);
    if (result.error) {
      addToast({ type: 'error', message: result.error.message });
    } else {
      addToast({ type: 'success', message: 'Stock Opname berhasil dikirim untuk approval' });
      fetchData();
    }
    setSaving(false);
  };

  const handleApprove = async () => {
    setSaving(true);
    const result = await stockOpnameApi.approve(opnameId);
    if (result.error) {
      addToast({ type: 'error', message: result.error.message });
    } else {
      setProcessing(true);
      const adjustResult = await stockAdjustmentApi.processOpnameAdjustments(opnameId);
      if (adjustResult.error) {
        addToast({
          type: 'error',
          message: `Gagal memproses penyesuaian stok: ${adjustResult.error.message}`,
        });
      } else {
        addToast({
          type: 'success',
          message: 'Stock Opname berhasil disetujui dan stok telah disesuaikan',
        });
      }
      setProcessing(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      alert('Mohon masukkan alasan penolakan');
      return;
    }
    setSaving(true);
    const result = await stockOpnameApi.reject(opnameId, rejectNote);
    if (result.error) {
      addToast({ type: 'error', message: result.error.message });
    } else {
      setShowRejectModal(false);
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AmbientLayout>
        <div className="py-12 text-center text-neutral-500">Loading...</div>
      </AmbientLayout>
    );
  }

  if (!opname) {
    return (
      <AmbientLayout>
        <div className="bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800 mb-4 rounded-lg border p-4">
          <p className="text-danger-700 dark:text-danger-300">
            Gagal memuat data stock opname. Pastikan Anda memiliki akses yang tepat.
          </p>
        </div>
        <button
          onClick={() => router.push('/stock-opname')}
          className="flex items-center gap-2 rounded-lg bg-neutral-100 px-4 py-2 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          <IconArrowLeft size={18} />
          Kembali ke Daftar
        </button>
      </AmbientLayout>
    );
  }

  const isDraft = opname?.status === 'draft';
  const isPending = opname?.status === 'pending';
  const isEditable = isDraft;

  const filteredItems = items.filter((item) => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      item.inventory?.nama_barang?.toLowerCase().includes(search) ||
      item.inventory?.kode_barcode?.toLowerCase().includes(search)
    );
  });

  const hasInvalidItems = items.some((item) => item.difference !== 0 && !item.reason);
  const invalidItemCount = items.filter((item) => item.difference !== 0 && !item.reason).length;

  return (
    <AmbientLayout>
      <Breadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stock Opname', href: '/inventory/stock-opname' },
          {
            label: opname?.opname_date ? formatDateWIB(opname.opname_date) : 'Detail',
            isActive: true,
          },
        ]}
        className="mb-4"
      />

      <div className="animate-fade-in-up mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 pl-2 lg:gap-4 lg:pl-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="-ml-2 rounded-xl p-2 text-neutral-600 transition-all hover:bg-neutral-100 active:scale-95 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <IconArrowLeft className="h-6 w-6" />
          </button>
          <div className="from-brand-600 to-brand-700 shadow-brand hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br lg:flex lg:h-12 lg:w-12">
            <IconSearch className="h-5 w-5 text-white lg:h-6 lg:w-6" stroke={1.5} />
          </div>
          <div>
            <h1 className="line-clamp-1 text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl lg:text-4xl dark:text-white">
              Detail Stock Opname
            </h1>
            <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
              Pengelolaan stok fisik
            </p>
          </div>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="secondary" onClick={() => router.push('/inventory/stock-opname')}>
            <IconArrowLeft size={20} />
            <span>Kembali</span>
          </Button>

          {isDraft && (
            <>
              {hasChanges && (
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmDiscard(true)}
                  disabled={saving}
                >
                  <IconRefresh size={20} />
                  <span>Batal</span>
                </Button>
              )}
              {hasChanges && (
                <Button onClick={saveChanges} disabled={saving || hasInvalidItems}>
                  {saving ? (
                    <IconLoader2 size={20} className="animate-spin" />
                  ) : (
                    <IconDeviceFloppy size={20} />
                  )}
                  <span>
                    {saving && saveProgress.total > 0
                      ? `Menyimpan (${saveProgress.current}/${saveProgress.total})...`
                      : saving
                        ? 'Menyimpan...'
                        : 'Simpan'}
                  </span>
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={saving || hasInvalidItems}
                className={`shadow-brand ${hasInvalidItems ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <IconSend size={20} />
                <span>{saving ? 'Mengirim...' : 'Submit'}</span>
              </Button>
            </>
          )}
          {isPending && (
            <AdminOnly>
              <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={saving}>
                <IconX size={20} />
                <span>Tolak</span>
              </Button>
              <Button
                variant="primary"
                className="shadow-brand"
                onClick={handleApprove}
                disabled={saving || processing}
              >
                {processing ? (
                  <IconLoader2 size={20} className="animate-spin" />
                ) : (
                  <IconCheck size={20} />
                )}
                <span>{processing ? 'Memproses...' : 'Setujui'}</span>
              </Button>
            </AdminOnly>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid w-full grid-cols-3 gap-2 lg:gap-4">
        <div className="lg:shadow-elevated flex flex-col justify-center rounded-xl border border-neutral-200/50 bg-neutral-50/80 p-3 text-center lg:rounded-2xl lg:border-white/40 lg:bg-white/70 lg:p-4 lg:text-left lg:backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-800/80 lg:dark:border-white/10 lg:dark:bg-neutral-900/60">
          <div className="text-[10px] leading-tight font-medium text-neutral-500 lg:text-sm dark:text-neutral-400">
            Total Item
          </div>
          <div className="mt-0.5 text-sm font-bold text-neutral-900 lg:mt-1 lg:text-2xl dark:text-white">
            {items.length}
          </div>
        </div>
        <div className="bg-success-50/80 dark:bg-success-900/20 border-success-100 dark:border-success-800 lg:shadow-elevated flex flex-col justify-center rounded-xl border p-3 text-center lg:rounded-2xl lg:border-white/40 lg:bg-white/70 lg:p-4 lg:text-left lg:backdrop-blur-xl lg:dark:border-white/10 lg:dark:bg-neutral-900/60">
          <div className="text-success-600 text-[10px] leading-tight font-medium lg:text-sm">
            Selisih Positif
          </div>
          <div className="text-success-600 mt-0.5 text-sm font-bold lg:mt-1 lg:text-2xl">
            +{items.filter((i) => i.difference > 0).reduce((sum, i) => sum + i.difference, 0)}
          </div>
        </div>
        <div className="bg-danger-50/80 dark:bg-danger-900/20 border-danger-100 dark:border-danger-800 lg:shadow-elevated flex flex-col justify-center rounded-xl border p-3 text-center lg:rounded-2xl lg:border-white/40 lg:bg-white/70 lg:p-4 lg:text-left lg:backdrop-blur-xl lg:dark:border-white/10 lg:dark:bg-neutral-900/60">
          <div className="text-danger-600 text-[10px] leading-tight font-medium lg:text-sm">
            Selisih Negatif
          </div>
          <div className="text-danger-600 mt-0.5 text-sm font-bold lg:mt-1 lg:text-2xl">
            {items.filter((i) => i.difference < 0).reduce((sum, i) => sum + i.difference, 0)}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed right-4 bottom-4 left-4 z-50 flex items-center justify-between gap-2 rounded-2xl border border-neutral-200/50 bg-white/95 p-2.5 pb-[max(env(safe-area-inset-bottom),0.625rem)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl lg:hidden dark:border-neutral-700/50 dark:bg-neutral-900/95 dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
        <Button
          variant="secondary"
          className="h-10 rounded-xl !px-3"
          onClick={() => router.push('/dashboard')}
        >
          <IconArrowLeft size={18} />
        </Button>
        <div className="flex flex-1 justify-end gap-2">
          {isDraft && (
            <>
              {hasChanges && (
                <Button
                  variant="secondary"
                  className="h-10 rounded-xl !px-3"
                  onClick={() => setShowConfirmDiscard(true)}
                  disabled={saving}
                >
                  <IconRefresh size={18} />
                </Button>
              )}
              {hasChanges && (
                <Button
                  className="h-10 max-w-[120px] flex-1 rounded-xl !px-3"
                  onClick={saveChanges}
                  disabled={saving || hasInvalidItems}
                >
                  {saving ? (
                    <IconLoader2 size={18} className="animate-spin" />
                  ) : (
                    <IconDeviceFloppy size={18} />
                  )}
                  <span className="truncate text-sm">Simpan</span>
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={saving || hasInvalidItems}
                className={`shadow-brand h-10 max-w-[120px] flex-1 rounded-xl !px-3 ${hasInvalidItems ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <IconSend size={18} />
                <span className="truncate text-sm">Submit</span>
              </Button>
            </>
          )}
          {isPending && (
            <AdminOnly>
              <Button
                variant="danger"
                className="h-10 max-w-[120px] flex-1 rounded-xl !px-3"
                onClick={() => setShowRejectModal(true)}
                disabled={saving}
              >
                <IconX size={18} />
                <span className="truncate text-sm">Tolak</span>
              </Button>
              <Button
                variant="primary"
                className="shadow-brand h-10 max-w-[120px] flex-1 rounded-xl !px-3"
                onClick={handleApprove}
                disabled={saving || processing}
              >
                {processing ? (
                  <IconLoader2 size={18} className="animate-spin" />
                ) : (
                  <IconCheck size={18} />
                )}
                <span className="truncate text-sm">Setujui</span>
              </Button>
            </AdminOnly>
          )}
        </div>
      </div>

      {isDraft && (
        <div className="sticky top-[72px] z-40 mb-6 flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/70 p-2 shadow-sm backdrop-blur-xl lg:flex-row lg:gap-4 dark:border-white/10 dark:bg-neutral-900/60">
          <div className="relative max-w-xl flex-1">
            <SharedBarcodeSearch
              onItemSelected={addItemToOpname}
              allowCreateNew={false}
              filterPredicate={(inventoryItem: import('@/types/inventory').InventoryItem) => !items.map((i) => i.inventory_id).includes(inventoryItem.id)}
              disabled={saving}
              placeholder="Scan barcode atau cari barang..."
              icon="barcode"
            />
          </div>

          <div className="mt-3 flex w-full gap-2 lg:mt-0 lg:ml-auto lg:w-auto">
            {items.length > 0 && (
              <div className="relative max-w-md flex-1">
                <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
                  <IconSearch size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Cari di dalam daftar..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="focus:ring-brand-500 w-full rounded-lg border border-neutral-200 bg-white py-2 pr-4 pl-10 focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {hasInvalidItems && (
        <div className="bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800 mb-4 rounded-lg border p-4">
          <p className="text-danger-700 dark:text-danger-300 font-medium">
            ⚠️ Ada {invalidItemCount} item yang belum diisi alasan selisih. Mohon isi alasan sebelum
            submit.
          </p>
        </div>
      )}

      <div className="mb-6">
        {items.length === 0 ? (
          <div
            className="shadow-elevated animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-white/40 bg-white/70 px-4 py-20 text-center backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '100ms' }}
          >
            <div className="bg-brand-50 dark:bg-brand-900/20 text-brand-500 dark:text-brand-400 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
              <IconBox size={40} stroke={1.5} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-white">
              Belum ada barang
            </h3>
            <p className="mb-8 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              Scan barcode atau cari nama barang untuk mulai melakukan perhitungan stok fisik.
            </p>
            {isDraft && (
              <Button
                onClick={() => addSearchRef.current?.focus()}
                className="shadow-brand h-12 rounded-xl px-6"
              >
                <IconBarcode size={20} className="mr-2" />
                Mulai Scan Barang
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="block space-y-4 lg:hidden">
              {filteredItems.map((item) => {
                const isValid = item.difference === 0 || item.reason;
                return (
                  <div
                    key={item.id}
                    className={`shadow-elevated space-y-3 rounded-2xl p-4 backdrop-blur-xl ${!isValid ? 'bg-danger-50/80 dark:bg-danger-900/40 border-danger-200 dark:border-danger-800 border' : 'border border-white/40 bg-white/70 dark:border-white/10 dark:bg-neutral-900/60'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.inventory?.nama_barang || item.inventory_id}
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 shrink-0 rounded-lg bg-neutral-50 p-1.5 transition-colors dark:bg-neutral-800"
                        >
                          <IconTrash size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="flex flex-col justify-between rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                        <span className="mb-1 text-xs text-neutral-500">Stok Sistem</span>
                        <span className="font-mono text-lg font-medium">{item.system_stock}</span>
                      </div>

                      <div className="bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30 flex flex-col justify-between rounded-lg border p-3">
                        <span className="text-brand-600 dark:text-brand-400 mb-2 text-xs">
                          Stok Fisik
                        </span>
                        <div className="flex items-center gap-2">
                          {isEditable && (
                            <button
                              onClick={() =>
                                updateItem(
                                  item.id,
                                  'physical_stock',
                                  Math.max(0, item.physical_stock - 1),
                                )
                              }
                              className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 active:bg-brand-100 dark:active:bg-brand-900/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white shadow-sm dark:bg-neutral-800"
                            >
                              <IconMinus size={16} />
                            </button>
                          )}
                          <input
                            id={`input-phys-qty-${item.id}`}
                            type="number"
                            value={item.physical_stock}
                            onChange={(e) =>
                              updateItem(item.id, 'physical_stock', parseInt(e.target.value) || 0)
                            }
                            disabled={!isEditable}
                            className="text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800 focus:ring-brand-500 focus:border-brand-500 w-full rounded-md border bg-white px-2 py-1 text-center font-mono text-lg font-bold shadow-inner focus:ring-2 focus:outline-none disabled:opacity-70 dark:bg-neutral-900"
                          />
                          {isEditable && (
                            <button
                              onClick={() =>
                                updateItem(item.id, 'physical_stock', item.physical_stock + 1)
                              }
                              className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 active:bg-brand-100 dark:active:bg-brand-900/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white shadow-sm dark:bg-neutral-800"
                            >
                              <IconPlus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between px-1 text-sm">
                      <span className="text-neutral-500">Selisih:</span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono font-medium ${item.difference > 0 ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : item.difference < 0 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'}`}
                      >
                        {item.difference > 0 ? '+' : ''}
                        {item.difference}
                      </span>
                    </div>

                    {item.difference !== 0 && (
                      <div className="mt-2 space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                        <div>
                          <label className="mb-1 block text-xs text-neutral-500">
                            Alasan Selisih
                          </label>
                          <select
                            value={item.reason || ''}
                            onChange={(e) => updateItem(item.id, 'reason', e.target.value || null)}
                            disabled={!isEditable}
                            className={`focus:ring-brand-500 w-full rounded-lg border bg-neutral-50 px-3 py-2 text-sm focus:ring-2 focus:outline-none focus:ring-inset disabled:opacity-50 dark:bg-neutral-800 ${!isValid ? 'border-danger-400 bg-danger-50 dark:bg-danger-900/20' : 'border-neutral-200 dark:border-neutral-700'}`}
                          >
                            <option value="">-- Pilih Alasan --</option>
                            {reasonOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-neutral-500">
                            Catatan Tambahan
                          </label>
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                            disabled={!isEditable}
                            className="focus:ring-brand-500 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:ring-2 focus:outline-none focus:ring-inset disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                            placeholder="Opsional..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className="shadow-elevated animate-fade-in-up hidden overflow-x-auto rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-neutral-900/60"
              style={{ animationDelay: '100ms' }}
            >
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                    <th className="px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Barang
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Stok Sistem
                    </th>
                    <th className="w-32 px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Stok Fisik
                    </th>
                    <th className="w-24 px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Selisih
                    </th>
                    <th className="w-48 px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Alasan
                    </th>
                    <th className="w-64 px-4 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Catatan
                    </th>
                    {isEditable && (
                      <th className="w-12 px-4 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400"></th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredItems.map((item) => {
                    const isValid = item.difference === 0 || item.reason;
                    return (
                      <tr
                        key={item.id}
                        className={`${!isValid ? 'bg-danger-50/50 dark:bg-danger-900/10' : ''} transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.inventory?.nama_barang || item.inventory_id}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-neutral-600 dark:text-neutral-300">
                          {item.system_stock}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                          <input
                            id={`input-phys-qty-desk-${item.id}`}
                            type="number"
                            value={item.physical_stock}
                            onChange={(e) =>
                              updateItem(item.id, 'physical_stock', parseInt(e.target.value) || 0)
                            }
                            disabled={!isEditable}
                            className="focus:ring-brand-500 focus:border-brand-500 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-right font-mono font-medium shadow-sm focus:ring-2 focus:outline-none focus:ring-inset disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 font-mono text-xs font-medium ${item.difference > 0 ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : item.difference < 0 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'text-neutral-500'}`}
                          >
                            {item.difference > 0 ? '+' : ''}
                            {item.difference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                          <select
                            value={item.reason || ''}
                            onChange={(e) => updateItem(item.id, 'reason', e.target.value || null)}
                            disabled={!isEditable || item.difference === 0}
                            className={`focus:ring-brand-500 w-full rounded-md border bg-white px-2 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none focus:ring-inset disabled:bg-neutral-50 disabled:opacity-50 dark:bg-neutral-800 ${!isValid ? 'border-danger-400' : 'border-neutral-300 dark:border-neutral-700'}`}
                          >
                            <option value="">Pilih Alasan</option>
                            {reasonOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                            disabled={!isEditable}
                            className="focus:ring-brand-500 w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:ring-2 focus:outline-none focus:ring-inset disabled:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                            placeholder="Catatan"
                          />
                        </td>
                        {isEditable && (
                          <td className="px-4 py-3 text-right text-sm">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-danger-500 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded-md p-1.5 transition-colors"
                            >
                              <IconTrash size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="pb-32 lg:pb-0" />

      <ConfirmDialog
        isOpen={showConfirmDiscard}
        title="Batalkan Perubahan"
        message="Semua perubahan yang belum disimpan akan hilang. Yakin ingin melanjutkan?"
        confirmLabel="Ya, Batalkan"
        cancelLabel="Tidak, Tetap"
        onConfirm={discardChanges}
        onCancel={() => setShowConfirmDiscard(false)}
      />

      {showRejectModal && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-900">
              <h3 className="mb-4 text-lg font-bold">Tolak Stock Opname</h3>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="mb-4 h-24 w-full resize-none rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                placeholder="Masukkan alasan penolakan..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-lg px-4 py-2 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Batal
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectNote.trim() || saving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Tolak
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </AmbientLayout>
  );
}
