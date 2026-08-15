'use client';

import { useState, useEffect, useMemo } from 'react';

import { IconUpload, IconArrowRight, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { PriceInput } from '@/components/ui/PriceInput';

interface ImportCSVWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (
    items: Array<{
      item: InventoryItem;
      qty: number;
      harga_beli: number;
    }>,
  ) => void;
}

export default function ImportCSVWizard({ open, onClose, onComplete }: ImportCSVWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawParsedData, setRawParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mappings
  const [mapping, setMapping] = useState({
    nama_barang: '',
    qty: '',
    harga_beli: '',
  });

  // Data processing state
  const [mappedData, setMappedData] = useState<
    Array<{ nama_barang: string; qty: number; harga_beli: number }>
  >([]);
  const [existingItems, setExistingItems] = useState<InventoryItem[]>([]);

  // Step 3 state
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [newItemsData, setNewItemsData] = useState<
    Record<
      string,
      { harga_jual: number; barcode: string; kategori: string; id_kategori: string | null }
    >
  >({});
  const [categories, setCategories] = useState<{ id: string; nama: string }[]>([]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setFile(null);
      setHeaders([]);
      setRawParsedData([]);
      setMapping({ nama_barang: '', qty: '', harga_beli: '' });
      setMappedData([]);
      setExistingItems([]);
      setMissingItems([]);
      setNewItemsData({});
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (step === 3 && categories.length === 0) {
      kategoriApi.getAll().then((res) => {
        if (res.data) setCategories(res.data);
      });
    }
  }, [step, categories.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);

    const { default: Papa } = await import('papaparse');

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);

          // Auto-map if names match
          const f = results.meta.fields.map((field) => field.toLowerCase());
          setMapping({
            nama_barang:
              results.meta.fields[
                f.findIndex((x) => x.includes('nama') || x.includes('item') || x.includes('barang'))
              ] || '',
            qty:
              results.meta.fields[
                f.findIndex(
                  (x) => x.includes('qty') || x.includes('jumlah') || x.includes('quantity'),
                )
              ] || '',
            harga_beli:
              results.meta.fields[
                f.findIndex((x) => x.includes('harga') || x.includes('price') || x.includes('cost'))
              ] || '',
          });
        }
        setRawParsedData(results.data);
      },
      error: (error) => {
        setError(error.message);
      },
    });
  };

  const handleProcessMapping = () => {
    if (!mapping.nama_barang || !mapping.qty || !mapping.harga_beli) {
      setError('Pilih semua kolom yang dibutuhkan');
      return;
    }

    const processed = rawParsedData
      .map((row) => {
        // Membersihkan string harga (menghapus Rp, koma, titik)
        let rawHarga = String(row[mapping.harga_beli] || '0').replace(/[^0-9]/g, '');
        let rawQty = String(row[mapping.qty] || '0').replace(/[^0-9]/g, '');

        return {
          nama_barang: String(row[mapping.nama_barang] || '').trim(),
          qty: parseInt(rawQty, 10) || 0,
          harga_beli: parseInt(rawHarga, 10) || 0,
        };
      })
      .filter((item) => item.nama_barang && item.qty > 0);

    if (processed.length === 0) {
      setError('Data CSV kosong atau tidak valid setelah proses mapping.');
      return;
    }

    setMappedData(processed);
    setStep(2);
    setError(null);
  };

  const handleIdentifyItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const names = mappedData.map((d) => d.nama_barang);
      const allInventory = await inventoryApi.getAll();
      const res = await inventoryApi.checkBatchExistence(names, allInventory.data || []);

      if (res.error) {
        throw new Error(res.error.message);
      }

      setExistingItems(res.existing || []);

      if (res.missing && res.missing.length > 0) {
        setMissingItems(res.missing);

        // Initialize state for missing items
        const defaultCategory =
          categories.find((c) => c.nama.toLowerCase() === 'umum') || categories[0];

        const initialNewData: typeof newItemsData = {};
        res.missing.forEach((name) => {
          // Find original harga_beli
          const originalData = mappedData.find(
            (d) => d.nama_barang.toLowerCase() === name.toLowerCase(),
          );
          const harga_beli = originalData?.harga_beli || 0;

          initialNewData[name] = {
            harga_jual: Math.round(harga_beli * 1.2), // Default 20% margin
            barcode: '',
            kategori: defaultCategory?.nama || 'Umum',
            id_kategori: defaultCategory?.id || null,
          };
        });
        setNewItemsData(initialNewData);
        setStep(3);
      } else {
        // All items exist
        finalizeImport(res.existing || []);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengidentifikasi barang');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNewItem = (name: string, field: string, value: any) => {
    setNewItemsData((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        [field]: value,
      },
    }));
  };

  const finalizeImport = (allExistingItems: InventoryItem[]) => {
    const finalResult = mappedData
      .map((data) => {
        const item = allExistingItems.find(
          (e) => e.nama_barang.toLowerCase().trim() === data.nama_barang.toLowerCase().trim(),
        );
        if (!item) return null;
        return {
          item,
          qty: data.qty,
          harga_beli: data.harga_beli,
        };
      })
      .filter(Boolean) as Array<{ item: InventoryItem; qty: number; harga_beli: number }>;

    onComplete(finalResult);
  };

  const handleCreateAndComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Prepare creation payload
      const payloadToCreate = missingItems.map((name) => {
        const itemData = newItemsData[name];
        const originalData = mappedData.find(
          (d) => d.nama_barang.toLowerCase() === name.toLowerCase(),
        );

        return {
          nama_barang: name,
          kode_barcode: itemData.barcode.trim() || undefined,
          id_kategori: itemData.id_kategori || undefined,
          harga_jual: itemData.harga_jual,
          harga_beli: originalData?.harga_beli || 0,
        };
      });

      // 2. Create in backend
      const createRes = await inventoryApi.createBatch(payloadToCreate);

      if (createRes.error) {
        throw new Error(createRes.error.message);
      }

      // 3. Combine with existing
      const newlyCreatedItems = createRes.data || [];
      const combinedItems = [...existingItems, ...newlyCreatedItems];

      // 4. Finalize
      finalizeImport(combinedItems);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat barang baru');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Portal>
      <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                <div className="bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex h-8 w-8 items-center justify-center rounded-lg">
                  <IconUpload size={20} />
                </div>
                Import Pembelian CSV
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Impor data faktur dari supplier dengan cepat
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-accent-rose-50 dark:bg-accent-rose-900/20 text-accent-rose-600 dark:text-accent-rose-400 border-accent-rose-100 dark:border-accent-rose-900/50 mx-6 mt-4 flex items-start gap-3 rounded-xl border p-3">
              <IconAlertCircle size={20} className="mt-0.5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Content Body */}
          <div className="custom-scrollbar flex-1 overflow-auto p-6">
            {/* STEP 1: UPLOAD & MAP */}
            {step === 1 && (
              <div className="animate-fade-in space-y-6">
                {!file ? (
                  <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-10 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:bg-neutral-800">
                    <input
                      type="file"
                      accept=".csv"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={handleFileUpload}
                    />
                    <div className="text-brand-500 mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <IconUpload size={28} />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                      Klik atau Drag & Drop file CSV
                    </h3>
                    <p className="mt-2 max-w-sm text-center text-sm text-neutral-500">
                      Pastikan file CSV Anda memiliki kolom untuk nama barang, jumlah (qty), dan
                      harga beli.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-900/50 flex items-center justify-between rounded-xl border p-4">
                      <div className="flex items-center gap-3">
                        <IconCheck className="text-brand-600 dark:text-brand-400" />
                        <div>
                          <p className="text-brand-900 dark:text-brand-100 font-medium">
                            {file.name}
                          </p>
                          <p className="text-brand-600 dark:text-brand-400 text-sm">
                            {rawParsedData.length} baris terdeteksi
                          </p>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setFile(null)}>
                        Ganti File
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                      <h3 className="mb-4 font-semibold text-neutral-800 dark:text-neutral-200">
                        Pilih Kolom (Mapping)
                      </h3>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Kolom Nama Barang
                          </label>
                          <select
                            className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            value={mapping.nama_barang}
                            onChange={(e) =>
                              setMapping((p) => ({ ...p, nama_barang: e.target.value }))
                            }
                          >
                            <option value="">-- Pilih Kolom --</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Kolom Qty
                          </label>
                          <select
                            className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            value={mapping.qty}
                            onChange={(e) => setMapping((p) => ({ ...p, qty: e.target.value }))}
                          >
                            <option value="">-- Pilih Kolom --</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Kolom Harga Beli
                          </label>
                          <select
                            className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                            value={mapping.harga_beli}
                            onChange={(e) =>
                              setMapping((p) => ({ ...p, harga_beli: e.target.value }))
                            }
                          >
                            <option value="">-- Pilih Kolom --</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === 2 && (
              <div className="animate-fade-in flex h-full flex-col">
                <h3 className="mb-2 font-semibold text-neutral-800 dark:text-neutral-200">
                  Review Data CSV
                </h3>
                <p className="mb-4 text-sm text-neutral-500">
                  Pastikan data berikut sudah benar sebelum dilanjutkan. Hanya 10 baris pertama yang
                  ditampilkan.
                </p>

                <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm dark:border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nama Barang</th>
                        <th className="px-4 py-3 text-right font-medium">Qty</th>
                        <th className="px-4 py-3 text-right font-medium">Harga Beli</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {mappedData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="bg-white dark:bg-neutral-900">
                          <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                            {row.nama_barang}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">
                            {row.qty}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">
                            {formatCurrency(row.harga_beli)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mappedData.length > 10 && (
                  <div className="mt-3 text-center text-sm font-medium text-neutral-500">
                    ... dan {mappedData.length - 10} baris lainnya
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: MISSING ITEMS RESOLUTION */}
            {step === 3 && (
              <div className="animate-fade-in flex h-full flex-col">
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                  <h3 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400">
                    <IconAlertCircle size={20} />
                    {missingItems.length} Barang Belum Ada di Sistem
                  </h3>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                    Barang-barang ini akan didaftarkan sebagai barang baru. Silakan lengkapi harga
                    jual dan kategori jika perlu. Kosongkan barcode jika ingin dibuat otomatis.
                  </p>
                </div>

                <div className="flex-1 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm dark:border-neutral-800">
                  <div className="custom-scrollbar h-full overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-neutral-50 text-neutral-600 shadow-sm dark:bg-neutral-800/50 dark:text-neutral-400">
                        <tr>
                          <th className="w-64 px-4 py-3 font-medium">Nama Barang (Baru)</th>
                          <th className="w-32 px-4 py-3 text-right font-medium">Harga Beli</th>
                          <th className="w-40 px-4 py-3 font-medium">Kategori</th>
                          <th className="w-40 px-4 py-3 text-right font-medium">Harga Jual</th>
                          <th className="w-48 px-4 py-3 font-medium">Barcode (Opsional)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {missingItems.map((name) => {
                          const originalData = mappedData.find(
                            (d) => d.nama_barang.toLowerCase() === name.toLowerCase(),
                          );
                          const itemData = newItemsData[name];

                          return (
                            <tr
                              key={name}
                              className="bg-white transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                            >
                              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                                {name}
                              </td>
                              <td className="px-4 py-3 text-right text-neutral-500">
                                {formatCurrency(originalData?.harga_beli || 0)}
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="focus:ring-brand-500 w-full rounded-lg border border-neutral-200 bg-transparent px-2 py-1.5 text-neutral-900 focus:ring-2 dark:border-neutral-700 dark:text-neutral-100"
                                  value={itemData?.kategori || ''}
                                  onChange={(e) => {
                                    const selectedCat = categories.find(
                                      (c) => c.nama === e.target.value,
                                    );
                                    handleUpdateNewItem(name, 'kategori', e.target.value);
                                    handleUpdateNewItem(
                                      name,
                                      'id_kategori',
                                      selectedCat?.id || null,
                                    );
                                  }}
                                >
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.nama}>
                                      {c.nama}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <PriceInput
                                  value={itemData?.harga_jual || 0}
                                  onChange={(val) => handleUpdateNewItem(name, 'harga_jual', val)}
                                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-right dark:border-neutral-700"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  placeholder="Auto"
                                  value={itemData?.barcode || ''}
                                  onChange={(e) =>
                                    handleUpdateNewItem(name, 'barcode', e.target.value)
                                  }
                                  className="focus:ring-brand-500 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 font-mono text-xs text-neutral-900 focus:ring-2 dark:border-neutral-700 dark:text-neutral-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-auto flex items-center justify-between border-t border-neutral-200 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div>
              <span className="text-sm font-medium text-neutral-500">Langkah {step} dari 3</span>
            </div>
            <div className="flex gap-3">
              {step > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  disabled={loading}
                >
                  Kembali
                </Button>
              )}

              {step === 1 && (
                <Button
                  variant="primary"
                  onClick={handleProcessMapping}
                  disabled={!file}
                  className="flex items-center gap-2"
                >
                  Lanjutkan <IconArrowRight size={18} />
                </Button>
              )}

              {step === 2 && (
                <Button
                  variant="primary"
                  onClick={handleIdentifyItems}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Mengidentifikasi...' : 'Cek Barang'} <IconArrowRight size={18} />
                </Button>
              )}

              {step === 3 && (
                <Button
                  variant="primary"
                  onClick={handleCreateAndComplete}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Menyimpan...' : 'Proses & Masukkan Keranjang'} <IconCheck size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
