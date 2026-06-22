'use client';

import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { IconUpload, IconArrowRight, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { inventoryApi, kategoriApi } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';
import { PriceInput } from '@/components/ui/PriceInput';

interface ImportCSVWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (items: Array<{
    item: InventoryItem;
    qty: number;
    harga_beli: number;
  }>) => void;
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
  const [mappedData, setMappedData] = useState<Array<{ nama_barang: string; qty: number; harga_beli: number }>>([]);
  const [existingItems, setExistingItems] = useState<InventoryItem[]>([]);
  
  // Step 3 state
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [newItemsData, setNewItemsData] = useState<Record<string, { harga_jual: number; barcode: string; kategori: string; id_kategori: string | null }>>({});
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
      kategoriApi.getAll().then(res => {
        if (res.data) setCategories(res.data);
      });
    }
  }, [step, categories.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          
          // Auto-map if names match
          const f = results.meta.fields.map(field => field.toLowerCase());
          setMapping({
            nama_barang: results.meta.fields[f.findIndex(x => x.includes('nama') || x.includes('item') || x.includes('barang'))] || '',
            qty: results.meta.fields[f.findIndex(x => x.includes('qty') || x.includes('jumlah') || x.includes('quantity'))] || '',
            harga_beli: results.meta.fields[f.findIndex(x => x.includes('harga') || x.includes('price') || x.includes('cost'))] || '',
          });
        }
        setRawParsedData(results.data);
      },
      error: (error) => {
        setError(error.message);
      }
    });
  };

  const handleProcessMapping = () => {
    if (!mapping.nama_barang || !mapping.qty || !mapping.harga_beli) {
      setError('Pilih semua kolom yang dibutuhkan');
      return;
    }

    const processed = rawParsedData.map(row => {
      // Membersihkan string harga (menghapus Rp, koma, titik)
      let rawHarga = String(row[mapping.harga_beli] || '0').replace(/[^0-9]/g, '');
      let rawQty = String(row[mapping.qty] || '0').replace(/[^0-9]/g, '');

      return {
        nama_barang: String(row[mapping.nama_barang] || '').trim(),
        qty: parseInt(rawQty, 10) || 0,
        harga_beli: parseInt(rawHarga, 10) || 0,
      };
    }).filter(item => item.nama_barang && item.qty > 0);

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
      const names = mappedData.map(d => d.nama_barang);
      const res = await inventoryApi.checkBatchExistence(names);
      
      if (res.error) {
        throw new Error(res.error.message);
      }

      setExistingItems(res.existing || []);
      
      if (res.missing && res.missing.length > 0) {
        setMissingItems(res.missing);
        
        // Initialize state for missing items
        const defaultCategory = categories.find(c => c.nama.toLowerCase() === 'umum') || categories[0];
        
        const initialNewData: typeof newItemsData = {};
        res.missing.forEach(name => {
          // Find original harga_beli
          const originalData = mappedData.find(d => d.nama_barang.toLowerCase() === name.toLowerCase());
          const harga_beli = originalData?.harga_beli || 0;
          
          initialNewData[name] = {
            harga_jual: Math.round(harga_beli * 1.2), // Default 20% margin
            barcode: '',
            kategori: defaultCategory?.nama || 'Umum',
            id_kategori: defaultCategory?.id || null
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
    setNewItemsData(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        [field]: value
      }
    }));
  };

  const finalizeImport = (allExistingItems: InventoryItem[]) => {
    const finalResult = mappedData.map(data => {
      const item = allExistingItems.find(e => e.nama_barang.toLowerCase().trim() === data.nama_barang.toLowerCase().trim());
      if (!item) return null;
      return {
        item,
        qty: data.qty,
        harga_beli: data.harga_beli
      };
    }).filter(Boolean) as Array<{ item: InventoryItem; qty: number; harga_beli: number }>;

    onComplete(finalResult);
  };

  const handleCreateAndComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Prepare creation payload
      const payloadToCreate = missingItems.map(name => {
        const itemData = newItemsData[name];
        const originalData = mappedData.find(d => d.nama_barang.toLowerCase() === name.toLowerCase());
        
        return {
          nama_barang: name,
          kode_barcode: itemData.barcode.trim() || undefined,
          id_kategori: itemData.id_kategori || undefined,
          harga_jual: itemData.harga_jual,
          harga_beli: originalData?.harga_beli || 0
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
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-neutral-200 dark:border-neutral-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/50">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <IconUpload size={20} />
              </div>
              Import Pembelian CSV
            </h2>
            <p className="text-sm text-neutral-500 mt-1">Impor data faktur dari supplier dengan cepat</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <IconX size={20} />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-900/50">
            <IconAlertCircle size={20} className="shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
          
          {/* STEP 1: UPLOAD & MAP */}
          {step === 1 && (
            <div className="animate-fade-in space-y-6">
              {!file ? (
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-10 flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                  <div className="w-16 h-16 bg-white dark:bg-neutral-900 rounded-full shadow-sm flex items-center justify-center mb-4 text-brand-500 border border-neutral-200 dark:border-neutral-800">
                    <IconUpload size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">Klik atau Drag & Drop file CSV</h3>
                  <p className="text-neutral-500 text-sm mt-2 text-center max-w-sm">
                    Pastikan file CSV Anda memiliki kolom untuk nama barang, jumlah (qty), dan harga beli.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconCheck className="text-brand-600 dark:text-brand-400" />
                      <div>
                        <p className="font-medium text-brand-900 dark:text-brand-100">{file.name}</p>
                        <p className="text-sm text-brand-600 dark:text-brand-400">{rawParsedData.length} baris terdeteksi</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setFile(null)}>Ganti File</Button>
                  </div>

                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Pilih Kolom (Mapping)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Kolom Nama Barang</label>
                        <select 
                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-neutral-100"
                          value={mapping.nama_barang}
                          onChange={e => setMapping(p => ({ ...p, nama_barang: e.target.value }))}
                        >
                          <option value="">-- Pilih Kolom --</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Kolom Qty</label>
                        <select 
                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-neutral-100"
                          value={mapping.qty}
                          onChange={e => setMapping(p => ({ ...p, qty: e.target.value }))}
                        >
                          <option value="">-- Pilih Kolom --</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Kolom Harga Beli</label>
                        <select 
                          className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-neutral-100"
                          value={mapping.harga_beli}
                          onChange={e => setMapping(p => ({ ...p, harga_beli: e.target.value }))}
                        >
                          <option value="">-- Pilih Kolom --</option>
                          {headers.map(h => <option key={h} value={h}>{h}</option>)}
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
            <div className="animate-fade-in h-full flex flex-col">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Review Data CSV</h3>
              <p className="text-sm text-neutral-500 mb-4">Pastikan data berikut sudah benar sebelum dilanjutkan. Hanya 10 baris pertama yang ditampilkan.</p>
              
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nama Barang</th>
                      <th className="px-4 py-3 font-medium text-right">Qty</th>
                      <th className="px-4 py-3 font-medium text-right">Harga Beli</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {mappedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="bg-white dark:bg-neutral-900">
                        <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">{row.nama_barang}</td>
                        <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">{row.qty}</td>
                        <td className="px-4 py-3 text-right text-neutral-900 dark:text-neutral-100">{formatCurrency(row.harga_beli)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedData.length > 10 && (
                <div className="text-center mt-3 text-sm text-neutral-500 font-medium">
                  ... dan {mappedData.length - 10} baris lainnya
                </div>
              )}
            </div>
          )}

          {/* STEP 3: MISSING ITEMS RESOLUTION */}
          {step === 3 && (
            <div className="animate-fade-in h-full flex flex-col">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-5">
                <h3 className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <IconAlertCircle size={20} />
                  {missingItems.length} Barang Belum Ada di Sistem
                </h3>
                <p className="text-amber-700 dark:text-amber-500 text-sm mt-1">
                  Barang-barang ini akan didaftarkan sebagai barang baru. Silakan lengkapi harga jual dan kategori jika perlu. Kosongkan barcode jika ingin dibuat otomatis.
                </p>
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex-1">
                <div className="overflow-x-auto h-full custom-scrollbar">
                  <table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-medium w-64">Nama Barang (Baru)</th>
                        <th className="px-4 py-3 font-medium text-right w-32">Harga Beli</th>
                        <th className="px-4 py-3 font-medium w-40">Kategori</th>
                        <th className="px-4 py-3 font-medium text-right w-40">Harga Jual</th>
                        <th className="px-4 py-3 font-medium w-48">Barcode (Opsional)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {missingItems.map((name) => {
                        const originalData = mappedData.find(d => d.nama_barang.toLowerCase() === name.toLowerCase());
                        const itemData = newItemsData[name];
                        
                        return (
                          <tr key={name} className="bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{name}</td>
                            <td className="px-4 py-3 text-right text-neutral-500">{formatCurrency(originalData?.harga_beli || 0)}</td>
                            <td className="px-4 py-2">
                              <select 
                                className="w-full px-2 py-1.5 bg-transparent border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-brand-500 text-neutral-900 dark:text-neutral-100"
                                value={itemData?.kategori || ''}
                                onChange={e => {
                                  const selectedCat = categories.find(c => c.nama === e.target.value);
                                  handleUpdateNewItem(name, 'kategori', e.target.value);
                                  handleUpdateNewItem(name, 'id_kategori', selectedCat?.id || null);
                                }}
                              >
                                {categories.map(c => <option key={c.id} value={c.nama}>{c.nama}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <PriceInput
                                value={itemData?.harga_jual || 0}
                                onChange={val => handleUpdateNewItem(name, 'harga_jual', val)}
                                className="w-full px-2 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg text-right"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                placeholder="Auto"
                                value={itemData?.barcode || ''}
                                onChange={e => handleUpdateNewItem(name, 'barcode', e.target.value)}
                                className="w-full px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg font-mono text-xs focus:ring-2 focus:ring-brand-500 bg-transparent text-neutral-900 dark:text-neutral-100"
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
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center mt-auto">
          <div>
            <span className="text-sm font-medium text-neutral-500">Langkah {step} dari 3</span>
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(s => (s - 1) as any)} disabled={loading}>
                Kembali
              </Button>
            )}
            
            {step === 1 && (
              <Button variant="primary" onClick={handleProcessMapping} disabled={!file} className="flex items-center gap-2">
                Lanjutkan <IconArrowRight size={18} />
              </Button>
            )}

            {step === 2 && (
              <Button variant="primary" onClick={handleIdentifyItems} disabled={loading} className="flex items-center gap-2">
                {loading ? 'Mengidentifikasi...' : 'Cek Barang'} <IconArrowRight size={18} />
              </Button>
            )}

            {step === 3 && (
              <Button variant="primary" onClick={handleCreateAndComplete} disabled={loading} className="flex items-center gap-2">
                {loading ? 'Menyimpan...' : 'Proses & Masukkan Keranjang'} <IconCheck size={18} />
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
