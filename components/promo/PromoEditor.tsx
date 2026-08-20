'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconTags,
  IconDeviceFloppy,
  IconArrowLeft,
  IconScan,
  IconPlus,
  IconTrash,
  IconCalendar,
  IconArrowRight,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { promoApi, Promo, PromoItem, inventoryApi } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { AmbientLayout, Button, Badge, Modal, TextInput, SelectInput } from '@/components/ui';
import DateInput from '@/components/ui/DateInput';
import { PriceInput } from '@/components/ui/PriceInput';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { formatCurrency, normalizeBarcode, debounce } from '@/lib/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import { AdminOnly } from '@/components/role';

export default function PromoEditor({ id }: { id?: string }) {
  const router = useRouter();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);

  // Promo Header State
  const [nama, setNama] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [tanggalSelesai, setTanggalSelesai] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Items State
  const [items, setItems] = useState<PromoItem[]>([]);
  const [globalDiskon, setGlobalDiskon] = useState<number>(0);

  // Search State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [inventorySearchResults, setInventorySearchResults] = useState<
    (InventoryItem & { similarity: number })[]
  >([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'diskon' | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Load Inventory for Fuzzy Search
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);

  useEffect(() => {
    inventoryApi.getAll().then((res) => {
      if (res.data) setInventoryData(res.data);
    });

    if (!isNew && id) {
      promoApi.getById(id).then((res) => {
        if (res.data) {
          setNama(res.data.promo.nama);
          setTanggalMulai(res.data.promo.tanggal_mulai.slice(0, 16));
          setTanggalSelesai(res.data.promo.tanggal_selesai.slice(0, 16));
          setStatus(res.data.promo.status);
          setItems(res.data.items);
        } else {
          toast.error('Promo tidak ditemukan');
          router.push('/inventory/promo');
        }
        setLoading(false);
      });
    }
  }, [id, isNew, router]);

  const handleSearchInventory = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setInventorySearchResults([]);
        setShowAddDropdown(false);
        setSearchSelectedIndex(-1);
        return;
      }
      const result = await inventoryApi.fuzzySearch(query, inventoryData);
      if (!result.error && result.data) {
        setInventorySearchResults(result.data as (InventoryItem & { similarity: number })[]);
        setShowAddDropdown(true);
      }
    },
    [inventoryData],
  );

  const debouncedSearch = useMemo(
    () => debounce((query: string) => handleSearchInventory(query), 300),
    [handleSearchInventory],
  );

  const handleAddResolvedItem = useCallback(
    (inv: InventoryItem) => {
      if (items.some((i) => i.inventory_id === inv.id)) {
        toast.error('Barang sudah ada di daftar promo');
        return;
      }

      setItems((prev) => [
        {
          id: '',
          promosi_id: id || '',
          inventory_id: inv.id,
          diskon_nominal: 0,
          created_at: new Date().toISOString(),
          inventory: inv,
        },
        ...prev,
      ]);

      setBarcodeInput('');
      setShowAddDropdown(false);
      setInventorySearchResults([]);
      inputRef.current?.focus();
    },
    [items, id],
  );

  const handleBarcodeSubmit = async (input: string) => {
    if (!input.trim()) return;
    const normalized = normalizeBarcode(input);
    if (!normalized) return;

    const exactMatch = inventoryData.find((i) => i.kode_barcode === normalized);
    if (exactMatch) {
      handleAddResolvedItem(exactMatch);
      return;
    }

    const fuzzyResult = await inventoryApi.fuzzySearch(normalized, inventoryData);
    if (fuzzyResult.data && fuzzyResult.data.length > 0) {
      const match = fuzzyResult.data.find((i) => (i as any).similarity === 100);
      if (match) {
        handleAddResolvedItem(match as InventoryItem);
        return;
      }
    }

    toast.error('Barang tidak ditemukan');
  };

  const handleSimpan = async () => {
    if (!nama.trim()) {
      toast.error('Nama promo harus diisi');
      return;
    }

    setSubmitting(true);
    try {
      const result = await promoApi.upsert(
        {
          id: isNew ? undefined : id,
          nama,
          tanggal_mulai: new Date(tanggalMulai).toISOString(),
          tanggal_selesai: new Date(tanggalSelesai).toISOString(),
          status,
        },
        items.map((i) => ({
          inventory_id: i.inventory_id,
          diskon_nominal: i.diskon_nominal,
        })),
      );

      if (result.error) throw result.error;

      toast.success(isNew ? 'Promo berhasil dibuat' : 'Promo berhasil diperbarui');
      router.push('/inventory/promo');
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan promo');
    } finally {
      setSubmitting(false);
    }
  };

  const applyGlobalDiscount = () => {
    if (items.length === 0) return;
    setItems((prev) => prev.map((item) => ({ ...item, diskon_nominal: globalDiskon })));
    toast.success(
      `Diskon Rp ${globalDiskon.toLocaleString('id-ID')} diterapkan ke ${items.length} barang`,
    );
    setGlobalDiskon(0);
  };

  const handleEditSubmit = () => {
    if (selectedIndex === null || !editMode) return;

    const value = editValue;
    if (isNaN(value) || value < 0) return;

    setItems((prev) => {
      const newItems = [...prev];
      if (editMode === 'diskon') {
        newItems[selectedIndex].diskon_nominal = value;
      }
      return newItems;
    });

    setEditMode(null);
    setSelectedIndex(null);
  };

  useHotkeys('f3', (e) => {
    e.preventDefault();
    if (items.length > 0) {
      setSelectedIndex(0);
      setEditMode('diskon');
      setEditValue(items[0].diskon_nominal);
    }
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    setEditMode(null);
    setSelectedIndex(null);
  }, { enableOnFormTags: true });

  if (loading) {
    return (
      <AmbientLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      </AmbientLayout>
    );
  }

  const renderPromoConfigForm = () => (
    <div className="flex w-full flex-col gap-5 xl:flex-row">
      <div className="flex-1">
        <TextInput
          label="Nama Promo / Campaign"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Promo Spesial Ramadhan"
          className="text-lg font-bold"
        />
      </div>
      <div className="flex flex-[1.5] flex-col gap-4 md:flex-row">
        <div className="flex-[2]">
          <DateRangePicker
            label="Periode Promo"
            variant="floating"
            startDate={tanggalMulai ? tanggalMulai.split('T')[0] : ''}
            endDate={tanggalSelesai ? tanggalSelesai.split('T')[0] : ''}
            onChange={(start, end) => {
              const startTime =
                tanggalMulai && tanggalMulai.includes('T') ? tanggalMulai.split('T')[1] : '00:00';
              const endTime =
                tanggalSelesai && tanggalSelesai.includes('T')
                  ? tanggalSelesai.split('T')[1]
                  : '23:59';
              setTanggalMulai(start ? `${start}T${startTime}` : '');
              setTanggalSelesai(end ? `${end}T${endTime}` : '');
            }}
            className="w-full"
          />
        </div>
        <div className="flex flex-1 gap-4">
          <div className="flex-1">
            <TextInput
              label="Jam Mulai"
              type="time"
              value={
                tanggalMulai
                  ? tanggalMulai.includes('T')
                    ? tanggalMulai.split('T')[1]
                    : ''
                  : '00:00'
              }
              onChange={(e) => {
                const date = tanggalMulai
                  ? tanggalMulai.split('T')[0]
                  : new Date().toISOString().split('T')[0];
                setTanggalMulai(`${date}T${e.target.value}`);
              }}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="Jam Selesai"
              type="time"
              value={
                tanggalSelesai
                  ? tanggalSelesai.includes('T')
                    ? tanggalSelesai.split('T')[1]
                    : ''
                  : '23:59'
              }
              onChange={(e) => {
                const date = tanggalSelesai
                  ? tanggalSelesai.split('T')[0]
                  : new Date().toISOString().split('T')[0];
                setTanggalSelesai(`${date}T${e.target.value}`);
              }}
            />
          </div>
        </div>
      </div>
      <div className="w-full xl:w-48">
        <SelectInput
          label="Status"
          value={status}
          onChange={(val) => setStatus(val as 'aktif' | 'nonaktif')}
          options={[
            { value: 'aktif', label: 'Aktif' },
            { value: 'nonaktif', label: 'Nonaktif' },
          ]}
        />
      </div>
    </div>
  );

  return (
    <AdminOnly>
      <AmbientLayout>
        <div className="flex min-h-[calc(100vh-2rem)] flex-col pb-24 lg:h-[calc(100vh-2rem)] xl:pb-0">
          {/* Header */}
          <div className="mb-4 flex-shrink-0 lg:mb-6">
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="-ml-2 rounded-xl p-2 text-neutral-600 transition-all hover:bg-neutral-100"
              >
                <IconArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                  {isNew ? 'Buat Promo Baru' : 'Edit Promo'}
                </h1>
                <p className="text-xs font-medium text-neutral-500 lg:text-base">
                  Atur nama, jadwal, dan barang yang mendapatkan diskon
                </p>
              </div>
            </div>

            {/* Promo Configuration Form */}
            <div className="mb-6 hidden flex-col gap-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm xl:flex xl:flex-row dark:border-neutral-800 dark:bg-neutral-900">
              {renderPromoConfigForm()}
            </div>

            {/* Search and Bulk Action */}
            <div className="relative z-20 flex flex-col gap-4 xl:flex-row">
              <div className="flex flex-1 gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleBarcodeSubmit(barcodeInput);
                  }}
                  className="relative flex-1"
                >
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-400">
                    <IconScan size={22} />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Cari atau scan barcode untuk ditambahkan..."
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      setSearchSelectedIndex(-1);
                      debouncedSearch(e.target.value);
                    }}
                    onFocus={() => {
                      if (barcodeInput.length >= 2) setShowAddDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowAddDropdown(false), 200)}
                    onKeyDown={(e) => {
                      if (!showAddDropdown) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setSearchSelectedIndex((prev) =>
                          Math.min(prev + 1, inventorySearchResults.length - 1),
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSearchSelectedIndex((prev) => Math.max(prev - 1, -1));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchSelectedIndex >= 0) {
                          handleAddResolvedItem(inventorySearchResults[searchSelectedIndex]);
                        } else {
                          handleBarcodeSubmit(barcodeInput);
                        }
                      }
                    }}
                    className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-white py-3.5 pr-4 pl-12 shadow-sm focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  {showAddDropdown && barcodeInput.length >= 2 && (
                    <div className="absolute z-20 mt-2 max-h-[40vh] w-full overflow-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                      {inventorySearchResults.map((inv, idx) => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => handleAddResolvedItem(inv)}
                          className={`w-full border-b border-neutral-100 px-4 py-3 text-left transition-colors hover:bg-neutral-50 ${searchSelectedIndex === idx ? 'bg-neutral-50' : ''}`}
                        >
                          <div className="font-medium">{inv.nama_barang}</div>
                          <div className="text-xs text-neutral-500">
                            {inv.kode_barcode || 'Tanpa barcode'} | Harga:{' '}
                            {formatCurrency(inv.harga_jual)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              {/* Bulk Edit Panel */}
              <div className="mt-4 flex items-stretch gap-2 xl:mt-0">
                <div className="w-full sm:w-48">
                  <PriceInput
                    value={globalDiskon}
                    onChange={setGlobalDiskon}
                    label="Set Diskon Massal"
                    className="w-full bg-white dark:bg-neutral-900"
                  />
                </div>
                <Button
                  onClick={applyGlobalDiscount}
                  variant="primary"
                  disabled={globalDiskon <= 0 || items.length === 0}
                  className="rounded-xl px-6"
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className="mb-6 flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex-1 overflow-auto">
              <table className="hidden w-full border-collapse text-left lg:table">
                <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold text-neutral-500 uppercase">
                      Barang
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-neutral-500 uppercase">
                      Harga Asli
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-neutral-500 uppercase">
                      Nominal Diskon (F3)
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-neutral-500 uppercase">
                      Harga Promo
                    </th>
                    <th className="w-16 px-5 py-4 text-center text-xs font-bold text-neutral-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500">
                        Belum ada barang di promo ini. Scan barcode di atas.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const hargaAsli = item.inventory?.harga_jual || 0;
                      const hargaFinal = hargaAsli - item.diskon_nominal;
                      const isEditing = selectedIndex === idx && editMode === 'diskon';

                      return (
                        <tr
                          key={item.inventory_id}
                          className={`group ${selectedIndex === idx ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
                        >
                          <td className="px-5 py-3">
                            <div className="font-bold text-neutral-900 dark:text-neutral-100">
                              {item.inventory?.nama_barang}
                            </div>
                            <div className="font-mono text-xs text-neutral-500">
                              {item.inventory?.kode_barcode}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-medium text-neutral-600 dark:text-neutral-400">
                            {formatCurrency(hargaAsli)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {isEditing ? (
                              <div
                                className="ml-auto w-36"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditSubmit();
                                  if (e.key === 'Escape') {
                                    setEditMode(null);
                                    setSelectedIndex(null);
                                  }
                                }}
                              >
                                <PriceInput
                                  autoFocus
                                  value={editValue}
                                  onChange={setEditValue}
                                  onBlur={handleEditSubmit}
                                  className="border-brand-500 ring-brand-500/20 !rounded-lg border bg-white !px-3 !py-1.5 text-right text-sm font-bold ring-2 dark:bg-neutral-900"
                                />
                              </div>
                            ) : (
                              <div className="ml-auto w-36">
                                <button
                                  onClick={() => {
                                    setSelectedIndex(idx);
                                    setEditMode('diskon');
                                    setEditValue(item.diskon_nominal);
                                  }}
                                  className="text-brand-600 dark:text-brand-400 w-full rounded-lg border border-transparent px-3 py-1.5 text-right font-bold transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                  {formatCurrency(item.diskon_nominal)}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(Math.max(0, hargaFinal))}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="rounded-xl p-2 text-red-500 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-50"
                            >
                              <IconTrash size={20} stroke={1.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Mobile Cards Layout */}
              <div className="block min-h-full space-y-3 bg-neutral-50/50 p-4 lg:hidden dark:bg-neutral-950/50">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500">
                    Belum ada barang di promo ini. Scan barcode di atas.
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const hargaAsli = item.inventory?.harga_jual || 0;
                    const hargaFinal = hargaAsli - item.diskon_nominal;
                    const isEditing = selectedIndex === idx && editMode === 'diskon';

                    return (
                      <div
                        key={`${item.inventory_id}-mobile`}
                        className="relative rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm transition-all dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <button
                          onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="btn-press absolute top-3 right-3 rounded-xl p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                        >
                          <IconTrash size={18} stroke={1.5} />
                        </button>
                        <div className="mb-3 pr-10">
                          <div className="mb-1 text-base leading-tight font-bold text-neutral-900 dark:text-white">
                            {item.inventory?.nama_barang}
                          </div>
                          <div className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                            {item.inventory?.kode_barcode}
                          </div>
                        </div>

                        <div className="grid grid-cols-[1fr_1fr] gap-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                              Harga Asli
                            </label>
                            <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-600 line-through decoration-red-500/50 dark:bg-neutral-800/50 dark:text-neutral-400">
                              {formatCurrency(hargaAsli)}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-right text-xs font-medium text-neutral-500 dark:text-neutral-400">
                              Nominal Diskon (F3)
                            </label>
                            {isEditing ? (
                              <div
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditSubmit();
                                  if (e.key === 'Escape') {
                                    setEditMode(null);
                                    setSelectedIndex(null);
                                  }
                                }}
                              >
                                <PriceInput
                                  autoFocus
                                  value={editValue}
                                  onChange={setEditValue}
                                  onBlur={handleEditSubmit}
                                  className="border-brand-500 ring-brand-500/20 w-full !rounded-lg bg-white !px-3 !py-1.5 text-right text-sm font-bold ring-2 dark:bg-neutral-900"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedIndex(idx);
                                  setEditMode('diskon');
                                  setEditValue(item.diskon_nominal);
                                }}
                                className="bg-brand-50/50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/40 w-full rounded-lg border border-dashed px-3 py-2 text-right text-sm font-black shadow-sm transition-colors"
                              >
                                {formatCurrency(item.diskon_nominal)}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="-mx-4 mt-3 -mb-4 flex items-center justify-between rounded-b-2xl border-t border-neutral-100 bg-emerald-50/30 px-4 py-3 pt-3 dark:border-neutral-800 dark:bg-emerald-900/10">
                          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                            Harga Promo
                          </span>
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(Math.max(0, hargaFinal))}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="relative bottom-0 hidden flex-shrink-0 xl:block">
            <div className="shadow-elevated flex items-center justify-between rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="font-medium text-neutral-500">
                Total Barang di Promo:{' '}
                <strong className="ml-2 text-xl text-neutral-900 dark:text-white">
                  {items.length}
                </strong>
              </div>
              <Button
                onClick={handleSimpan}
                disabled={items.length === 0 || submitting || !nama.trim()}
                variant="primary"
                size="lg"
                className="shadow-brand px-12"
                leftIcon={<IconDeviceFloppy className="h-5 w-5" />}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Promo'}
              </Button>
            </div>
          </div>
        </div>
        {/* Mobile Mini Cart (Trigger) */}
        <div className="fixed right-0 bottom-0 left-0 z-[40] rounded-t-3xl border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-300 xl:hidden dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          <div
            className="flex h-[4.5rem] cursor-pointer items-center justify-between rounded-t-3xl px-4 opacity-100 transition-opacity hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            onClick={() => setIsBottomSheetOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand-50 dark:bg-brand-900/30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <IconTags className="text-brand-600 dark:text-brand-400" size={20} />
              </div>
              <div>
                <p className="mb-0.5 text-[10px] leading-tight font-medium text-neutral-500 dark:text-neutral-400">
                  Promo
                </p>
                <p className="text-brand-600 dark:text-brand-400 max-w-[150px] truncate text-lg leading-tight font-black">
                  {nama || 'Promo Baru'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 pr-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">
              <span>Selesaikan</span>
              <IconArrowRight size={18} />
            </div>
          </div>
        </div>

        {/* Vaul Bottom Sheet for Promo Configuration */}
        <Modal
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          isBottomSheetOnMobile
          title="Selesaikan Promo"
        >
          <div className="flex flex-col gap-5 p-1 pt-3">
            {renderPromoConfigForm()}

            <div className="flex gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <Button
                onClick={handleSimpan}
                disabled={items.length === 0 || submitting || !nama.trim()}
                variant="primary"
                className="shadow-brand w-full"
                leftIcon={<IconDeviceFloppy size={18} />}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Promo'}
              </Button>
            </div>
          </div>
        </Modal>
      </AmbientLayout>
    </AdminOnly>
  );
}
