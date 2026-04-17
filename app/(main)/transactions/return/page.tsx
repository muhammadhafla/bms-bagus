'use client';

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { returnApi, AvailableReturnItem } from '@/lib/api/return';
import { supplierApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { IconArrowBack, IconSearch, IconFileExport } from '@tabler/icons-react';
import { PriceInput } from '@/components/ui/PriceInput';
import { Button } from '@/components/ui';

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

type ReturnType = 'pembelian' | 'penjualan';
type Mode = 'single' | 'batch';

export default function ReturnPage() {
  const [returnType, setReturnType] = useState<ReturnType>('pembelian');
  const [mode, setMode] = useState<Mode>('batch');
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<AvailableReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [lastReturnId, setLastReturnId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
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
        setSuppliers(result.data || []);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleSelectSupplier = useCallback(async (supplier: any) => {
    setSelectedSupplier(supplier);
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
      setStep(2);
    } catch (err) {
      console.error('Error loading items:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleItem = useCallback((index: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { 
        ...newItems[index], 
        selected: !newItems[index].selected,
        return_qty: !newItems[index].selected ? newItems[index].qty_remaining : 0
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
    setStep(1);
    setSelectedSupplier(null);
    setItems([]);
    setError(null);
    setSuccess(null);
    setNote('');
    setLastReturnId(null);
  }, []);

  const handleTypeChange = useCallback((type: ReturnType) => {
    setReturnType(type);
    handleReset();
  }, [handleReset]);

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
        setSuccess(`Return berhasil disimpan. Total: ${formatCurrency(totalReturn)}`);
        setLastReturnId(result.data);
        setShowPreview(false);
        setPreviewData(null);
        setTimeout(() => {
          handleReset();
        }, 3000);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Terjadi kesalahan');
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
        items: result.data.items?.map((item: any) => ({
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
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-300 to-brand-400 rounded-xl flex items-center justify-center shadow-md">
              <IconArrowBack className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Retur Barang</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Kelola retur barang ke supplier</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-5 flex-wrap">
          <Button
            variant={returnType === 'pembelian' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleTypeChange('pembelian')}
          >
            Retur Pembelian
          </Button>
          <Button
            variant={returnType === 'penjualan' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleTypeChange('penjualan')}
          >
            Retur Penjualan
          </Button>
          <div className="flex-1" />
          <Button
            variant={mode === 'single' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('single')}
          >
            Per Transaksi
          </Button>
          <Button
            variant={mode === 'batch' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode('batch')}
          >
            Batch (Multi Transaksi)
          </Button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-danger-50 dark:bg-danger-900 text-danger-600 dark:text-danger-200 rounded-lg text-sm border border-danger-100 dark:border-danger-800">{error}</div>
        )}
        {success && (
          <div className="mt-3 p-3 bg-success-50 dark:bg-success-900 text-success-600 dark:text-success-200 rounded-lg text-sm border border-success-100 dark:border-success-800 flex justify-between items-center">
            <span>{success}</span>
            {lastReturnId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
              >
                <IconFileExport className="w-4 h-4" />
                Export PDF
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto p-6">
        {step === 1 ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Pilih Supplier</h2>
            {suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
                <IconSearch className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Tidak ada supplier terdaftar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    onClick={() => handleSelectSupplier(supplier)}
                    className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-brand-400 hover:shadow-md transition-all text-left"
                  >
                    <p className="font-semibold text-lg">{supplier.nama}</p>
                    <p className="text-sm text-neutral-500">{supplier.kontak}</p>
                    <p className="text-sm text-neutral-400 mt-1">{supplier.alamat}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {selectedSupplier && (
              <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <p className="text-lg font-semibold">{selectedSupplier.nama}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {selectedSupplier.alamat} | {selectedSupplier.kontak}
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Catatan Return
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Masukkan alasan retur atau catatan lain..."
                className="w-full px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 transition-all"
                rows={2}
              />
            </div>

            {items.length === 0 ? (
              <div className="text-center text-neutral-500 py-8">
                Tidak ada item yang bisa diretur untuk supplier ini
              </div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300 w-12"></th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">Nama Barang</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">No. PO</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-300">Tanggal</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-300">Harga</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-300">Sisa</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-300">Return</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-600 dark:text-neutral-300">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {items.map((item, index) => {
                      const harga = item.harga_beli - (item.diskon || 0);
                      const returnSubtotal = (item.return_qty || 0) * harga;

                      return (
                        <tr 
                          key={item.pembelian_item_id} 
                          className={`${item.selected ? 'bg-brand-50 dark:bg-brand-900/20' : ''} hover:bg-neutral-50 dark:hover:bg-neutral-800`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(index)}
                              className="w-5 h-5 rounded border-neutral-300 text-brand-500 focus:ring-brand-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{item.nama_barang}</td>
                          <td className="px-4 py-3 text-sm text-neutral-600 font-mono">{item.nomor_nota || item.pembelian_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 text-sm text-neutral-600">{item.tanggal_pembelian}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(harga)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium">{item.qty_remaining}</td>
                          <td className="px-4 py-3 text-right">
                            <PriceInput
                              value={item.return_qty || 0}
                              onChange={(val) => handleReturnQtyChange(index, val)}
                              disabled={!item.selected}
                              className="w-20 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded-lg disabled:opacity-50"
                              min={0}
                              max={item.qty_remaining}
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            {formatCurrency(returnSubtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {step === 2 && items.length > 0 && (
        <footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="bg-neutral-50 dark:bg-neutral-950 rounded-xl px-5 py-3 border border-neutral-200 dark:border-neutral-800">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Item dipilih: {selectedItems.length}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Return</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{formatCurrency(totalReturn)}</p>
            </div>

            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={handleReset}
                className="px-6 py-3 border-2 border-neutral-200 rounded-xl hover:bg-neutral-50 font-medium text-neutral-700 transition-all"
              >
                Kembali
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || totalReturn === 0}
                className="px-8 py-3 bg-gradient-to-r from-brand-400 to-brand-500 text-white rounded-xl hover:from-brand-500 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md transition-all"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Return'}
              </button>
            </div>
          </div>
        </footer>
      )}

      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">Preview Retur Barang</h2>
            
            <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p><span className="font-medium">Supplier:</span> {previewData.supplier_nama}</p>
              <p><span className="font-medium">Tanggal:</span> {previewData.tanggal}</p>
              {previewData.note && <p><span className="font-medium">Catatan:</span> {previewData.note}</p>}
            </div>

            <div className="overflow-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 dark:bg-neutral-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Nama Barang</th>
                    <th className="px-3 py-2 text-left">No. PO</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Harga</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2">{item.nama_barang}</td>
                      <td className="px-3 py-2">{item.nomor_nota}</td>
                      <td className="px-3 py-2 text-right">{item.return_qty}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.harga_beli - (item.diskon || 0))}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.harga_final)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold">
                  <tr className="border-t-2 border-neutral-300">
                    <td colSpan={4} className="px-3 py-2 text-right">TOTAL:</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(previewData.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowPreview(false)}>
                Batal
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                disabled={submitting}
                variant="primary"
              >
                {submitting ? 'Menyimpan...' : 'Konfirmasi Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
