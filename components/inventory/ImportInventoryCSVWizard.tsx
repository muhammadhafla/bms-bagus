'use client';

import { useState, useEffect } from 'react';

import {
  IconUpload,
  IconArrowRight,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi, kategoriApi } from '@/lib/api';

interface ImportInventoryCSVWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ImportInventoryCSVWizard({
  open,
  onClose,
  onComplete,
}: ImportInventoryCSVWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawParsedData, setRawParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mappings
  const [mapping, setMapping] = useState({
    nama_barang: '',
    kategori: '',
    harga_beli: '',
    harga_jual: '',
    diskon: '',
    kode_barcode: '',
    stok: '',
  });

  // Data processing state
  const [mappedData, setMappedData] = useState<
    Array<{
      nama_barang: string;
      kategori: string;
      harga_beli: number;
      harga_jual: number;
      diskon: number;
      kode_barcode: string;
      stok: number;
    }>
  >([]);
  const [summary, setSummary] = useState({ newCount: 0, updateCount: 0, duplicateCount: 0 });

  useEffect(() => {
    if (open) {
      setStep(1);
      setFile(null);
      setHeaders([]);
      setRawParsedData([]);
      setMapping({
        nama_barang: '',
        kategori: '',
        harga_beli: '',
        harga_jual: '',
        diskon: '',
        kode_barcode: '',
        stok: '',
      });
      setMappedData([]);
      setSummary({ newCount: 0, updateCount: 0, duplicateCount: 0 });
      setError(null);
    }
  }, [open]);

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
            kategori:
              results.meta.fields[
                f.findIndex((x) => x.includes('kategori') || x.includes('category'))
              ] || '',
            harga_beli:
              results.meta.fields[
                f.findIndex((x) => x.includes('beli') || x.includes('modal') || x.includes('cost'))
              ] || '',
            harga_jual:
              results.meta.fields[f.findIndex((x) => x.includes('jual') || x.includes('price'))] ||
              '',
            diskon:
              results.meta.fields[
                f.findIndex((x) => x.includes('diskon') || x.includes('discount'))
              ] || '',
            kode_barcode:
              results.meta.fields[
                f.findIndex((x) => x.includes('barcode') || x.includes('kode'))
              ] || '',
            stok:
              results.meta.fields[
                f.findIndex((x) => x.includes('stok') || x.includes('qty') || x.includes('jumlah'))
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

  const cleanNumber = (val: any): number => {
    const str = String(val || '0');
    // Remove everything except numbers and minus sign
    const cleaned = str.replace(/[^0-9-]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  const handleProcessMapping = async () => {
    if (!mapping.nama_barang || !mapping.harga_jual) {
      setError('Kolom Nama Barang dan Harga Jual wajib dipilih');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const processed = rawParsedData
        .map((row) => {
          return {
            nama_barang: String(row[mapping.nama_barang] || '').trim(),
            kategori: mapping.kategori ? String(row[mapping.kategori] || '').trim() : '',
            kode_barcode: mapping.kode_barcode
              ? String(row[mapping.kode_barcode] || '').trim()
              : '',
            stok: cleanNumber(row[mapping.stok]),
            harga_beli: cleanNumber(row[mapping.harga_beli]),
            harga_jual: cleanNumber(row[mapping.harga_jual]),
            diskon: cleanNumber(row[mapping.diskon]),
          };
        })
        .filter((item) => item.nama_barang !== '');

      if (processed.length === 0) {
        throw new Error('Data CSV kosong atau tidak valid setelah proses mapping.');
      }

      // Deduplicate from CSV
      const uniqueMap = new Map();
      let duplicateCount = 0;
      processed.forEach((item) => {
        const lowerName = item.nama_barang.toLowerCase();
        if (uniqueMap.has(lowerName)) {
          duplicateCount++;
        } else {
          uniqueMap.set(lowerName, item);
        }
      });

      const uniqueProcessed = Array.from(uniqueMap.values());

      // Check DB existence
      const names = uniqueProcessed.map((d) => d.nama_barang);
      const allInventory = await inventoryApi.getAll();
      const existRes = await inventoryApi.checkBatchExistence(names, allInventory.data || []);
      if (existRes.error) throw new Error(existRes.error.message);

      const existingMap = new Map(
        (existRes.existing || []).map((e) => [e.nama_barang.toLowerCase().trim(), e.nama_barang]),
      );

      let newCount = 0;
      let updateCount = 0;

      const finalMapped = uniqueProcessed.map((item) => {
        const lowerName = item.nama_barang.toLowerCase().trim();
        if (existingMap.has(lowerName)) {
          updateCount++;
          return { ...item, nama_barang: existingMap.get(lowerName) as string, isNew: false };
        } else {
          newCount++;
          return { ...item, isNew: true };
        }
      });

      setSummary({ newCount, updateCount, duplicateCount });
      setMappedData(finalMapped as any);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setProcessing(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get or create categories
      const categoryNames = mappedData.map((d) => d.kategori).filter(Boolean);
      const catRes = await kategoriApi.getOrCreateCategories(categoryNames);

      if (catRes.error) {
        throw new Error(catRes.error.message);
      }

      const categories = catRes.data || [];
      const catMap = new Map(categories.map((c) => [c.nama.toLowerCase(), c.id]));

      // 2. Prepare payload
      const payload = mappedData.map((item) => ({
        nama_barang: item.nama_barang,
        kode_barcode: item.kode_barcode || undefined,
        id_kategori: item.kategori ? catMap.get(item.kategori.toLowerCase()) : undefined,
        harga_jual: item.harga_jual,
        harga_beli: item.harga_beli,
        stok: item.stok,
        diskon: item.diskon,
      }));

      // 3. Upsert Batch
      const importRes = await inventoryApi.upsertBatch(payload);

      if (importRes.error) {
        throw new Error(importRes.error.message);
      }

      onComplete();
    } catch (err: any) {
      setError(err.message || 'Gagal mengimpor data barang');
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
                Import Master Data CSV
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Impor data barang awal ke dalam sistem (Upsert)
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
              <IconAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
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
                      Pastikan file CSV Anda memiliki kolom Nama Barang dan Harga Jual (Wajib).
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

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {Object.keys(mapping).map((key) => {
                          const labelMap: Record<string, string> = {
                            nama_barang: 'Nama Barang (Wajib)',
                            kategori: 'Kategori',
                            harga_beli: 'Harga Beli',
                            harga_jual: 'Harga Jual (Wajib)',
                            diskon: 'Diskon',
                            kode_barcode: 'Kode Barcode',
                            stok: 'Stok Awal',
                          };
                          return (
                            <div key={key}>
                              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {labelMap[key]}
                              </label>
                              <select
                                className="focus:ring-brand-500 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-neutral-900 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                                value={(mapping as any)[key]}
                                onChange={(e) =>
                                  setMapping((p) => ({ ...p, [key]: e.target.value }))
                                }
                              >
                                <option value="">-- Abaikan --</option>
                                {headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PREVIEW */}
            {step === 2 && (
              <div className="animate-fade-in flex h-full flex-col">
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                  <h3 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400">
                    <IconAlertCircle size={20} />
                    Perhatian: Proses Upsert
                  </h3>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                    Jika nama barang sudah ada di sistem, data akan diperbarui (ditimpa). Jika belum
                    ada, barang baru akan dibuat beserta kategorinya (jika belum ada).
                  </p>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    <span className="mb-1 text-sm text-neutral-500">Barang Baru</span>
                    <span className="text-accent-teal-600 dark:text-accent-teal-400 text-xl font-bold">
                      {summary.newCount}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30 rounded-xl border p-4">
                      <span className="text-brand-600 dark:text-brand-400 text-xl font-bold">
                        {summary.updateCount}
                      </span>
                      <p className="text-brand-700 dark:text-brand-300 text-xs font-medium">
                        Update Stok
                      </p>
                    </div>
                  </div>
                  <div className="group relative flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-3 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    <span className="mb-1 text-sm text-neutral-500">Duplikat CSV (Diabaikan)</span>
                    <span className="text-accent-rose-600 dark:text-accent-rose-400 text-xl font-bold">
                      {summary.duplicateCount}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm dark:border-neutral-800">
                  <div className="custom-scrollbar h-full overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-sm">
                      <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Nama Barang</th>
                          <th className="px-4 py-3 font-medium">Kategori</th>
                          <th className="px-4 py-3 font-medium">Barcode</th>
                          <th className="px-4 py-3 text-right font-medium">H. Beli</th>
                          <th className="px-4 py-3 text-right font-medium">H. Jual</th>
                          <th className="px-4 py-3 text-right font-medium">Diskon</th>
                          <th className="px-4 py-3 text-right font-medium">Stok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {mappedData.slice(0, 10).map((row: any, i) => (
                          <tr
                            key={i}
                            className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
                          >
                            <td className="px-4 py-3">
                              {!row.isNew ? (
                                <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded px-2 py-1 text-xs font-semibold">
                                  Update
                                </span>
                              ) : (
                                <span className="bg-accent-teal-100 text-accent-teal-700 dark:bg-accent-teal-900/30 dark:text-accent-teal-400 rounded px-2 py-1 text-xs font-semibold">
                                  Baru
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                              {row.nama_barang}
                            </td>
                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                              {row.kategori || '-'}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                              {row.kode_barcode || '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400">
                              {formatCurrency(row.harga_beli)}
                            </td>
                            <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">
                              {formatCurrency(row.harga_jual)}
                            </td>
                            <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-400">
                              {formatCurrency(row.diskon)}
                            </td>
                            <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">
                              {row.stok}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {mappedData.length > 10 && (
                  <div className="mt-3 text-center text-sm font-medium text-neutral-500">
                    ... dan {mappedData.length - 10} baris lainnya
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-auto flex items-center justify-between border-t border-neutral-200 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div>
              <span className="text-sm font-medium text-neutral-500">Langkah {step} dari 2</span>
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
                  disabled={!file || processing}
                  className="flex items-center gap-2"
                >
                  {processing ? 'Memproses...' : 'Lanjutkan'} <IconArrowRight size={18} />
                </Button>
              )}

              {step === 2 && (
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? 'Mengimpor...' : 'Import Data Sekarang'} <IconCheck size={18} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
