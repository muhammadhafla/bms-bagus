'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { returnApi, AvailableReturnItem } from '@/lib/api/return';
import { supplierApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IconArrowBack, IconSearch, IconFileExport, IconX, IconDeviceFloppy, IconCheck, IconMinus, IconPlus, IconChevronDown, IconRefresh } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button, AmbientLayout } from '@/components/ui';
import { SelectInput } from '@/components/ui/SelectInput';
import { Portal } from '@/components/ui/Portal';

const downloadPdf = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default function ReturnPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<import('@/types').Supplier | null>(null);
  const [suppliers, setSuppliers] = useState<import('@/types').Supplier[]>([]);
  const [items, setItems] = useState<AvailableReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [lastReturnId, setLastReturnId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    tanggal: string; 
    supplier_nama: string;
    items: {
      pembelian_item_id: string;
      inventory_id: string;
      nama_barang: string;
      nomor_nota: string;
      tanggal_pembelian: string;
      return_qty: number;
      harga_beli: number;
      diskon?: number;
      harga_final: number;
    }[];
    total: number; 
    note: string
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSuppliers = async () => {
      const result = await supplierApi.getAll();
      if (!result.error) {
        setSuppliers((result.data as import('@/types').Supplier[]) || []);
      }
    };
    loadSuppliers();
  }, []);

  const handleSelectSupplier = useCallback(async (supplier: import('@/types').Supplier) => {
    setSelectedSupplier(supplier);
    setIsSupplierDropdownOpen(false);
    setLoading(true);
    setError(null);

    try {
      const result = await returnApi.getAvailableItemsBySupplier(supplier.id);
      
      if (result.error) {
        setError('Gagal memuat item');
        return;
      }

      const itemsWithSelection: AvailableReturnItem[] = (result.data || []).map(item => ({
        ...item,
        selected: false,
        return_qty: 0
      }));

      setItems(itemsWithSelection);
    } catch (err) {
      console.error('Error loading items:', err);
      setError('Terjadi kesalahan saat memuat data barang.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleItem = useCallback((index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const isCurrentlySelected = newItems[index].selected;
      newItems[index] = { 
        ...newItems[index], 
        selected: !isCurrentlySelected,
        return_qty: !isCurrentlySelected ? newItems[index].qty_remaining : 0
      };
      return newItems;
    });
  }, []);

  const handleReturnQtyChange = useCallback((index: number, qty: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];
      const validQty = Math.max(0, Math.min(qty, item.qty_remaining));
      newItems[index] = { 
        ...item, 
        return_qty: validQty,
        selected: validQty > 0
      };
      return newItems;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelectedSupplier(null);
    setItems([]);
    setError(null);
    setSuccess(null);
    setNote('');
    setLastReturnId(null);
    setIsSupplierDropdownOpen(false);
  }, []);


  const selectedItems = items.filter(item => item.selected && (item.return_qty || 0) > 0);
  
  const totalReturn = selectedItems.reduce((sum, item) => {
    return sum + (item.return_qty || 0) * (item.harga_beli - (item.diskon || 0));
  }, 0);

  const handleSubmit = useCallback(async () => {
    if (!selectedSupplier) return;

    const returnItems = selectedItems.map(item => ({
      ...item,
      qty: item.return_qty || 0,
    }));

    if (returnItems.length === 0) {
      setError('Tidak ada item yang dipilih untuk dikembalikan');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const previewDataToShow = {
      tanggal: today,
      supplier_nama: selectedSupplier.nama,
      items: returnItems.map(item => ({
        pembelian_item_id: item.pembelian_item_id,
        inventory_id: item.inventory_id,
        nama_barang: item.nama_barang,
        nomor_nota: item.nomor_nota || '-',
        tanggal_pembelian: item.tanggal_pembelian || '-',
        return_qty: item.return_qty ?? 0,
        harga_beli: item.harga_beli,
        diskon: item.diskon,
        harga_final: (item.return_qty ?? 0) * (item.harga_beli - (item.diskon ?? 0))
      })),
      total: totalReturn,
      note: note,
    };
    setPreviewData(previewDataToShow);
    setShowPreview(true);
  }, [selectedSupplier, selectedItems, totalReturn, note]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!selectedSupplier || !previewData) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await returnApi.submitBatchReturn({
        supplier_id: selectedSupplier.id,
        supplier_nama: selectedSupplier.nama,
        tanggal: previewData.tanggal,
        note: note,
        items: previewData.items.map(item => ({
          pembelian_item_id: item.pembelian_item_id,
          inventory_id: item.inventory_id,
          qty: item.return_qty,
        })),
      });

      if (result.error) {
        setError(result.error.message || 'Gagal menyimpan return');
      } else {
        setSuccess(`Retur berhasil disimpan. Total: ${formatCurrency(totalReturn)}`);
        setLastReturnId(result.data);
        setShowPreview(false);
        setPreviewData(null);
        setTimeout(() => {
          handleReset();
        }, 3000);
      }
    } catch (err: unknown) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSupplier, previewData, totalReturn, note, handleReset]);

  const handleExportPdf = useCallback(async () => {
    if (!lastReturnId) return;
    
    try {
      const result = await returnApi.getReturnDetail(lastReturnId);
      if (result.error || !result.data) {
        setError('Gagal mengambil data return');
        return;
      }

      const returnData = {
        id: result.data.id,
        tanggal: result.data.tanggal,
        supplier_nama: result.data.supplier_nama || selectedSupplier?.nama || '',
        note: result.data.note,
        items: result.data.items?.map((item: { nama_barang: string; nomor_nota: string; tanggal_pembelian: string; qty: number; harga_beli: number; diskon: number; subtotal: number }) => ({
          nama_barang: item.nama_barang,
          nomor_nota: item.nomor_nota || '-',
          tanggal_pembelian: item.tanggal_pembelian || '-',
          qty: item.qty,
          harga_beli: item.harga_beli,
          diskon: item.diskon || 0,
          harga_final: item.subtotal
        })) || [],
        total: result.data.total || 0
      };

      const { generateReturnPdf } = await import('@/lib/pdf-utils');
      const pdfBuffer = await generateReturnPdf(returnData);
      const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
      downloadPdf(blob, `return-${lastReturnId.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      setError('Gagal export PDF');
    }
  }, [lastReturnId, selectedSupplier]);

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] pb-24 lg:pb-0">
        
        {/* Header Section */}
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up transition-all duration-300">
          <div className="flex flex-col gap-2 lg:gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center gap-3 lg:gap-4 pl-12 lg:pl-0">
              <IconArrowBack className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0 cursor-pointer hover:text-brand-600 transition-colors" stroke={1.5} onClick={() => window.history.back()} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400 dark:from-brand-400 dark:to-brand-200 tracking-tight">Retur Barang</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">Pengembalian barang ke supplier</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-300 rounded-xl text-sm border border-danger-100 dark:border-danger-800/50 flex items-center gap-2">
              <IconX className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-300 rounded-xl text-sm border border-success-100 dark:border-success-800/50 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2">
                <IconCheck className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
              {lastReturnId && (
                <Button variant="secondary" size="sm" onClick={handleExportPdf} className="h-8 rounded-lg text-xs">
                  <IconFileExport className="w-3.5 h-3.5" />
                  Export PDF
                </Button>
              )}
            </div>
          )}

          {/* Supplier Selection Panel */}
          <div className="relative z-20">
            <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/50 dark:border-neutral-800 rounded-2xl p-4 lg:p-6 shadow-elevated transition-all">
              <h2 className="text-sm lg:text-base font-bold mb-3 text-neutral-800 dark:text-neutral-200">Pilih Supplier</h2>
              {suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                  <IconSearch className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada supplier terdaftar</p>
                </div>
              ) : (
                <div className="max-w-xl">
                  <SelectInput
                    value={selectedSupplier?.id || ""}
                    onChange={(val) => {
                      const supplier = suppliers.find(s => s.id === val);
                      if (supplier) handleSelectSupplier(supplier);
                    }}
                    options={suppliers.map(s => ({ value: s.id, label: s.nama }))}
                    placeholder="Pilih Supplier..."
                    inputSize="lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Section (Items List) */}
        {selectedSupplier && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-24 lg:mb-6 animate-fade-in-up transition-all delay-100">
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              
              <div className="mb-5 lg:mb-6">
                <label className="block text-xs lg:text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Catatan Retur (Opsional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tambahkan alasan retur..."
                  className="w-full px-4 py-3 text-sm bg-white/80 dark:bg-neutral-950/80 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all placeholder:text-neutral-400 resize-none"
                  rows={2}
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center text-neutral-500 py-12 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="font-medium text-sm lg:text-base">Tidak ada barang yang tersedia untuk diretur.</p>
                  <p className="text-xs lg:text-sm mt-1 opacity-75">Hanya menampilkan barang yang sudah dibeli dari supplier ini dan masih memiliki stok.</p>
                </div>
              ) : (
                <div className="rounded-2xl lg:border lg:border-neutral-200/60 dark:lg:border-neutral-800/60 lg:overflow-hidden lg:bg-white/40 dark:lg:bg-neutral-950/40">
                  
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-16">Pilih</th>
                          <th className="px-5 py-4 text-left text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Barang & Info</th>
                          <th className="px-5 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Harga Satuan</th>
                          <th className="px-5 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Sisa Qty</th>
                          <th className="px-5 py-4 text-center text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-36">Retur Qty</th>
                          <th className="px-5 py-4 text-right text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                        {items.map((item, index) => {
                          const harga = item.harga_beli - (item.diskon || 0);
                          const returnSubtotal = (item.return_qty || 0) * harga;

                          return (
                            <tr 
                              key={item.pembelian_item_id} 
                              className={`group transition-all duration-200 ${item.selected ? 'bg-brand-50/50 dark:bg-brand-900/10' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'}`}
                            >
                              <td className="px-5 py-4">
                                <label className="relative flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleToggleItem(index)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 rounded-md peer-checked:bg-brand-500 peer-checked:border-brand-500 transition-all flex items-center justify-center shadow-sm">
                                    <IconCheck className={`w-4 h-4 text-white transition-transform ${item.selected ? 'scale-100' : 'scale-0'}`} stroke={3} />
                                  </div>
                                </label>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{item.nama_barang}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">{item.nomor_nota || item.pembelian_id.slice(0, 8)}</span>
                                  <span className="text-xs text-neutral-500">{item.tanggal_pembelian}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right text-sm text-neutral-700 dark:text-neutral-300 font-medium">{formatCurrency(harga)}</td>
                              <td className="px-5 py-4 text-right">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-neutral-700">
                                  {item.qty_remaining}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-center">
                                  <div className={`flex items-center p-1 rounded-lg border transition-colors ${item.selected ? 'border-brand-200 dark:border-brand-800 bg-white dark:bg-neutral-950 shadow-sm' : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 opacity-60'}`}>
                                    <button 
                                      onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) - 1)}
                                      disabled={!item.selected || (item.return_qty || 0) <= 0}
                                      className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-md disabled:opacity-30 transition-colors"
                                    >
                                      <IconMinus className="w-4 h-4" />
                                    </button>
                                    <PriceInput
                                      value={item.return_qty || 0}
                                      onChange={(val) => handleReturnQtyChange(index, val)}
                                      disabled={!item.selected}
                                      className="w-12 text-center text-sm font-bold bg-transparent border-none p-0 mx-1 focus:ring-0"
                                      min={0}
                                      max={item.qty_remaining}
                                      prefix=""
                                    />
                                    <button 
                                      onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) + 1)}
                                      disabled={!item.selected || (item.return_qty || 0) >= item.qty_remaining}
                                      className="w-7 h-7 flex items-center justify-center text-neutral-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-md disabled:opacity-30 transition-colors"
                                    >
                                      <IconPlus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-bold text-brand-600 dark:text-brand-400">
                                {formatCurrency(returnSubtotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact List View */}
                  <div className="block lg:hidden space-y-3 pb-4">
                    {items.map((item, index) => {
                      const harga = item.harga_beli - (item.diskon || 0);
                      const returnSubtotal = (item.return_qty || 0) * harga;

                      return (
                        <div key={item.pembelian_item_id} className={`relative bg-white/90 dark:bg-neutral-900/90 rounded-2xl p-4 shadow-sm border transition-all duration-200 ${item.selected ? 'border-brand-400 ring-1 ring-brand-400/50 bg-brand-50/20 dark:bg-brand-900/10' : 'border-neutral-200/70 dark:border-neutral-800/70'}`}>
                          <div className="flex gap-3">
                            <label className="relative flex items-start pt-1 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(index)}
                                className="sr-only peer"
                              />
                              <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 rounded-md peer-checked:bg-brand-500 peer-checked:border-brand-500 flex items-center justify-center transition-all">
                                <IconCheck className={`w-3.5 h-3.5 text-white transition-transform ${item.selected ? 'scale-100' : 'scale-0'}`} stroke={3} />
                              </div>
                            </label>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-0.5 leading-tight">{item.nama_barang}</h3>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 border border-neutral-200 dark:border-neutral-700">{item.nomor_nota || item.pembelian_id.slice(0, 8)}</span>
                                <span className="text-[10px] text-neutral-500">{item.tanggal_pembelian}</span>
                              </div>
                              
                              <div className="flex justify-between items-end mt-3">
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-medium mb-0.5">HARGA SATUAN</p>
                                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{formatCurrency(harga)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-neutral-500 font-medium mb-0.5">SISA QTY</p>
                                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{item.qty_remaining}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Stepper & Subtotal */}
                          <div className={`mt-4 pt-3 border-t transition-colors ${item.selected ? 'border-brand-100 dark:border-brand-900/30' : 'border-neutral-100 dark:border-neutral-800/50'} flex justify-between items-center`}>
                            <div className={`flex items-center h-8 rounded-full border transition-all ${item.selected ? 'border-brand-200 dark:border-brand-800 bg-white dark:bg-neutral-950 shadow-sm' : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 opacity-50'}`}>
                              <button 
                                onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) - 1)}
                                disabled={!item.selected || (item.return_qty || 0) <= 0}
                                className="w-8 h-8 flex items-center justify-center text-neutral-500 disabled:opacity-30"
                              >
                                <IconMinus className="w-3.5 h-3.5" />
                              </button>
                              <PriceInput
                                value={item.return_qty || 0}
                                onChange={(val) => handleReturnQtyChange(index, val)}
                                disabled={!item.selected}
                                className="w-10 text-center text-sm font-bold bg-transparent border-none p-0 focus:ring-0 h-full"
                                min={0}
                                max={item.qty_remaining}
                                prefix=""
                              />
                              <button 
                                onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) + 1)}
                                disabled={!item.selected || (item.return_qty || 0) >= item.qty_remaining}
                                className="w-8 h-8 flex items-center justify-center text-neutral-500 disabled:opacity-30"
                              >
                                <IconPlus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-[10px] font-medium text-neutral-400 mb-0.5">SUBTOTAL</p>
                              <p className={`text-sm font-bold ${item.selected && returnSubtotal > 0 ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400 dark:text-neutral-600'}`}>
                                {formatCurrency(returnSubtotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Action Bar (Footer) */}
        {selectedSupplier && items.length > 0 && (
          <div className="fixed lg:sticky bottom-4 lg:bottom-0 left-0 right-0 z-40 px-4 lg:px-0 pointer-events-none">
            <div className="max-w-[1920px] mx-auto pointer-events-auto">
              <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/40 dark:border-neutral-800 rounded-3xl lg:rounded-t-3xl lg:rounded-b-none p-4 lg:p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)] animate-fade-in-up">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-3 lg:gap-6">
                    <div className="hidden lg:flex flex-col">
                      <span className="text-xs font-medium text-neutral-500">Item Terpilih</span>
                      <span className="text-lg font-bold text-neutral-900 dark:text-white">{selectedItems.length}</span>
                    </div>
                    <div className="h-10 w-px bg-neutral-200 dark:bg-neutral-800 hidden lg:block"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] lg:text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Retur</span>
                      <span className="text-base lg:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400 dark:from-brand-400 dark:to-brand-200 truncate">{formatCurrency(totalReturn)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      disabled={submitting}
                      className="px-4 lg:px-6 h-12 lg:h-14 rounded-2xl lg:rounded-xl text-neutral-600 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-transparent flex items-center justify-center"
                    >
                      <IconRefresh className="w-5 h-5 lg:mr-2" />
                      <span className="hidden lg:inline font-bold text-sm lg:text-base">Reset</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={submitting || totalReturn === 0}
                      className="px-4 lg:px-8 h-12 lg:h-14 rounded-2xl lg:rounded-xl shadow-brand-500/20 shadow-lg group relative overflow-hidden flex items-center justify-center"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                      <IconDeviceFloppy className="w-5 h-5 lg:mr-2" />
                      <span className="hidden lg:inline font-bold text-sm lg:text-base">{submitting ? 'Menyimpan...' : 'Simpan Retur'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Preview Modal */}
        {showPreview && previewData && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-4 animate-fade-in">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowPreview(false)} />
              
              <div className="relative bg-white dark:bg-neutral-900 rounded-t-3xl lg:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] lg:max-h-[85vh] flex flex-col transform transition-transform animate-slide-up lg:animate-zoom-in border border-white/20 dark:border-neutral-800">
                <div className="flex-shrink-0 p-5 lg:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50 rounded-t-3xl">
                  <div>
                    <h2 className="text-lg lg:text-xl font-bold text-neutral-900 dark:text-white">Konfirmasi Retur</h2>
                    <p className="text-xs lg:text-sm text-neutral-500 mt-0.5">Periksa kembali detail retur sebelum menyimpan</p>
                  </div>
                  <button onClick={() => setShowPreview(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200/50 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 transition-colors">
                    <IconX className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-5 lg:p-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-900/30">
                    <div>
                      <p className="text-[10px] lg:text-xs font-semibold text-neutral-500 uppercase mb-1">Supplier</p>
                      <p className="text-sm lg:text-base font-bold text-neutral-900 dark:text-white">{previewData.supplier_nama}</p>
                    </div>
                    <div>
                      <p className="text-[10px] lg:text-xs font-semibold text-neutral-500 uppercase mb-1">Tanggal</p>
                      <p className="text-sm lg:text-base font-bold text-neutral-900 dark:text-white">{previewData.tanggal}</p>
                    </div>
                    {previewData.note && (
                      <div className="col-span-2 mt-2 pt-3 border-t border-brand-200/50 dark:border-brand-800/50">
                        <p className="text-[10px] lg:text-xs font-semibold text-neutral-500 uppercase mb-1">Catatan</p>
                        <p className="text-xs lg:text-sm text-neutral-800 dark:text-neutral-300 italic">&quot;{previewData.note}&quot;</p>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-3 px-1">Daftar Barang ({previewData.items.length})</h3>
                  
                  <div className="space-y-3">
                    {previewData.items.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-neutral-900 rounded-xl p-3 lg:p-4 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-neutral-900 dark:text-white truncate">{item.nama_barang}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-500 border border-neutral-200 dark:border-neutral-700">{item.nomor_nota}</span>
                            <span className="text-xs text-neutral-500">{formatCurrency(item.harga_beli - (item.diskon || 0))} / item</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                          <div className="text-center">
                            <span className="text-[10px] text-neutral-400 block sm:hidden mb-0.5">QTY</span>
                            <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md">
                              {item.return_qty}x
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block sm:hidden mb-0.5">SUBTOTAL</span>
                            <span className="font-bold text-sm text-brand-600 dark:text-brand-400">{formatCurrency(item.harga_final)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0 p-5 lg:p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md rounded-b-3xl">
                  <div className="flex justify-between items-center mb-5 lg:mb-6 px-1">
                    <span className="text-sm lg:text-base font-semibold text-neutral-600 dark:text-neutral-400">Total Pengembalian</span>
                    <span className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">{formatCurrency(previewData.total)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setShowPreview(false)} className="flex-1 lg:flex-none h-12 lg:h-14 rounded-xl text-sm font-semibold">
                      Batal
                    </Button>
                    <Button
                      onClick={handleConfirmSubmit}
                      disabled={submitting}
                      variant="primary"
                      className="flex-1 h-12 lg:h-14 rounded-xl text-sm font-bold shadow-brand-500/25 shadow-lg group relative overflow-hidden"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                      <IconCheck className="w-5 h-5 mr-2" />
                      {submitting ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </AmbientLayout>
  );
}
