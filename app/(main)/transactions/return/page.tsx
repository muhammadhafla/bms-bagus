'use client';
import { format } from 'date-fns';

import { useState, useCallback, useEffect, useRef } from 'react';
import { returnApi, AvailableReturnItem } from '@/lib/api/return';
import { supplierApi } from '@/lib/api';
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
  IconChevronDown,
  IconRefresh,
} from '@tabler/icons-react';
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

import { useSuppliers } from '@/lib/hooks/useSuppliers';

export default function ReturnPage() {
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
    note: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

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

      const itemsWithSelection: AvailableReturnItem[] = (result.data || []).map((item) => ({
        ...item,
        selected: false,
        return_qty: 0,
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
        return_qty: !isCurrentlySelected ? newItems[index].qty_remaining : 0,
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
        selected: validQty > 0,
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

  const selectedItems = items.filter((item) => item.selected && (item.return_qty || 0) > 0);

  const totalReturn = selectedItems.reduce((sum, item) => {
    return sum + (item.return_qty || 0) * (item.harga_beli - (item.diskon || 0));
  }, 0);

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
    const previewDataToShow = {
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
        items: previewData.items.map((item) => ({
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
        items:
          result.data.items?.map(
            (item: {
              nama_barang: string;
              nomor_nota: string;
              tanggal_pembelian: string;
              qty: number;
              harga_beli: number;
              diskon: number;
              subtotal: number;
            }) => ({
              nama_barang: item.nama_barang,
              nomor_nota: item.nomor_nota || '-',
              tanggal_pembelian: item.tanggal_pembelian || '-',
              qty: item.qty,
              harga_beli: item.harga_beli,
              diskon: item.diskon || 0,
              harga_final: item.subtotal,
            }),
          ) || [],
        total: result.data.total || 0,
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
      <div className="flex min-h-[calc(100vh-2rem)] flex-col pb-24 lg:h-[calc(100vh-2rem)] lg:pb-0">
        {/* Header Section */}
        <div className="animate-fade-in-up mb-4 flex-shrink-0 transition-all duration-300 lg:mb-6">
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <IconArrowBack
                className="text-brand-500 hover:text-brand-600 h-6 w-6 shrink-0 cursor-pointer transition-colors lg:h-8 lg:w-8"
                stroke={1.5}
                onClick={() => window.history.back()}
              />
              <div>
                <h1 className="from-brand-600 to-brand-400 dark:from-brand-400 dark:to-brand-200 bg-gradient-to-r bg-clip-text text-xl font-extrabold tracking-tight text-transparent lg:text-3xl">
                  Retur Barang
                </h1>
                <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:text-base dark:text-neutral-400">
                  Pengembalian barang ke supplier
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-300 border-danger-100 dark:border-danger-800/50 mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm">
              <IconX className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-300 border-success-100 dark:border-success-800/50 mb-4 flex items-center justify-between rounded-xl border p-3 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <IconCheck className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
              {lastReturnId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportPdf}
                  className="h-8 rounded-lg text-xs"
                >
                  <IconFileExport className="h-3.5 w-3.5" />
                  Export PDF
                </Button>
              )}
            </div>
          )}

          {/* Supplier Selection Panel */}
          <div className="relative z-20">
            <div className="shadow-elevated rounded-2xl border border-white/50 bg-white/80 p-4 backdrop-blur-xl transition-all lg:p-6 dark:border-neutral-800 dark:bg-neutral-900/80">
              <h2 className="mb-3 text-sm font-bold text-neutral-800 lg:text-base dark:text-neutral-200">
                Pilih Supplier
              </h2>
              {suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                  <IconSearch className="mb-2 h-10 w-10 opacity-50" />
                  <p className="text-sm">Tidak ada supplier terdaftar</p>
                </div>
              ) : (
                <div className="max-w-xl">
                  <SelectInput
                    value={selectedSupplier?.id || ''}
                    onChange={(val) => {
                      const supplier = suppliers.find((s) => s.id === val);
                      if (supplier) handleSelectSupplier(supplier as any);
                    }}
                    options={suppliers.map((s) => ({ value: s.id, label: s.nama }))}
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
          <div className="shadow-elevated animate-fade-in-up mb-24 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl transition-all delay-100 lg:mb-6 dark:border-white/10 dark:bg-neutral-900/60">
            <div className="flex-1 overflow-auto p-4 lg:p-6">
              <div className="mb-5 lg:mb-6">
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

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="border-brand-200 border-t-brand-500 h-8 w-8 animate-spin rounded-full border-4"></div>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-12 text-center text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/30">
                  <p className="text-sm font-medium lg:text-base">
                    Tidak ada barang yang tersedia untuk diretur.
                  </p>
                  <p className="mt-1 text-xs opacity-75 lg:text-sm">
                    Hanya menampilkan barang yang sudah dibeli dari supplier ini dan masih memiliki
                    stok.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl lg:overflow-hidden lg:border lg:border-neutral-200/60 lg:bg-white/40 dark:lg:border-neutral-800/60 dark:lg:bg-neutral-950/40">
                  {/* Desktop Table View */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 shadow-sm backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/80">
                        <tr>
                          <th className="w-16 px-5 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Pilih
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Barang & Info
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Harga Satuan
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Sisa Qty
                          </th>
                          <th className="w-36 px-5 py-4 text-center text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Retur Qty
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Subtotal
                          </th>
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
                                <label className="relative flex cursor-pointer items-center">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleToggleItem(index)}
                                    className="peer sr-only"
                                  />
                                  <div className="peer-checked:bg-brand-500 peer-checked:border-brand-500 flex h-6 w-6 items-center justify-center rounded-md border-2 border-neutral-300 shadow-sm transition-all dark:border-neutral-600">
                                    <IconCheck
                                      className={`h-4 w-4 text-white transition-transform ${item.selected ? 'scale-100' : 'scale-0'}`}
                                      stroke={3}
                                    />
                                  </div>
                                </label>
                              </td>
                              <td className="px-5 py-4">
                                <p className="group-hover:text-brand-600 dark:group-hover:text-brand-400 text-sm font-bold text-neutral-900 transition-colors dark:text-neutral-100">
                                  {item.nama_barang}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                                    {item.nomor_nota || item.pembelian_id.slice(0, 8)}
                                  </span>
                                  <span className="text-xs text-neutral-500">
                                    {item.tanggal_pembelian}
                                  </span>
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
                                  <div
                                    className={`flex items-center rounded-lg border p-1 transition-colors ${item.selected ? 'border-brand-200 dark:border-brand-800 bg-white shadow-sm dark:bg-neutral-950' : 'border-neutral-200 bg-neutral-50 opacity-60 dark:border-neutral-800 dark:bg-neutral-900'}`}
                                  >
                                    <button
                                      onClick={() =>
                                        handleReturnQtyChange(index, (item.return_qty || 0) - 1)
                                      }
                                      disabled={!item.selected || (item.return_qty || 0) <= 0}
                                      className="hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors disabled:opacity-30"
                                    >
                                      <IconMinus className="h-4 w-4" />
                                    </button>
                                    <PriceInput
                                      value={item.return_qty || 0}
                                      onChange={(val) => handleReturnQtyChange(index, val)}
                                      disabled={!item.selected}
                                      className="mx-1 w-12 border-none bg-transparent p-0 text-center text-sm font-bold focus:ring-0"
                                      min={0}
                                      max={item.qty_remaining}
                                      prefix=""
                                    />
                                    <button
                                      onClick={() =>
                                        handleReturnQtyChange(index, (item.return_qty || 0) + 1)
                                      }
                                      disabled={
                                        !item.selected ||
                                        (item.return_qty || 0) >= item.qty_remaining
                                      }
                                      className="hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors disabled:opacity-30"
                                    >
                                      <IconPlus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="text-brand-600 dark:text-brand-400 px-5 py-4 text-right text-sm font-bold">
                                {formatCurrency(returnSubtotal)}
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
                      const harga = item.harga_beli - (item.diskon || 0);
                      const returnSubtotal = (item.return_qty || 0) * harga;

                      return (
                        <div
                          key={item.pembelian_item_id}
                          className={`relative rounded-2xl border bg-white/90 p-3 shadow-sm transition-all duration-200 dark:bg-neutral-900/90 ${item.selected ? 'border-brand-400 ring-brand-400/50 bg-brand-50/20 dark:bg-brand-900/10 ring-1' : 'border-neutral-200/70 dark:border-neutral-800/70'}`}
                        >
                          <div className="flex gap-3">
                            <label className="relative flex shrink-0 cursor-pointer items-start pt-1">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(index)}
                                className="peer sr-only"
                              />
                              <div className="peer-checked:bg-brand-500 peer-checked:border-brand-500 flex h-5 w-5 items-center justify-center rounded-md border-2 border-neutral-300 transition-all dark:border-neutral-600">
                                <IconCheck
                                  className={`h-3.5 w-3.5 text-white transition-transform ${item.selected ? 'scale-100' : 'scale-0'}`}
                                  stroke={3}
                                />
                              </div>
                            </label>

                            <div className="min-w-0 flex-1">
                              <h3 className="mb-0.5 text-sm leading-tight font-bold text-neutral-900 dark:text-neutral-100">
                                {item.nama_barang}
                              </h3>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                                  {item.nomor_nota || item.pembelian_id.slice(0, 8)}
                                </span>
                                <span className="text-[10px] text-neutral-500">
                                  {item.tanggal_pembelian}
                                </span>
                              </div>

                              <div className="mt-3 flex items-end justify-between">
                                <div>
                                  <p className="mb-0.5 text-[10px] font-medium text-neutral-500">
                                    HARGA SATUAN
                                  </p>
                                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                    {formatCurrency(harga)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="mb-0.5 text-[10px] font-medium text-neutral-500">
                                    SISA QTY
                                  </p>
                                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                    {item.qty_remaining}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Stepper & Subtotal */}
                          <div
                            className={`mt-4 border-t pt-3 transition-colors ${item.selected ? 'border-brand-100 dark:border-brand-900/30' : 'border-neutral-100 dark:border-neutral-800/50'} flex items-center justify-between`}
                          >
                            <div
                              className={`flex h-8 items-center rounded-full border transition-all ${item.selected ? 'border-brand-200 dark:border-brand-800 bg-white shadow-sm dark:bg-neutral-950' : 'border-neutral-200 bg-neutral-50 opacity-50 dark:border-neutral-800 dark:bg-neutral-900'}`}
                            >
                              <button
                                onClick={() =>
                                  handleReturnQtyChange(index, (item.return_qty || 0) - 1)
                                }
                                disabled={!item.selected || (item.return_qty || 0) <= 0}
                                className="flex h-8 w-8 items-center justify-center text-neutral-500 disabled:opacity-30"
                              >
                                <IconMinus className="h-3.5 w-3.5" />
                              </button>
                              <PriceInput
                                value={item.return_qty || 0}
                                onChange={(val) => handleReturnQtyChange(index, val)}
                                disabled={!item.selected}
                                className="h-full w-10 border-none bg-transparent p-0 text-center text-sm font-bold focus:ring-0"
                                min={0}
                                max={item.qty_remaining}
                                prefix=""
                              />
                              <button
                                onClick={() =>
                                  handleReturnQtyChange(index, (item.return_qty || 0) + 1)
                                }
                                disabled={
                                  !item.selected || (item.return_qty || 0) >= item.qty_remaining
                                }
                                className="flex h-8 w-8 items-center justify-center text-neutral-500 disabled:opacity-30"
                              >
                                <IconPlus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="mb-0.5 text-[10px] font-medium text-neutral-400">
                                SUBTOTAL
                              </p>
                              <p
                                className={`text-sm font-bold ${item.selected && returnSubtotal > 0 ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400 dark:text-neutral-600'}`}
                              >
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
          <div className="pointer-events-none fixed right-0 bottom-4 left-0 z-40 px-4 lg:sticky lg:bottom-0 lg:px-0">
            <div className="pointer-events-auto mx-auto max-w-[1920px]">
              <div className="animate-fade-in-up rounded-3xl border border-white/40 bg-white/80 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:rounded-t-3xl lg:rounded-b-none lg:p-5 dark:border-neutral-800 dark:bg-neutral-900/80 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-6">
                    <div className="hidden flex-col lg:flex">
                      <span className="text-xs font-medium text-neutral-500">Item Terpilih</span>
                      <span className="text-lg font-bold text-neutral-900 dark:text-white">
                        {selectedItems.length}
                      </span>
                    </div>
                    <div className="hidden h-10 w-px bg-neutral-200 lg:block dark:bg-neutral-800"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase lg:text-xs">
                        Total Retur
                      </span>
                      <span className="from-brand-600 to-brand-400 dark:from-brand-400 dark:to-brand-200 truncate bg-gradient-to-r bg-clip-text text-base font-extrabold text-transparent lg:text-2xl">
                        {formatCurrency(totalReturn)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      disabled={submitting}
                      className="flex h-12 items-center justify-center rounded-2xl border-transparent bg-neutral-100 px-4 text-neutral-600 hover:bg-neutral-200 lg:h-14 lg:rounded-xl lg:px-6 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      <IconRefresh className="h-5 w-5 lg:mr-2" />
                      <span className="hidden text-sm font-bold lg:inline lg:text-base">Reset</span>
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={submitting || totalReturn === 0}
                      className="shadow-brand-500/20 group relative flex h-12 items-center justify-center overflow-hidden rounded-2xl px-4 shadow-lg lg:h-14 lg:rounded-xl lg:px-8"
                    >
                      <span className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></span>
                      <IconDeviceFloppy className="h-5 w-5 lg:mr-2" />
                      <span className="hidden text-sm font-bold lg:inline lg:text-base">
                        {submitting ? 'Menyimpan...' : 'Simpan Retur'}
                      </span>
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
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/50 text-neutral-600 transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-auto p-5 lg:p-6">
                  <div className="bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30 mb-6 grid grid-cols-2 gap-4 rounded-2xl border p-4">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-neutral-500 uppercase lg:text-xs">
                        Supplier
                      </p>
                      <p className="text-sm font-bold text-neutral-900 lg:text-base dark:text-white">
                        {previewData.supplier_nama}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-neutral-500 uppercase lg:text-xs">
                        Tanggal
                      </p>
                      <p className="text-sm font-bold text-neutral-900 lg:text-base dark:text-white">
                        {previewData.tanggal}
                      </p>
                    </div>
                    {previewData.note && (
                      <div className="border-brand-200/50 dark:border-brand-800/50 col-span-2 mt-2 border-t pt-3">
                        <p className="mb-1 text-[10px] font-semibold text-neutral-500 uppercase lg:text-xs">
                          Catatan
                        </p>
                        <p className="text-xs text-neutral-800 italic lg:text-sm dark:text-neutral-300">
                          &quot;{previewData.note}&quot;
                        </p>
                      </div>
                    )}
                  </div>

                  <h3 className="mb-3 px-1 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    Daftar Barang ({previewData.items.length})
                  </h3>

                  <div className="space-y-3">
                    {previewData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center lg:p-4 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                            {item.nama_barang}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">
                              {item.nomor_nota}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {formatCurrency(item.harga_beli - (item.diskon || 0))} / item
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-6 border-t border-neutral-100 pt-3 sm:w-1/3 sm:justify-end sm:border-t-0 sm:pt-0 dark:border-neutral-800">
                          <div className="text-center">
                            <span className="mb-0.5 block text-[10px] text-neutral-400 sm:hidden">
                              QTY
                            </span>
                            <span className="inline-flex items-center justify-center rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                              {item.return_qty}x
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="mb-0.5 block text-[10px] text-neutral-400 sm:hidden">
                              SUBTOTAL
                            </span>
                            <span className="text-brand-600 dark:text-brand-400 text-sm font-bold">
                              {formatCurrency(item.harga_final)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-shrink-0 rounded-b-3xl border-t border-neutral-100 bg-neutral-50/80 p-5 backdrop-blur-md lg:p-6 dark:border-neutral-800 dark:bg-neutral-950/80">
                  <div className="mb-5 flex items-center justify-between px-1 lg:mb-6">
                    <span className="text-sm font-semibold text-neutral-600 lg:text-base dark:text-neutral-400">
                      Total Pengembalian
                    </span>
                    <span className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                      {formatCurrency(previewData.total)}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setShowPreview(false)}
                      className="h-12 flex-1 rounded-xl text-sm font-semibold lg:h-14 lg:flex-none"
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleConfirmSubmit}
                      disabled={submitting}
                      variant="primary"
                      className="shadow-brand-500/25 group relative h-12 flex-1 overflow-hidden rounded-xl text-sm font-bold shadow-lg lg:h-14"
                    >
                      <span className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></span>
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

