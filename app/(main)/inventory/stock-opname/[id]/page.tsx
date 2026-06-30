'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { debounce } from '@/lib/utils';
import { StockOpname, StockOpnameItem, stockOpnameApi } from '@/lib/api/stockOpname';
import { stockAdjustmentApi } from '@/lib/api/stockAdjustment';
import { inventoryApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconCheck, IconX, IconSend, IconLoader2, IconDeviceFloppy, IconRefresh, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Portal } from '@/components/ui/Portal';
import SelectInput from '@/components/ui/SelectInput';
import TextareaInput from '@/components/ui/TextareaInput';
import { Button, Breadcrumb, Badge, Card, AmbientLayout } from '@/components/ui';

const reasonOptions = [
  { value: 'salah_input', label: 'Kesalahan Input' },
  { value: 'rusak', label: 'Barang Rusak' },
  { value: 'hilang', label: 'Barang Hilang' },
  { value: 'kadaluarsa', label: 'Kadaluarsa' },
  { value: 'salah_hitung', label: 'Kesalahan Hitung' },
  { value: 'lainnya', label: 'Lainnya' }
];

export default function StockOpnameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opnameId = params.id as string;

  const [opname, setOpname] = useState<StockOpname | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchAdd, setSearchAdd] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [inventorySearchResults, setInventorySearchResults] = useState<any[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: async () => {
      const res = await inventoryApi.getAll();
      return res.data || [];
    },
  });
  const { toasts, showToast, removeToast } = useToast();

  const addToast = ({ type, message }: { type: 'success' | 'error' | 'info', message: string }) => {
    showToast(message, type);
  };
  const addSearchRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [opnameResult, itemsResult] = await Promise.all([
      stockOpnameApi.getById(opnameId),
      stockOpnameApi.getItems(opnameId)
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

  const updateItem = (itemId: string, field: string, value: any) => {
    setItems(prev => {
      const newItems = prev.map(item => {
        if (item.id !== itemId) return item;
        
        const updated = { ...item, [field]: value };
        
        if (field === 'physical_stock') {
          updated.difference = value - item.system_stock;
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
          note: item.note || undefined
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

  const handleSearchInventory = async (query: string, currentItems: any[], allInventory: any[]) => {
    if (query.length < 2) {
      setInventorySearchResults([]);
      setShowAddDropdown(false);
      return;
    }

    // Gunakan fuzzy search sama seperti di halaman pembelian
    const result = await inventoryApi.fuzzySearch(query, allInventory);
    if (!result.error && result.data) {
      const existingIds = currentItems.map(i => i.inventory_id);
      const filtered = result.data.filter((i: any) => !existingIds.includes(i.id));
      setInventorySearchResults(filtered);
      setShowAddDropdown(filtered.length > 0);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce((query: string, currentItems: any[], allInventory: any[]) => handleSearchInventory(query, currentItems, allInventory), 300),
    []
  );

  const addItemToOpname = async (inventory: any) => {
    // Segera tutup dropdown dan reset input untuk mencegah race condition
    setShowAddDropdown(false);
    setSearchAdd('');
    setInventorySearchResults([]);

    const result = await stockOpnameApi.addItem(opnameId, inventory.id);
    if (!result.error && result.data) {
      setItems(prev => [...prev, result.data]);
      setOriginalItems(prev => [...prev, result.data]);
      addToast({ type: 'success', message: `${inventory.nama_barang} ditambahkan` });
      
      // Auto focus kembali ke input untuk scan berikutnya
      setTimeout(() => {
        if (addSearchRef.current) {
          addSearchRef.current.focus();
        }
      }, 50);
    } else {
      addToast({ type: 'error', message: result.error?.message || 'Gagal menambahkan barang' });
    }
  };

  const removeItem = async (itemId: string) => {
    await stockOpnameApi.deleteItem(itemId);
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== itemId);
      return filtered;
    });
    setOriginalItems(prev => {
      const filtered = prev.filter(i => i.id !== itemId);
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
      addToast({ type: "error", message: result.error.message });
    } else {
      setProcessing(true);
      await stockAdjustmentApi.processOpnameAdjustments(opnameId);
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
      addToast({ type: "error", message: result.error.message });
    } else {
      setShowRejectModal(false);
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AmbientLayout>
        <div className="text-center py-12 text-neutral-500">Loading...</div>
      </AmbientLayout>
    );
  }

  if (!opname) {
    return (
      <AmbientLayout>
        <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4 mb-4">
            <p className="text-danger-700 dark:text-danger-300">Gagal memuat data stock opname. Pastikan Anda memiliki akses yang tepat.</p>
          </div>
          <button
            onClick={() => router.push('/stock-opname')}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
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

  const filteredItems = items.filter(item => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      item.inventory?.nama_barang?.toLowerCase().includes(search) ||
      item.inventory?.kode_barcode?.toLowerCase().includes(search)
    );
  });

   const hasInvalidItems = items.some(item => item.difference !== 0 && !item.reason);
   const invalidItemCount = items.filter(item => item.difference !== 0 && !item.reason).length;

return (
    <AmbientLayout>
      <Breadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stock Opname', href: '/inventory/stock-opname' },
          { label: opname?.opname_date ? new Date(opname.opname_date).toLocaleDateString('id-ID') : 'Detail', isActive: true },
        ]}
        className="mb-4"
      />
      
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 animate-fade-in-up pl-12 lg:pl-0">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center shadow-brand shrink-0">
            <IconSearch className="w-5 h-5 lg:w-6 lg:h-6 text-white" stroke={1.5} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight line-clamp-1">Detail Stock Opname</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-xs lg:text-base font-medium">Pengelolaan stok fisik</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-between items-center fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 lg:static lg:bg-transparent lg:border-none lg:p-0 lg:mb-6">
          <Button variant="ghost" onClick={() => router.push('/inventory/stock-opname')}>
            <IconArrowLeft size={18} />
            <span className="hidden sm:inline">Kembali</span>
          </Button>

          <div className="flex gap-2">
            {isDraft && (
              <>
                {hasChanges && (
                  <Button variant="ghost" onClick={() => setShowConfirmDiscard(true)} disabled={saving}>
                    <IconRefresh size={18} />
                    <span className="hidden sm:inline">Batal</span>
                  </Button>
                )}
                {hasChanges && (
                  <Button onClick={saveChanges} disabled={saving || hasInvalidItems}>
                    {saving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                    <span className="hidden sm:inline">
                      {saving && saveProgress.total > 0 
                        ? `Menyimpan (${saveProgress.current}/${saveProgress.total})...` 
                        : saving 
                          ? 'Menyimpan...' 
                          : 'Simpan Perubahan'}
                    </span>
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={saving || hasInvalidItems}
                  className={hasInvalidItems ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <IconSend size={18} />
                  <span className="hidden sm:inline">{saving ? 'Mengirim...' : 'Submit untuk Approval'}</span>
                </Button>
              </>
            )}
            {isPending && (
              <>
                <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={saving}>
                  <IconX size={18} />
                  <span className="hidden sm:inline">Tolak</span>
                </Button>
                <Button variant="primary" onClick={handleApprove} disabled={saving || processing}>
                  {processing ? <IconLoader2 size={18} className="animate-spin" /> : <IconCheck size={18} />}
                  <span className="hidden sm:inline">{processing ? 'Memproses...' : 'Setujui'}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {isDraft && (
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconSearch size={18} />
              </div>
              <input
                ref={addSearchRef}
                type="text"
                placeholder="Cari barang untuk ditambahkan..."
                value={searchAdd}
                onChange={(e) => {
                  setSearchAdd(e.target.value);
                  debouncedSearch(e.target.value, items, inventoryData || []);
                }}
                onFocus={() => searchAdd.length >= 2 && debouncedSearch(searchAdd, items, inventoryData || [])}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inventorySearchResults.length > 0) {
                    e.preventDefault();
                    addItemToOpname(inventorySearchResults[0]);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {showAddDropdown && inventorySearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {inventorySearchResults.map((inventory) => (
                    <button
                      key={inventory.id}
                      onClick={() => addItemToOpname(inventory)}
                      className="w-full px-4 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{inventory.nama_barang}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{inventory.kode_barcode || 'Tanpa barcode'} | Stok: {inventory.stok}</div>
                      </div>
                      <div className="text-xs bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 px-2 py-1 rounded-full">
                        {inventory.similarity}% cocok
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="relative flex-1 max-w-md">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconSearch size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Cari di dalam daftar..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
          </div>
        )}

          {hasInvalidItems && (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4 mb-4">
              <p className="text-danger-700 dark:text-danger-300 font-medium">
                ⚠️ Ada {invalidItemCount} item yang belum diisi alasan selisih. Mohon isi alasan sebelum submit.
              </p>
            </div>
          )}

          <div className="mb-6">
              {items.length === 0 ? (
                <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-elevated rounded-3xl px-4 py-16 text-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <div className="text-neutral-500 dark:text-neutral-400 mb-2 font-medium">Belum ada barang yang ditambahkan</div>
                  <div className="text-sm text-neutral-400">Gunakan kotak pencarian di atas untuk menambahkan barang yang akan dihitung</div>
                </div>
              ) : (
                <>
                  <div className="block lg:hidden space-y-4">
                    {filteredItems.map((item) => {
                      const isValid = item.difference === 0 || item.reason;
                      return (
                        <div key={item.id} className={`backdrop-blur-xl rounded-2xl shadow-elevated p-4 space-y-3 ${!isValid ? 'bg-danger-50/80 dark:bg-danger-900/40 border border-danger-200 dark:border-danger-800' : 'bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">{item.inventory?.nama_barang || item.inventory_id}</div>
                            {isEditable && (
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors shrink-0 bg-neutral-50 dark:bg-neutral-800"
                              >
                                <IconTrash size={16} />
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg flex flex-col justify-between">
                              <span className="text-xs text-neutral-500 mb-1">Stok Sistem</span>
                              <span className="font-mono text-lg font-medium">{item.system_stock}</span>
                            </div>
                            
                            <div className="bg-brand-50 dark:bg-brand-900/10 p-3 rounded-lg flex flex-col justify-between border border-brand-100 dark:border-brand-900/30">
                              <span className="text-xs text-brand-600 dark:text-brand-400 mb-1">Stok Fisik</span>
                              <input
                                type="number"
                                value={item.physical_stock}
                                onChange={(e) => updateItem(item.id, 'physical_stock', parseInt(e.target.value) || 0)}
                                disabled={!isEditable}
                                className="w-full text-lg font-mono font-bold text-brand-700 dark:text-brand-300 bg-transparent border-b border-brand-200 dark:border-brand-800 rounded-none px-0 py-0 disabled:opacity-70 focus:outline-none focus:border-brand-500 text-left"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm px-1 mt-2">
                            <span className="text-neutral-500">Selisih:</span>
                            <span className={`font-mono font-medium px-2 py-0.5 rounded-full ${item.difference > 0 ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : item.difference < 0 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          </div>

                          {item.difference !== 0 && (
                            <div className="space-y-3 pt-4 mt-2 border-t border-neutral-100 dark:border-neutral-800">
                              <div>
                                <label className="text-xs text-neutral-500 mb-1 block">Alasan Selisih</label>
                                <select
                                  value={item.reason || ''}
                                  onChange={(e) => updateItem(item.id, 'reason', e.target.value || null)}
                                  disabled={!isEditable}
                                  className={`w-full bg-neutral-50 dark:bg-neutral-800 border rounded-lg px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 ${!isValid ? 'border-danger-400 bg-danger-50 dark:bg-danger-900/20' : 'border-neutral-200 dark:border-neutral-700'}`}
                                >
                                  <option value="">-- Pilih Alasan --</option>
                                  {reasonOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-neutral-500 mb-1 block">Catatan Tambahan</label>
                                <input
                                  type="text"
                                  value={item.note || ''}
                                  onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                                  disabled={!isEditable}
                                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                  placeholder="Opsional..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden lg:block overflow-x-auto bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                    <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barang</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Stok Sistem</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-32">Stok Fisik</th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-24">Selisih</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-48">Alasan</th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-64">Catatan</th>
                    {isEditable && <th className="px-4 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredItems.map((item) => {
                      const isValid = item.difference === 0 || item.reason;
                      return (
                        <tr key={item.id} className={`${!isValid ? 'bg-danger-50/50 dark:bg-danger-900/10' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors`}>
                          <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.inventory?.nama_barang || item.inventory_id}</td>
                          <td className="px-4 py-3 text-right text-sm text-neutral-600 dark:text-neutral-300 font-mono">{item.system_stock}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                           <input
                             type="number"
                             value={item.physical_stock}
                             onChange={(e) => updateItem(item.id, 'physical_stock', parseInt(e.target.value) || 0)}
                             disabled={!isEditable}
                             className="w-full text-right bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1.5 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono font-medium shadow-sm"
                           />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-medium ${item.difference > 0 ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : item.difference < 0 ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400' : 'text-neutral-500'}`}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                            <select
                              value={item.reason || ''}
                              onChange={(e) => updateItem(item.id, 'reason', e.target.value || null)}
                              disabled={!isEditable || item.difference === 0}
                              className={`w-full bg-white dark:bg-neutral-800 border rounded-md px-2 py-1.5 text-sm shadow-sm disabled:opacity-50 disabled:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 ${!isValid ? 'border-danger-400' : 'border-neutral-300 dark:border-neutral-700'}`}
                            >
                              <option value="">Pilih Alasan</option>
                              {reasonOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                             <input
                               type="text"
                               value={item.note || ''}
                               onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                               disabled={!isEditable}
                               className="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1.5 text-sm shadow-sm disabled:opacity-50 disabled:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                               placeholder="Catatan"
                             />
                          </td>
                          {isEditable && (
                            <td className="px-4 py-3 text-right text-sm">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 text-danger-500 hover:bg-danger-100 dark:hover:bg-danger-900/30 rounded-md transition-colors"
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

        <div className="grid grid-cols-3 gap-3 lg:gap-4 pb-20 lg:pb-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-3 lg:p-5 shadow-elevated text-center lg:text-left flex flex-col justify-center">
            <div className="text-[10px] lg:text-sm text-neutral-500 dark:text-neutral-400 font-medium">Total Item</div>
            <div className="text-lg lg:text-2xl font-bold mt-0.5 lg:mt-1 text-neutral-900 dark:text-white">{items.length}</div>
          </div>
          <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-3 lg:p-5 shadow-elevated text-center lg:text-left flex flex-col justify-center">
            <div className="text-[10px] lg:text-sm text-success-600 font-medium">Selisih Positif</div>
            <div className="text-lg lg:text-2xl font-bold mt-0.5 lg:mt-1 text-success-600">
              +{items.filter(i => i.difference > 0).reduce((sum, i) => sum + i.difference, 0)}
            </div>
          </div>
          <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 p-3 lg:p-5 shadow-elevated text-center lg:text-left flex flex-col justify-center">
            <div className="text-[10px] lg:text-sm text-danger-600 font-medium">Selisih Negatif</div>
            <div className="text-lg lg:text-2xl font-bold mt-0.5 lg:mt-1 text-danger-600">
              {items.filter(i => i.difference < 0).reduce((sum, i) => sum + i.difference, 0)}
            </div>
          </div>
        </div>

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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
              <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Tolak Stock Opname</h3>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-4 h-24 resize-none"
                  placeholder="Masukkan alasan penolakan..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!rejectNote.trim() || saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
