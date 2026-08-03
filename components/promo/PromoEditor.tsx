'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { IconTags, IconDeviceFloppy, IconArrowLeft, IconScan, IconPlus, IconTrash, IconCalendar, IconArrowRight } from '@tabler/icons-react';
import { toast } from 'sonner';
import { promoApi, Promo, PromoItem, inventoryApi } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { AmbientLayout, Button, Badge, Modal } from '@/components/ui';
import DateInput from '@/components/ui/DateInput';
import { PriceInput } from '@/components/ui/PriceInput';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { formatCurrency, normalizeBarcode, debounce } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/lib/keyboardShortcuts';
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
  const [inventorySearchResults, setInventorySearchResults] = useState<(InventoryItem & { similarity: number })[]>([]);
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
    inventoryApi.getAll().then(res => {
      if (res.data) setInventoryData(res.data);
    });

    if (!isNew && id) {
      promoApi.getById(id).then(res => {
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

  const handleSearchInventory = useCallback(async (query: string) => {
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
  }, [inventoryData]);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => handleSearchInventory(query), 300),
    [handleSearchInventory]
  );

  const handleAddResolvedItem = useCallback((inv: InventoryItem) => {
    if (items.some(i => i.inventory_id === inv.id)) {
      toast.error('Barang sudah ada di daftar promo');
      return;
    }
    
    setItems(prev => [{
      id: '',
      promosi_id: id || '',
      inventory_id: inv.id,
      diskon_nominal: 0,
      created_at: new Date().toISOString(),
      inventory: inv
    }, ...prev]);
    
    setBarcodeInput('');
    setShowAddDropdown(false);
    setInventorySearchResults([]);
    inputRef.current?.focus();
  }, [items, id]);

  const handleBarcodeSubmit = async (input: string) => {
    if (!input.trim()) return;
    const normalized = normalizeBarcode(input);
    if (!normalized) return;

    const exactMatch = inventoryData.find(i => i.kode_barcode === normalized);
    if (exactMatch) {
      handleAddResolvedItem(exactMatch);
      return;
    }

    const fuzzyResult = await inventoryApi.fuzzySearch(normalized, inventoryData);
    if (fuzzyResult.data && fuzzyResult.data.length > 0) {
      const match = fuzzyResult.data.find(i => (i as any).similarity === 100);
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
      const result = await promoApi.upsert({
        id: isNew ? undefined : id,
        nama,
        tanggal_mulai: new Date(tanggalMulai).toISOString(),
        tanggal_selesai: new Date(tanggalSelesai).toISOString(),
        status
      }, items.map(i => ({
        inventory_id: i.inventory_id,
        diskon_nominal: i.diskon_nominal
      })));

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
    setItems(prev => prev.map(item => ({ ...item, diskon_nominal: globalDiskon })));
    toast.success(`Diskon Rp ${globalDiskon.toLocaleString('id-ID')} diterapkan ke ${items.length} barang`);
    setGlobalDiskon(0);
  };

  const handleEditSubmit = () => {
    if (selectedIndex === null || !editMode) return;
    
    const value = editValue;
    if (isNaN(value) || value < 0) return;
    
    setItems(prev => {
      const newItems = [...prev];
      if (editMode === 'diskon') {
        newItems[selectedIndex].diskon_nominal = value;
      }
      return newItems;
    });

    setEditMode(null);
    setSelectedIndex(null);
  };

  useKeyboardShortcuts([
    {
      key: 'F3',
      handler: () => {
        if (items.length > 0) {
          setSelectedIndex(0);
          setEditMode('diskon');
          setEditValue(items[0].diskon_nominal);
        }
      },
      description: 'Edit Diskon baris pertama',
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

  if (loading) {
    return (
      <AmbientLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AmbientLayout>
    );
  }

  const renderPromoConfigForm = () => (
    <div className="flex flex-col xl:flex-row gap-5 w-full">
      <div className="flex-1">
        <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Nama Promo / Campaign</label>
        <input
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Promo Spesial Ramadhan"
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-bold text-lg"
        />
      </div>
      <div className="flex-[1.5] flex flex-col md:flex-row gap-4">
        <div className="flex-[2]">
          <DateRangePicker
            label="Periode Promo"
            startDate={tanggalMulai ? tanggalMulai.split('T')[0] : ''}
            endDate={tanggalSelesai ? tanggalSelesai.split('T')[0] : ''}
            onChange={(start, end) => {
              const startTime = tanggalMulai && tanggalMulai.includes('T') ? tanggalMulai.split('T')[1] : '00:00';
              const endTime = tanggalSelesai && tanggalSelesai.includes('T') ? tanggalSelesai.split('T')[1] : '23:59';
              setTanggalMulai(start ? `${start}T${startTime}` : '');
              setTanggalSelesai(end ? `${end}T${endTime}` : '');
            }}
            className="w-full [&>button]:w-full [&>button]:!py-[11px] [&>button]:!px-4 [&>button]:!rounded-xl [&>button]:!bg-neutral-50 dark:[&>button]:!bg-neutral-900 [&>button]:!border-neutral-200 dark:[&>button]:!border-neutral-700 [&>button]:!font-normal [&>button]:!text-base"
          />
        </div>
        <div className="flex flex-1 gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Jam Mulai</label>
            <input
              type="time"
              value={tanggalMulai ? (tanggalMulai.includes('T') ? tanggalMulai.split('T')[1] : '') : '00:00'}
              onChange={(e) => {
                const date = tanggalMulai ? tanggalMulai.split('T')[0] : new Date().toISOString().split('T')[0];
                setTanggalMulai(`${date}T${e.target.value}`);
              }}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Jam Selesai</label>
            <input
              type="time"
              value={tanggalSelesai ? (tanggalSelesai.includes('T') ? tanggalSelesai.split('T')[1] : '') : '23:59'}
              onChange={(e) => {
                const date = tanggalSelesai ? tanggalSelesai.split('T')[0] : new Date().toISOString().split('T')[0];
                setTanggalSelesai(`${date}T${e.target.value}`);
              }}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-neutral-900 dark:text-neutral-100"
            />
          </div>
        </div>
      </div>
      <div className="w-full xl:w-48">
        <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 block">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'aktif' | 'nonaktif')}
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
        >
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
      </div>
    </div>
  );

  return (
    <AdminOnly>
      <AmbientLayout>
        <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] pb-24 xl:pb-0">
          {/* Header */}
          <div className="mb-4 lg:mb-6 flex-shrink-0">
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => router.back()}
                className="p-2 -ml-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-all"
              >
                <IconArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  {isNew ? 'Buat Promo Baru' : 'Edit Promo'}
                </h1>
                <p className="text-xs lg:text-base text-neutral-500 font-medium">
                  Atur nama, jadwal, dan barang yang mendapatkan diskon
                </p>
              </div>
            </div>

            {/* Promo Configuration Form */}
            <div className="hidden xl:flex bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm mb-6 flex-col xl:flex-row gap-5">
              {renderPromoConfigForm()}
            </div>


            {/* Search and Bulk Action */}
            <div className="flex flex-col xl:flex-row gap-4 relative z-20">
              <div className="flex-1 flex gap-2">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleBarcodeSubmit(barcodeInput);
                }} className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
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
                        setSearchSelectedIndex(prev => Math.min(prev + 1, inventorySearchResults.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setSearchSelectedIndex(prev => Math.max(prev - 1, -1));
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (searchSelectedIndex >= 0) {
                          handleAddResolvedItem(inventorySearchResults[searchSelectedIndex]);
                        } else {
                          handleBarcodeSubmit(barcodeInput);
                        }
                      }
                    }}
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                  {showAddDropdown && barcodeInput.length >= 2 && (
                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl max-h-[40vh] overflow-auto">
                      {inventorySearchResults.map((inv, idx) => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => handleAddResolvedItem(inv)}
                          className={`w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-100 ${searchSelectedIndex === idx ? 'bg-neutral-50' : ''}`}
                        >
                          <div className="font-medium">{inv.nama_barang}</div>
                          <div className="text-xs text-neutral-500">{inv.kode_barcode || 'Tanpa barcode'} | Harga: {formatCurrency(inv.harga_jual)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              {/* Bulk Edit Panel */}
              <div className="flex gap-2 items-stretch mt-4 xl:mt-0">
                <div className="w-full sm:w-48">
                  <PriceInput
                    value={globalDiskon}
                    onChange={setGlobalDiskon}
                    label="Set Diskon Massal"
                    className="w-full bg-white dark:bg-neutral-900"
                  />
                </div>
                <Button onClick={applyGlobalDiscount} variant="primary" disabled={globalDiskon <= 0 || items.length === 0} className="px-6 rounded-xl">Terapkan</Button>
              </div>
            </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm flex flex-col mb-6">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse hidden lg:table">
                <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <tr>
                    <th className="py-4 px-5 text-xs font-bold text-neutral-500 uppercase">Barang</th>
                    <th className="py-4 px-5 text-xs font-bold text-neutral-500 uppercase text-right">Harga Asli</th>
                    <th className="py-4 px-5 text-xs font-bold text-neutral-500 uppercase text-right">Nominal Diskon (F3)</th>
                    <th className="py-4 px-5 text-xs font-bold text-neutral-500 uppercase text-right">Harga Promo</th>
                    <th className="py-4 px-5 text-xs font-bold text-neutral-500 uppercase text-center w-16">Aksi</th>
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
                        <tr key={item.inventory_id} className={`group ${selectedIndex === idx ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}>
                          <td className="py-3 px-5">
                            <div className="font-bold text-neutral-900 dark:text-neutral-100">{item.inventory?.nama_barang}</div>
                            <div className="text-xs text-neutral-500 font-mono">{item.inventory?.kode_barcode}</div>
                          </td>
                          <td className="py-3 px-5 text-right font-medium text-neutral-600 dark:text-neutral-400">
                            {formatCurrency(hargaAsli)}
                          </td>
                          <td className="py-3 px-5 text-right">
                            {isEditing ? (
                              <div className="w-36 ml-auto" onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSubmit();
                                if (e.key === 'Escape') {
                                  setEditMode(null);
                                  setSelectedIndex(null);
                                }
                              }}>
                                <PriceInput
                                  autoFocus
                                  value={editValue}
                                  onChange={setEditValue}
                                  onBlur={handleEditSubmit}
                                  className="!px-3 !py-1.5 !rounded-lg border border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-neutral-900 text-sm font-bold text-right"
                                />
                              </div>
                            ) : (
                              <div className="w-36 ml-auto">
                                <button
                                  onClick={() => {
                                    setSelectedIndex(idx);
                                    setEditMode('diskon');
                                    setEditValue(item.diskon_nominal);
                                  }}
                                  className="px-3 py-1.5 w-full text-right hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent rounded-lg transition-colors font-bold text-brand-600 dark:text-brand-400"
                                >
                                  {formatCurrency(item.diskon_nominal)}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(Math.max(0, hargaFinal))}
                            </div>
                          </td>
                          <td className="py-3 px-5 text-center">
                            <button
                              onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
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
              <div className="block lg:hidden space-y-3 p-4 bg-neutral-50/50 dark:bg-neutral-950/50 min-h-full">
                {items.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
                    Belum ada barang di promo ini. Scan barcode di atas.
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const hargaAsli = item.inventory?.harga_jual || 0;
                    const hargaFinal = hargaAsli - item.diskon_nominal;
                    const isEditing = selectedIndex === idx && editMode === 'diskon';

                    return (
                      <div key={`${item.inventory_id}-mobile`} className="bg-white dark:bg-neutral-900 rounded-2xl p-3 border border-neutral-200 dark:border-neutral-800 shadow-sm relative transition-all">
                        <button
                          onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition-colors btn-press"
                        >
                          <IconTrash size={18} stroke={1.5} />
                        </button>
                        <div className="pr-10 mb-3">
                          <div className="font-bold text-neutral-900 dark:text-white text-base leading-tight mb-1">{item.inventory?.nama_barang}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.inventory?.kode_barcode}</div>
                        </div>

                        <div className="grid grid-cols-[1fr_1fr] gap-3">
                          <div>
                            <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5">Harga Asli</label>
                            <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 rounded-lg line-through decoration-red-500/50">
                              {formatCurrency(hargaAsli)}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium block mb-1.5 text-right">Nominal Diskon (F3)</label>
                            {isEditing ? (
                              <div onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSubmit();
                                if (e.key === 'Escape') {
                                  setEditMode(null);
                                  setSelectedIndex(null);
                                }
                              }}>
                                <PriceInput
                                  autoFocus
                                  value={editValue}
                                  onChange={setEditValue}
                                  onBlur={handleEditSubmit}
                                  className="w-full text-right !py-1.5 !px-3 !rounded-lg border-brand-500 ring-2 ring-brand-500/20 font-bold text-sm bg-white dark:bg-neutral-900"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedIndex(idx);
                                  setEditMode('diskon');
                                  setEditValue(item.diskon_nominal);
                                }}
                                className="w-full px-3 py-2 text-right bg-brand-50/50 dark:bg-brand-900/20 border border-dashed border-brand-200 dark:border-brand-800 rounded-lg font-black text-brand-600 dark:text-brand-400 shadow-sm hover:bg-brand-50 dark:hover:bg-brand-900/40 transition-colors text-sm"
                              >
                                {formatCurrency(item.diskon_nominal)}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10 -mx-4 -mb-4 px-4 py-3 rounded-b-2xl">
                          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Harga Promo</span>
                          <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(Math.max(0, hargaFinal))}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="hidden xl:block flex-shrink-0 relative bottom-0">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-elevated flex justify-between items-center">
              <div className="text-neutral-500 font-medium">
                Total Barang di Promo: <strong className="text-neutral-900 dark:text-white text-xl ml-2">{items.length}</strong>
              </div>
              <Button
                onClick={handleSimpan}
                disabled={items.length === 0 || submitting || !nama.trim()}
                variant="primary"
                size="lg"
                className="shadow-brand px-12"
                leftIcon={<IconDeviceFloppy className="w-5 h-5" />}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Promo'}
              </Button>
            </div>
          </div>
        </div>
        {/* Mobile Mini Cart (Trigger) */}
        <div className="xl:hidden fixed bottom-0 left-0 right-0 z-[40] bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300">
          <div 
            className="h-[4.5rem] px-4 flex items-center justify-between cursor-pointer transition-opacity opacity-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-t-3xl"
            onClick={() => setIsBottomSheetOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <IconTags className="text-brand-600 dark:text-brand-400" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-tight mb-0.5">Promo</p>
                <p className="text-lg font-black text-brand-600 dark:text-brand-400 leading-tight truncate max-w-[150px]">{nama || 'Promo Baru'}</p>
              </div>
            </div>
            
            <div className="flex items-center text-neutral-400 dark:text-neutral-500 font-medium text-sm gap-1 pr-1">
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
            
            <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="secondary"
                onClick={() => setIsBottomSheetOpen(false)}
                className="flex-1"
              >
                Tutup
              </Button>
              <Button
                onClick={handleSimpan}
                disabled={items.length === 0 || submitting || !nama.trim()}
                variant="primary"
                className="flex-[2] shadow-brand"
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
