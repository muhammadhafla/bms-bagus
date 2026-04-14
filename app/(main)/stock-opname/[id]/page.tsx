'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import { StockOpname, StockOpnameItem, stockOpnameApi } from '@/lib/api/stockOpname';
import { stockAdjustmentApi } from '@/lib/api/stockAdjustment';
import { inventoryApi } from '@/lib/api';
import { IconArrowLeft, IconCheck, IconX, IconSend, IconLoader2, IconDeviceFloppy, IconRefresh, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
    }
    if (!itemsResult.error && itemsResult.data) {
      setItems(itemsResult.data);
      setOriginalItems(JSON.parse(JSON.stringify(itemsResult.data)));
      setHasChanges(false);
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

    const result = await inventoryApi.search(query);
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
      alert(result.error.message);
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
      alert(result.error.message);
    } else {
      setShowRejectModal(false);
      fetchData();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Header title="Stock Opname" />
        <div className="text-center py-12 text-neutral-500">Loading...</div>
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header title="Stock Opname Detail" />
      

      
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/stock-opname')}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <IconArrowLeft size={18} />
            Kembali
          </button>

          <div className="flex gap-2">
            {isDraft && hasChanges && (
              <>
                <button
                  onClick={() => setShowConfirmDiscard(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <IconRefresh size={18} />
                  Batal
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving || hasInvalidItems}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <IconLoader2 size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </>
            )}
            {isDraft && !hasChanges && (
              <button
                onClick={handleSubmit}
                disabled={saving || hasInvalidItems}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <IconSend size={18} />
                {saving ? 'Mengirim...' : 'Submit untuk Approval'}
              </button>
            )}
            {isPending && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <IconX size={18} />
                  Tolak
                </button>
                <button
                  onClick={handleApprove}
                  disabled={saving || processing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {processing ? <IconLoader2 size={18} className="animate-spin" /> : <IconCheck size={18} />}
                  {processing ? 'Memproses...' : 'Approve'}
                </button>
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
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showAddDropdown && inventorySearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-64 overflow-auto">
                  {inventorySearchResults.map((inventory) => (
                    <button
                      key={inventory.id}
                      onClick={() => addItemToOpname(inventory)}
                      className="w-full px-4 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div className="font-medium">{inventory.nama_barang}</div>
                      <div className="text-xs text-neutral-500">{inventory.kode_barcode} | Stok: {inventory.stok}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {items.length > 10 && (
              <div className="relative flex-1 max-w-md">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <IconSearch size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Cari di dalam daftar..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

         <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-6">
           <div className="overflow-x-auto">
             {items.length === 0 ? (
               <div className="text-center py-12">
                 <div className="text-neutral-500 mb-2">Belum ada barang yang ditambahkan</div>
                 <div className="text-sm text-neutral-400">Gunakan kotak pencarian di atas untuk menambahkan barang yang akan dihitung</div>
               </div>
             ) : (
             <table className="w-full">
               <thead>
                 <tr className="border-b border-neutral-200 dark:border-neutral-800">
                   <th className="text-left p-3 font-medium">Barang</th>
                   <th className="text-right p-3 font-medium">Stok Sistem</th>
                   <th className="text-right p-3 font-medium">Stok Fisik</th>
                   <th className="text-right p-3 font-medium">Selisih</th>
                   <th className="text-left p-3 font-medium">Alasan</th>
                   <th className="text-left p-3 font-medium">Catatan</th>
                   {isEditable && <th className="text-right p-3 font-medium w-10"></th>}
                 </tr>
               </thead>
               <tbody>
                 {filteredItems.map((item) => {
                     const isValid = item.difference === 0 || item.reason;
                     return (
                       <tr key={item.id} className={`border-b border-neutral-100 dark:border-neutral-800/50 ${!isValid ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                         <td className="p-3">{item.inventory?.nama_barang || item.inventory_id}</td>
                         <td className="p-3 text-right font-mono">{item.system_stock}</td>
                         <td className="p-3">
                           <input
                             type="number"
                             value={item.physical_stock}
                             onChange={(e) => updateItem(item.id, 'physical_stock', parseInt(e.target.value) || 0)}
                             disabled={!isEditable}
                             className="w-20 text-right bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                           />
                         </td>
                         <td className={`p-3 text-right font-mono font-medium ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-neutral-600'}`}>
                           {item.difference > 0 ? '+' : ''}{item.difference}
                         </td>
                         <td className="p-3">
                           <select
                             value={item.reason || ''}
                             onChange={(e) => updateItem(item.id, 'reason', e.target.value || null)}
                             disabled={!isEditable || item.difference === 0}
                             className={`w-32 bg-transparent border rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isValid ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'}`}
                           >
                             <option value="">Pilih Alasan</option>
                             {reasonOptions.map(opt => (
                               <option key={opt.value} value={opt.value}>{opt.label}</option>
                             ))}
                           </select>
                         </td>
                         <td className="p-3">
                           <input
                             type="text"
                             value={item.note || ''}
                             onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                             disabled={!isEditable}
                             className="w-full bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Catatan"
                           />
                         </td>
                         {isEditable && (
                           <td className="p-3 text-right">
                             <button
                               onClick={() => removeItem(item.id)}
                               className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
            <div className="text-sm text-green-600">Selisih Positif</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              +{items.filter(i => i.difference > 0).reduce((sum, i) => sum + i.difference, 0)}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="text-sm text-red-600">Selisih Negatif</div>
            <div className="text-2xl font-bold mt-1 text-red-600">
              {items.filter(i => i.difference < 0).reduce((sum, i) => sum + i.difference, 0)}
            </div>
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
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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
