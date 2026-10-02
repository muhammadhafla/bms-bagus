'use client';
import { format } from 'date-fns';
import { useState, useCallback, useEffect, useRef } from 'react';
import { returnApi, AvailableReturnItem } from '@/lib/api/return';
import { formatCurrency } from '@/lib/utils';
import {
  IconArrowBack,
  IconSearch,
  IconFileExport,
  IconX,
  IconDeviceFloppy,
  IconCheck,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconBarcode
} from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button, AmbientLayout } from '@/components/ui';
import { SelectInput } from '@/components/ui/SelectInput';
import { Portal } from '@/components/ui/Portal';
import { downloadOrShareFile } from '@/lib/utils/file-share';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useSuppliers } from '@/lib/hooks/useSuppliers';

export default function ReturnPage() {
  const queryClient = useQueryClient();
  const [selectedSupplier, setSelectedSupplier] = useState<import('@/types').Supplier | null>(null);
  const { data: suppliers = [] } = useSuppliers();
  const [items, setItems] = useState<AvailableReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [lastReturnId, setLastReturnId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Pos / Scan State
  const [scanQuery, setScanQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<{ supplier_id: string; supplier_nama: string; total_qty_remaining: number }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSelectSupplierAndAutoAdd = useCallback(async (supplier: import('@/types').Supplier, initialScan?: string) => {
    setSelectedSupplier(supplier);
    setLoading(true);
    setError(null);

    try {
      const result = await returnApi.getAvailableItemsBySupplier(supplier.id);

      if (result.error) {
        setError('Gagal memuat item');
        return;
      }

      const rawItems = result.data || [];
      let foundIndex = -1;
      
      const itemsWithSelection: AvailableReturnItem[] = rawItems.map((item, idx) => {
        let isMatch = false;
        if (initialScan) {
           const queryLower = initialScan.toLowerCase();
           if (item.barcode?.toLowerCase() === queryLower || item.nama_barang.toLowerCase().includes(queryLower)) {
             isMatch = true;
             if (foundIndex === -1) foundIndex = idx;
           }
        }
        return {
          ...item,
          selected: isMatch,
          return_qty: isMatch ? 1 : 0,
        };
      });

      setItems(itemsWithSelection);
      if (initialScan && foundIndex >= 0) {
        setSuccess(`Supplier otomatis di-set ke ${supplier.nama} dan barang ditambahkan.`);
      } else if (initialScan) {
         setError(`Supplier di-set ke ${supplier.nama}, tapi barang gagal otomatis ditambah (mungkin stok retur habis).`);
      }
    } catch (err) {
      console.error('Error loading items:', err);
      setError('Terjadi kesalahan saat memuat data barang.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectSupplier = useCallback(async (supplier: import('@/types').Supplier) => {
    handleSelectSupplierAndAutoAdd(supplier);
  }, [handleSelectSupplierAndAutoAdd]);

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanQuery.trim()) return;

    setIsScanning(true);
    setError(null);
    setShowDropdown(false);
    
    try {
      if (selectedSupplier) {
        // Supplier already selected, search exactly within items memory
        const queryLower = scanQuery.toLowerCase().trim();
        const itemIndex = items.findIndex(
          (i) => i.barcode?.toLowerCase() === queryLower || i.nama_barang.toLowerCase() === queryLower
        );

        if (itemIndex >= 0) {
          const item = items[itemIndex];
          if (item.qty_remaining > 0 && (item.return_qty || 0) < item.qty_remaining) {
            handleReturnQtyChange(itemIndex, (item.return_qty || 0) + 1);
            setSuccess(`Berhasil menambah ${item.nama_barang}`);
            setScanQuery('');
          } else {
            setError(`Stok retur untuk ${item.nama_barang} sudah maksimal/habis.`);
          }
        } else {
          setError(`Barang tidak ditemukan di supplier ini.`);
        }
      } else {
        // Global scan
        const res = await returnApi.findSuppliersByBarcode(scanQuery.trim());
        if (res.error) throw res.error;
        
        const sups = res.data || [];
        if (sups.length === 0) {
          setError('Barang tidak ditemukan atau tidak ada sisa stok retur untuk pencarian ini.');
        } else if (sups.length === 1) {
          // Auto select
          const sup = suppliers.find(s => s.id === sups[0].supplier_id);
          if (sup) {
            await handleSelectSupplierAndAutoAdd(sup as any, scanQuery.trim());
            setScanQuery('');
          }
        } else {
          // Multiple suppliers
          setSupplierOptions(sups);
          setSupplierModalOpen(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mencari barang');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDropdownSelect = (index: number) => {
    const item = items[index];
    if (item.qty_remaining > 0 && (item.return_qty || 0) < item.qty_remaining) {
      handleReturnQtyChange(index, (item.return_qty || 0) + 1);
      setSuccess(`Berhasil menambah ${item.nama_barang}`);
      setScanQuery('');
      setShowDropdown(false);
      searchInputRef.current?.focus();
    } else {
      setError(`Stok retur untuk ${item.nama_barang} sudah maksimal/habis.`);
    }
  };

  const handleReturnQtyChange = useCallback((index: number, qty: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = newItems[index];
      const validQty = Math.max(0, Math.min(qty, item.qty_remaining));
      newItems[index] = {
        ...item,
        return_qty: validQty,
        selected: validQty > 0,
      };
      return newItems;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    handleReturnQtyChange(index, 0);
  }, [handleReturnQtyChange]);

  const handleReset = useCallback(() => {
    setSelectedSupplier(null);
    setItems([]);
    setError(null);
    setSuccess(null);
    setNote('');
    setLastReturnId(null);
    setScanQuery('');
  }, []);

  const selectedItems = items.filter((item) => item.selected && (item.return_qty || 0) > 0);
  const totalReturn = selectedItems.reduce((sum, item) => sum + (item.return_qty || 0) * (item.harga_beli - (item.diskon || 0)), 0);

  const filteredDropdownItems = items
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => 
      scanQuery && 
      (item.nama_barang.toLowerCase().includes(scanQuery.toLowerCase()) || 
       item.barcode?.toLowerCase().includes(scanQuery.toLowerCase()))
    ).slice(0, 5);

  const handleSubmit = useCallback(async () => {
    if (!selectedSupplier) return;
    const returnItems = selectedItems.map((item) => ({
      ...item,
      qty: item.return_qty || 0,
    }));
    if (returnItems.length === 0) {
      setError('Tidak ada item yang dipilih untuk dikembalikan');
      return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    setPreviewData({
      tanggal: today,
      supplier_nama: selectedSupplier.nama,
      items: returnItems.map((item) => ({
        pembelian_item_id: item.pembelian_item_id,
        inventory_id: item.inventory_id,
        nama_barang: item.nama_barang,
        nomor_nota: item.nomor_nota || '-',
        tanggal_pembelian: item.tanggal_pembelian || '-',
        return_qty: item.return_qty ?? 0,
        harga_beli: item.harga_beli,
        diskon: item.diskon,
        harga_final: (item.return_qty ?? 0) * (item.harga_beli - (item.diskon ?? 0)),
      })),
      total: totalReturn,
      note: note,
    });
    setShowPreview(true);
  }, [selectedSupplier, selectedItems, totalReturn, note]);

  const [previewData, setPreviewData] = useState<any>(null);

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
        items: previewData.items.map((item: any) => ({
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
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.returPembelianAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions.pembelianAll });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        setTimeout(() => handleReset(), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSupplier, previewData, totalReturn, note, handleReset, queryClient]);

  const handleExportPdf = useCallback(async () => {
    if (!lastReturnId) return;
    try {
      await downloadOrShareFile(`/api/export/inventory/return/${lastReturnId}`, `Bukti_Retur_${lastReturnId}.pdf`, 'Bukti Retur');
    } catch (err) {
      setError('Gagal export PDF');
    }
  }, [lastReturnId]);

  return (
    <AmbientLayout>
      <div className="flex min-h-[calc(100vh-2rem)] flex-col pb-24 lg:h-[calc(100vh-2rem)] lg:pb-0">
        <div className="animate-fade-in-up mb-4 flex-shrink-0 transition-all duration-300 lg:mb-6">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <IconArrowBack
                className="text-brand-500 hover:text-brand-600 h-6 w-6 shrink-0 cursor-pointer transition-colors lg:h-8 lg:w-8"
                stroke={1.5}
                onClick={() => window.history.back()}
              />
              <div>
                <h1 className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-xl font-extrabold tracking-tight text-transparent lg:text-3xl dark:from-brand-400 dark:to-brand-200">
                  Retur Barang
                </h1>
                <p className="mt-0.5 hidden text-xs font-medium text-neutral-500 md:block lg:text-base dark:text-neutral-400">
                  Pengembalian barang ke supplier (Point of Sales Mode)
                </p>
              </div>
            </div>
            
            {selectedSupplier && (
              <div className="flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 shadow-sm border border-neutral-200 dark:bg-neutral-900/80 dark:border-neutral-800">
                <span className="text-xs text-neutral-500">Supplier:</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white">{selectedSupplier.nama}</span>
                <button onClick={handleReset} className="ml-2 text-neutral-400 hover:text-danger-500">
                   <IconX className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-100 bg-danger-50 p-3 text-sm text-danger-600 dark:border-danger-800/50 dark:bg-danger-900/30 dark:text-danger-300">
              <IconX className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-success-100 bg-success-50 p-3 text-sm text-success-600 shadow-sm dark:border-success-800/50 dark:bg-success-900/30 dark:text-success-300">
              <div className="flex items-center gap-2">
                <IconCheck className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
              {lastReturnId && (
                <Button variant="secondary" size="sm" onClick={handleExportPdf} className="h-8 rounded-lg text-xs">
                  <IconFileExport className="h-3.5 w-3.5" />
                  Export PDF
                </Button>
              )}
            </div>
          )}

          {/* POS Style Global Search Input */}
          <div className="relative z-30 mb-2">
            <form onSubmit={handleScanSubmit} className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <IconBarcode className="h-6 w-6 text-neutral-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={scanQuery}
                onChange={(e) => {
                  setScanQuery(e.target.value);
                  setShowDropdown(selectedSupplier !== null && e.target.value.length > 0);
                }}
                onFocus={() => {
                  if (scanQuery && selectedSupplier) setShowDropdown(true);
                }}
                placeholder={selectedSupplier ? "Cari nama barang atau scan barcode..." : "Scan barcode untuk auto-detect supplier, atau pilih supplier..."}
                className="w-full rounded-2xl border-2 border-brand-200 bg-white py-4 pl-12 pr-24 text-lg font-bold text-neutral-900 shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-brand-500"
                autoFocus
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                {isScanning ? (
                  <div className="mr-4 h-6 w-6 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"></div>
                ) : (
                  <Button type="submit" variant="primary" className="h-10 rounded-xl px-4 font-bold text-sm">
                    Enter
                  </Button>
                )}
              </div>
            </form>
            
            {/* Dropdown for manual search when supplier is selected */}
            {showDropdown && filteredDropdownItems.length > 0 && (
               <div className="absolute left-0 right-0 mt-2 rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden z-50">
                 {filteredDropdownItems.map(({ item, originalIndex }) => (
                    <button 
                      key={originalIndex}
                      type="button"
                      onClick={() => handleDropdownSelect(originalIndex)}
                      className="w-full text-left px-4 py-3 hover:bg-brand-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-0 flex justify-between items-center"
                    >
                       <div>
                         <p className="font-bold text-sm text-neutral-900 dark:text-white">{item.nama_barang}</p>
                         <p className="text-xs text-neutral-500">Sisa Retur: {item.qty_remaining} | Harga: {formatCurrency(item.harga_beli - (item.diskon||0))}</p>
                       </div>
                       <IconPlus className="h-5 w-5 text-brand-500" />
                    </button>
                 ))}
               </div>
            )}
          </div>

          {!selectedSupplier && suppliers.length > 0 && (
             <div className="flex items-center gap-2 mt-4 text-sm text-neutral-500">
                <span>Atau pilih manual: </span>
                <div className="w-64">
                   <SelectInput
                      value={""}
                      onChange={(val) => {
                        const supplier = suppliers.find((s) => s.id === val);
                        if (supplier) handleSelectSupplier(supplier as any);
                      }}
                      options={suppliers.map((s) => ({ value: s.id, label: s.nama }))}
                      placeholder="Pilih Supplier..."
                      inputSize="md"
                    />
                </div>
             </div>
          )}
        </div>

        {/* Content Section (Keranjang Retur) */}
        {selectedSupplier && (
          <div className="shadow-elevated animate-fade-in-up mb-24 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl transition-all delay-100 lg:mb-6 dark:border-white/10 dark:bg-neutral-900/60">
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              
              <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-white flex items-center gap-2">
                Keranjang Retur <span className="bg-brand-100 text-brand-600 text-xs px-2 py-1 rounded-full">{selectedItems.length} Item</span>
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"></div>
                </div>
              ) : selectedItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 py-16 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">
                  <IconSearch className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-3" />
                  <p className="text-base font-bold text-neutral-700 dark:text-neutral-300">
                    Keranjang Kosong
                  </p>
                  <p className="mt-1 text-sm opacity-75">
                    Silakan scan barcode atau cari barang di atas.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl lg:overflow-hidden lg:border lg:border-neutral-200/60 lg:bg-white/40 dark:lg:border-neutral-800/60 dark:lg:bg-neutral-950/40">
                  {/* Desktop Table View */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Barang & Info</th>
                          <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Harga Satuan</th>
                          <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Sisa Qty</th>
                          <th className="w-40 px-5 py-4 text-center text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Retur Qty</th>
                          <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">Subtotal</th>
                          <th className="w-16 px-5 py-4 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                        {items.map((item, index) => {
                          if (!item.selected || (item.return_qty || 0) === 0) return null;
                          const harga = item.harga_beli - (item.diskon || 0);
                          const returnSubtotal = (item.return_qty || 0) * harga;

                          return (
                            <tr key={item.pembelian_item_id} className="group transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                              <td className="px-5 py-4">
                                <p className="group-hover:text-brand-600 dark:group-hover:text-brand-400 text-sm font-bold text-neutral-900 transition-colors dark:text-neutral-100">
                                  {item.nama_barang}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                                    {item.nomor_nota || item.pembelian_id.slice(0, 8)}
                                  </span>
                                  <span className="text-xs text-neutral-500">{item.tanggal_pembelian}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {formatCurrency(harga)}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                  {item.qty_remaining}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-center">
                                  <div className="flex items-center rounded-lg border border-brand-200 bg-white shadow-sm p-1 transition-colors dark:border-brand-800 dark:bg-neutral-950">
                                    <button onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) - 1)} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/30">
                                      <IconMinus className="h-4 w-4" />
                                    </button>
                                    <PriceInput
                                      value={item.return_qty || 0}
                                      onChange={(val) => handleReturnQtyChange(index, val)}
                                      className="mx-1 w-12 border-none bg-transparent p-0 text-center text-sm font-bold focus:ring-0"
                                      min={0}
                                      max={item.qty_remaining}
                                      prefix=""
                                    />
                                    <button onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) + 1)} disabled={(item.return_qty || 0) >= item.qty_remaining} className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30 dark:hover:bg-brand-900/30">
                                      <IconPlus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-bold text-brand-600 dark:text-brand-400">
                                {formatCurrency(returnSubtotal)}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <button onClick={() => handleRemoveItem(index)} className="p-2 text-neutral-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors">
                                  <IconTrash className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact List View */}
                  <div className="block space-y-3 pb-4 lg:hidden">
                    {items.map((item, index) => {
                      if (!item.selected || (item.return_qty || 0) === 0) return null;
                      const harga = item.harga_beli - (item.diskon || 0);
                      const returnSubtotal = (item.return_qty || 0) * harga;

                      return (
                        <div key={item.pembelian_item_id} className="relative rounded-2xl border border-brand-200 bg-white/90 p-3 shadow-sm ring-1 ring-brand-100 transition-all duration-200 dark:border-neutral-700 dark:bg-neutral-900/90 dark:ring-neutral-800">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1 pr-2">
                              <h3 className="mb-0.5 text-sm font-bold leading-tight text-neutral-900 dark:text-neutral-100">{item.nama_barang}</h3>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">{item.nomor_nota || item.pembelian_id.slice(0, 8)}</span>
                                <span className="text-[10px] text-neutral-500">{item.tanggal_pembelian}</span>
                              </div>
                            </div>
                            <button onClick={() => handleRemoveItem(index)} className="p-1.5 text-neutral-400 hover:text-danger-500 bg-neutral-50 rounded-lg dark:bg-neutral-800">
                               <IconTrash className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-end justify-between">
                             <div>
                                <p className="mb-0.5 text-[10px] font-medium text-neutral-500">SISA QTY: {item.qty_remaining}</p>
                                <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{formatCurrency(harga)}</p>
                             </div>
                             <div className="text-right">
                                <p className="mb-0.5 text-[10px] font-medium text-neutral-400">SUBTOTAL</p>
                                <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{formatCurrency(returnSubtotal)}</p>
                             </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                            <span className="text-xs font-bold text-neutral-500">Retur Qty</span>
                            <div className="flex h-9 items-center rounded-lg border border-brand-200 bg-white shadow-sm dark:border-brand-800 dark:bg-neutral-950">
                              <button onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) - 1)} className="flex h-9 w-10 items-center justify-center text-neutral-500 active:bg-brand-50">
                                <IconMinus className="h-4 w-4" />
                              </button>
                              <PriceInput
                                value={item.return_qty || 0}
                                onChange={(val) => handleReturnQtyChange(index, val)}
                                className="h-full w-12 border-none bg-transparent p-0 text-center text-sm font-bold focus:ring-0"
                                min={0}
                                max={item.qty_remaining}
                                prefix=""
                              />
                              <button onClick={() => handleReturnQtyChange(index, (item.return_qty || 0) + 1)} disabled={(item.return_qty || 0) >= item.qty_remaining} className="flex h-9 w-10 items-center justify-center text-neutral-500 active:bg-brand-50 disabled:opacity-30">
                                <IconPlus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {selectedItems.length > 0 && (
                <div className="mt-5 lg:mt-6">
                  <label className="mb-2 block text-xs font-semibold text-neutral-700 lg:text-sm dark:text-neutral-300">
                    Catatan Retur (Opsional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tambahkan alasan retur..."
                    className="focus:ring-brand-400 w-full resize-none rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm transition-all placeholder:text-neutral-400 focus:border-transparent focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-800 dark:bg-neutral-950/80"
                    rows={2}
                  />
                </div>
              )}

            </div>
          </div>
        )}

        {/* Floating Action Bar (Footer) */}
        {selectedSupplier && selectedItems.length > 0 && (
          <div className="pointer-events-none fixed right-0 bottom-4 left-0 z-40 px-4 lg:sticky lg:bottom-0 lg:px-0">
            <div className="pointer-events-auto mx-auto max-w-[1920px]">
              <div className="animate-fade-in-up rounded-3xl border border-white/40 bg-white/80 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:rounded-t-3xl lg:rounded-b-none lg:p-5 dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-6">
                    <div className="hidden flex-col lg:flex">
                      <span className="text-xs font-medium text-neutral-500">Item Terpilih</span>
                      <span className="text-lg font-bold text-neutral-900 dark:text-white">{selectedItems.length}</span>
                    </div>
                    <div className="hidden h-10 w-px bg-neutral-200 lg:block dark:bg-neutral-800"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase lg:text-xs">Total Retur</span>
                      <span className="from-brand-600 to-brand-400 bg-gradient-to-r bg-clip-text text-base font-extrabold text-transparent lg:text-2xl dark:from-brand-400 dark:to-brand-200">{formatCurrency(totalReturn)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" onClick={handleReset} disabled={submitting} className="flex h-12 items-center justify-center rounded-2xl border-transparent bg-neutral-100 px-4 text-neutral-600 hover:bg-neutral-200 lg:h-14 lg:rounded-xl lg:px-6 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
                      <IconRefresh className="h-5 w-5 lg:mr-2" />
                      <span className="hidden text-sm font-bold lg:inline lg:text-base">Reset</span>
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={submitting || totalReturn === 0} className="shadow-brand-500/20 group relative flex h-12 items-center justify-center overflow-hidden rounded-2xl px-4 shadow-lg lg:h-14 lg:rounded-xl lg:px-8">
                      <span className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></span>
                      <IconDeviceFloppy className="h-5 w-5 lg:mr-2" />
                      <span className="hidden text-sm font-bold lg:inline lg:text-base">{submitting ? 'Menyimpan...' : 'Simpan Retur'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pilih Supplier Multi */}
        {supplierModalOpen && (
          <Portal>
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
                <h3 className="mb-2 text-lg font-bold text-neutral-900 dark:text-white">Pilih Supplier</h3>
                <p className="mb-6 text-sm text-neutral-500">Barang ini dibeli dari beberapa supplier berbeda. Retur ke mana?</p>
                <div className="space-y-3">
                  {supplierOptions.map((sup) => (
                    <button
                      key={sup.supplier_id}
                      onClick={async () => {
                        setSupplierModalOpen(false);
                        const s = suppliers.find(x => x.id === sup.supplier_id);
                        if (s) {
                          await handleSelectSupplierAndAutoAdd(s as any, scanQuery.trim());
                          setScanQuery('');
                        }
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-neutral-200 p-4 text-left transition-colors hover:border-brand-500 hover:bg-brand-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
                    >
                      <div>
                         <p className="font-bold text-neutral-900 dark:text-white">{sup.supplier_nama}</p>
                         <p className="text-xs text-neutral-500">Sisa Stok Retur: {sup.total_qty_remaining}</p>
                      </div>
                      <IconPlus className="h-5 w-5 text-neutral-400" />
                    </button>
                  ))}
                </div>
                <Button variant="secondary" className="mt-6 w-full" onClick={() => setSupplierModalOpen(false)}>
                  Batal
                </Button>
              </div>
            </div>
          </Portal>
        )}

        {/* Preview Modal omitted for brevity, keeping original rendering style */}
        {showPreview && previewData && (
          <Portal>
             <div className="animate-fade-in fixed inset-0 z-[100] flex items-end justify-center p-0 lg:items-center lg:p-4">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setShowPreview(false)}
              />
              <div className="animate-slide-up lg:animate-zoom-in relative flex max-h-[90vh] w-full max-w-3xl transform flex-col rounded-t-3xl border border-white/20 bg-white shadow-2xl transition-transform lg:max-h-[85vh] lg:rounded-3xl dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-shrink-0 items-center justify-between rounded-t-3xl border-b border-neutral-100 bg-neutral-50/50 p-5 lg:p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 lg:text-xl dark:text-white">
                      Konfirmasi Retur
                    </h2>
                    <p className="mt-0.5 text-xs text-neutral-500 lg:text-sm">
                      Periksa kembali detail retur sebelum menyimpan
                    </p>
                  </div>
                  <button onClick={() => setShowPreview(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/50 text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700">
                    <IconX className="h-5 w-5" />
                  </button>
                </div>
                <div className="custom-scrollbar flex-1 overflow-auto p-5 lg:p-6">
                  <div className="bg-brand-50/50 border-brand-100 mb-6 grid grid-cols-2 gap-4 rounded-2xl border p-4 dark:bg-brand-900/10 dark:border-brand-900/30">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase text-neutral-500 lg:text-xs">Supplier</p>
                      <p className="text-sm font-bold text-neutral-900 lg:text-base dark:text-white">{previewData.supplier_nama}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase text-neutral-500 lg:text-xs">Tanggal</p>
                      <p className="text-sm font-bold text-neutral-900 lg:text-base dark:text-white">{previewData.tanggal}</p>
                    </div>
                  </div>
                  <h3 className="mb-3 px-1 text-sm font-bold text-neutral-800 dark:text-neutral-200">Daftar Barang ({previewData.items.length})</h3>
                  <div className="space-y-3">
                    {previewData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center lg:p-4 dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{item.nama_barang}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">{item.nomor_nota}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-6 border-t border-neutral-100 pt-3 sm:w-1/3 sm:justify-end sm:border-t-0 sm:pt-0 dark:border-neutral-800">
                          <div className="text-center">
                            <span className="inline-flex items-center justify-center rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{item.return_qty}x</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{formatCurrency(item.harga_final)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 rounded-b-3xl border-t border-neutral-100 bg-neutral-50/80 p-5 backdrop-blur-md lg:p-6 dark:border-neutral-800 dark:bg-neutral-950/80">
                  <div className="mb-5 flex items-center justify-between px-1 lg:mb-6">
                    <span className="text-sm font-semibold text-neutral-600 lg:text-base dark:text-neutral-400">Total Pengembalian</span>
                    <span className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">{formatCurrency(previewData.total)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setShowPreview(false)} className="h-12 flex-1 rounded-xl text-sm font-semibold lg:h-14 lg:flex-none">Batal</Button>
                    <Button onClick={handleConfirmSubmit} disabled={submitting} variant="primary" className="shadow-brand-500/25 group relative h-12 flex-1 overflow-hidden rounded-xl text-sm font-bold shadow-lg lg:h-14">
                      <IconCheck className="mr-2 h-5 w-5" />
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
