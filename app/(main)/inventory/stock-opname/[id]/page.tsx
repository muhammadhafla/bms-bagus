'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StockOpname, StockOpnameItem, stockOpnameApi } from '@/lib/api/stockOpname';
import { stockAdjustmentApi } from '@/lib/api/stockAdjustment';
import { inventoryApi } from '@/lib/api';
import { IconArrowLeft, IconCheck, IconX, IconSend, IconLoader2, IconDeviceFloppy, IconRefresh, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import SelectInput from '@/components/ui/SelectInput';
import TextareaInput from '@/components/ui/TextareaInput';
import { Button, Breadcrumb, Badge, Card } from '@/components/ui';

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
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchAdd, setSearchAdd] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [inventorySearchResults, setInventorySearchResults] = useState<any[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
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

    try {
      for (const item of changedItems) {
      await stockOpnameApi.updateItem(item.id, {
        physical_stock: item.physical_stock,
        reason: item.reason || undefined,
        note: item.note || undefined
      });
      }

      setOriginalItems(JSON.parse(JSON.stringify(items)));
      setHasChanges(false);
      addToast({ type: 'success', message: 'Perubahan berhasil disimpan' });
    } catch (error) {
      addToast({ type: 'error', message: 'Gagal menyimpan perubahan' });
    }
    
    setSaving(false);
  };

  const discardChanges = () => {
    setItems(JSON.parse(JSON.stringify(originalItems)));
    setHasChanges(false);
    setShowConfirmDiscard(false);
    addToast({ type: 'info', message: 'Perubahan dibatalkan' });
  };

  const searchInventory = useCallback(async (query: string) => {
    if (query.length < 2) {
      setInventorySearchResults([]);
      setShowAddDropdown(false);
      return;
    }

    // Gunakan fuzzy search sama seperti di halaman pembelian
    const result = await inventoryApi.fuzzySearch(query);
    if (!result.error && result.data) {
      const existingIds = items.map(i => i.inventory_id);
      const filtered = result.data.filter((i: any) => !existingIds.includes(i.id));
      setInventorySearchResults(filtered);
      setShowAddDropdown(filtered.length > 0);
    }
  }, [items]);

  const addItemToOpname = async (inventory: any) => {
    const result = await stockOpnameApi.addItem(opnameId, inventory.id);
    if (!result.error && result.data) {
      setItems(prev => [...prev, result.data]);
      setOriginalItems(prev => [...prev, result.data]);
      setSearchAdd('');
      setInventorySearchResults([]);
      setShowAddDropdown(false);
      addToast({ type: 'success', message: `${inventory.nama_barang} ditambahkan` });
      
      // Auto focus kembali ke input untuk scan berikutnya
      setTimeout(() => addSearchRef.current?.focus(), 0);
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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center py-12 text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!opname) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
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
      </div>
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <Breadcrumb
        items={[
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stock Opname', href: '/inventory/stock-opname' },
          { label: opname?.opname_date ? new Date(opname.opname_date).toLocaleDateString('id-ID') : 'Detail', isActive: true },
        ]}
        className="mb-4"
      />
      
      <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => router.push('/inventory/stock-opname')}>
            <IconArrowLeft size={18} />
            Kembali
          </Button>

          <div className="flex gap-2">
            {isDraft && (
              <>
                {hasChanges && (
                  <Button variant="ghost" onClick={() => setShowConfirmDiscard(true)} disabled={saving}>
                    <IconRefresh size={18} />
                    Batal
                  </Button>
                )}
                {hasChanges && (
                  <Button onClick={saveChanges} disabled={saving || hasInvalidItems}>
                    {saving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={saving || hasInvalidItems}
                  className={hasInvalidItems ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <IconSend size={18} />
                  {saving ? 'Mengirim...' : 'Submit untuk Approval'}
                </Button>
              </>
            )}
            {isPending && (
              <>
                <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={saving}>
                  <IconX size={18} />
                  Tolak
                </Button>
                <Button variant="primary" onClick={handleApprove} disabled={saving || processing}>
                  {processing ? <IconLoader2 size={18} className="animate-spin" /> : <IconCheck size={18} />}
                  {processing ? 'Memproses...' : 'Approve'}
                </Button>
              </>
            )}
          </div>
        </div>

        {isDraft && (
          <div className="flex gap-4 mb-4">
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
                  searchInventory(e.target.value);
                }}
                onFocus={() => searchAdd.length >= 2 && searchInventory(searchAdd)}
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

          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="text-neutral-500 mb-2">Belum ada barang yang ditambahkan</div>
                  <div className="text-sm text-neutral-400">Gunakan kotak pencarian di atas untuk menambahkan barang yang akan dihitung</div>
                </div>
              ) : (
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Barang</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Stok Sistem</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Stok Fisik</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Selisih</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Alasan</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Catatan</th>
                    {isEditable && <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredItems.map((item) => {
                      const isValid = item.difference === 0 || item.reason;
                      return (
                        <tr key={item.id} className={`${!isValid ? 'bg-danger-50 dark:bg-danger-900/10' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors`}>
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">{item.inventory?.nama_barang || item.inventory_id}</td>
                          <td className="px-4 py-3 text-right text-sm text-neutral-900 dark:text-neutral-100 font-mono">{item.system_stock}</td>
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                           <input
                             type="number"
                             value={item.physical_stock}
                             onChange={(e) => updateItem(item.id, 'physical_stock', parseInt(e.target.value) || 0)}
                             disabled={!isEditable}
                             className="w-20 text-right bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                           />
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-mono font-medium ${item.difference > 0 ? 'text-success-600' : item.difference < 0 ? 'text-danger-600' : 'text-neutral-600'}`}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
                            <select
                              value={item.reason || ''}
                              onChange={(e) => updateItem(item.id, 'reason', e.target.value || null)}
                              disabled={!isEditable || item.difference === 0}
                              className={`w-32 bg-transparent border rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 ${!isValid ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'}`}
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
                               className="w-full bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
                               placeholder="Catatan"
                             />
                          </td>
                          {isEditable && (
                            <td className="px-4 py-3 text-right text-sm text-neutral-900 dark:text-neutral-100">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded transition-colors"
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
              )}
            </div>
          </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Total Item</div>
            <div className="text-2xl font-bold mt-1">{items.length}</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-sm text-success-600">Selisih Positif</div>
            <div className="text-2xl font-bold mt-1 text-success-600">
              +{items.filter(i => i.difference > 0).reduce((sum, i) => sum + i.difference, 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-sm text-danger-600">Selisih Negatif</div>
            <div className="text-2xl font-bold mt-1 text-danger-600">
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
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                 disabled={saving}
                 className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 disabled:opacity-50"
               >
                 Konfirmasi Tolak
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}
