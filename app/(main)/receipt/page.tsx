'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { receiptApi, ReceiptTemplate, ReceiptLogo } from '@/lib/api';
import { IconReceipt } from '@tabler/icons-react';
import Header from '@/components/ui/Header';

export default function ReceiptPage() {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ReceiptTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<'SALE' | 'RETURN'>('SALE');
  const [headerLines, setHeaderLines] = useState<string[]>([]);
  const [footerLines, setFooterLines] = useState<string[]>([]);
  const [showDiscount, setShowDiscount] = useState(false);
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPath, setLogoPath] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesResult, activeResult] = await Promise.all([
        receiptApi.getAllTemplates(),
        receiptApi.getActiveTemplate(),
      ]);

      if (templatesResult.error) {
        setError('Gagal memuat template');
      } else {
        setTemplates(templatesResult.data || []);
      }

      if (activeResult.data) {
        setActiveTemplate(activeResult.data);
        setSelectedTemplate(activeResult.data);
        setName(activeResult.data.name);
        setType(activeResult.data.type);
        setHeaderLines(activeResult.data.template?.header || []);
        setFooterLines(activeResult.data.template?.footer || []);
        setShowDiscount(activeResult.data.template?.body?.show_discount || false);
        setLogoEnabled(activeResult.data.template?.logo?.enabled || false);
        setLogoPath(activeResult.data.template?.logo?.path || '');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectTemplate = useCallback((template: ReceiptTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setType(template.type);
    setHeaderLines(template.template?.header || []);
    setFooterLines(template.template?.footer || []);
    setShowDiscount(template.template?.body?.show_discount || false);
    setLogoEnabled(template.template?.logo?.enabled || false);
    setLogoPath(template.template?.logo?.path || '');
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!name.trim()) {
      setError('Nama template wajib diisi');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const templateData = {
      header: headerLines.filter(line => line.trim()),
      body: { show_discount: showDiscount },
      footer: footerLines.filter(line => line.trim()),
      logo: {
        enabled: logoEnabled,
        mode: 'bitmap' as const,
        path: logoPath,
        bucket: 'assets'
      }
    };

    try {
      if (selectedTemplate) {
        const result = await receiptApi.updateTemplate(selectedTemplate.id, {
          name: name.trim(),
          template: templateData
        });

        if (result.error) {
          setError('Gagal mengupdate template');
        } else {
          setSuccess('Template berhasil diupdate');
          loadData();
        }
      } else {
        const result = await receiptApi.createTemplate({
          name: name.trim(),
          type: type,
          template: templateData
        });

        if (result.error) {
          setError('Gagal membuat template');
        } else {
          setSuccess('Template berhasil dibuat');
          loadData();
        }
      }
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  }, [name, headerLines, footerLines, showDiscount, logoEnabled, logoPath, type, selectedTemplate, loadData]);

  const handleSetActive = useCallback(async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      const result = await receiptApi.setActiveTemplate(selectedTemplate.id);
      if (result.error) {
        setError('Gagal mengaktifkan template');
      } else {
        setSuccess('Template diaktifkan');
        setActiveTemplate(result.data);
        loadData();
      }
    } catch (err) {
      console.error('Error activating template:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate, loadData]);

  const handleDeleteTemplate = useCallback(async () => {
    if (!selectedTemplate) return;

    if (!confirm('Yakin hapus template?')) return;

    setLoading(true);
    try {
      const result = await receiptApi.deleteTemplate(selectedTemplate.id);
      if (result.error) {
        setError('Gagal menghapus template');
      } else {
        setSuccess('Template dihapus');
        setSelectedTemplate(null);
        setName('');
        setType('SALE');
        setHeaderLines([]);
        setFooterLines([]);
        setShowDiscount(true);
        setLogoEnabled(false);
        setLogoPath('');
        loadData();
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplate, loadData]);

  const handleUploadLogo = useCallback(async () => {
    if (!logoFile) return;

    setLogoUploading(true);
    try {
      const result = await receiptApi.uploadLogo(logoFile);
      if (result.error) {
        setError('Gagal upload logo');
      } else if (result.data) {
        setLogoPath(result.data.path);
        setLogoEnabled(true);
        setSuccess('Logo berhasil diupload');
        setLogoFile(null);
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLogoUploading(false);
    }
  }, [logoFile]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <Header title="Struk" />
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-md">
            <IconReceipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pengaturan Struk</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Template & logo receipt</p>
          </div>
        </div>
        {error && <div className="mt-3 p-3 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200 rounded-lg text-sm border border-red-100 dark:border-red-800">{error}</div>}
        {success && <div className="mt-3 p-3 bg-green-50 dark:bg-emerald-950 text-green-600 dark:text-emerald-200 rounded-lg text-sm border border-green-100 dark:border-emerald-800">{success}</div>}
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-4 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">Template Struk</h2>
              <div className="space-y-2 mb-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id ? 'border-brand-500 bg-brand-50' : 'border-neutral-100 hover:border-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900">{template.name}</span>
                      {activeTemplate?.id === template.id && (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Aktif</span>
                      )}
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-neutral-500 text-sm">Belum ada template</p>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setName('');
                  setType('SALE');
                  setHeaderLines([]);
                  setFooterLines([]);
                  setShowDiscount(true);
                  setLogoEnabled(false);
                  setLogoPath('');
                }}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                + Template Baru
              </button>
            </div>

             <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
               <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">Logo</h2>
               <div className="space-y-4">
                 <label className="flex items-center gap-2">
                   <input 
                     type="checkbox" 
                     checked={logoEnabled} 
                     onChange={(e) => setLogoEnabled(e.target.checked)} 
                     className="w-4 h-4"
                   />
                   <span className="text-sm font-medium">Tampilkan logo</span>
                 </label>
                 
                 <div className="flex gap-2">
                   <input
                     type="file"
                     accept="image/*"
                     onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                     className="flex-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100"
                   />
                   <button
                     onClick={handleUploadLogo}
                     disabled={!logoFile || logoUploading}
                     className="px-5 py-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 text-sm font-medium shadow-md transition-all"
                   >
                     {logoUploading ? '...' : 'Upload'}
                   </button>
                 </div>
                 
                 {logoPath && (
                   <div className="border rounded-xl p-3 bg-neutral-50 dark:bg-neutral-950">
                     <p className="text-xs text-neutral-500 mb-2">Path logo: {logoPath}</p>
                     <Image 
                       src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/${logoPath}`} 
                       alt="Logo preview" 
                       width={128} 
                       height={128} 
                       className="object-contain mx-auto"
                     />
                   </div>
                 )}
               </div>
             </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 mb-4">
              {selectedTemplate ? 'Edit Template' : 'Template Baru'}
            </h2>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-neutral-700 mb-2">Nama</label>
                 <input
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                   placeholder="Default"
                 />
               </div>
               
               {!selectedTemplate && (
                 <div>
                   <label className="block text-sm font-semibold text-neutral-700 mb-2">Tipe</label>
                   <select 
                     value={type} 
                     onChange={(e) => {
                       setType(e.target.value as 'SALE' | 'RETURN');
                       setShowDiscount(e.target.value === 'SALE');
                     }}
                     className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                   >
                     <option value="SALE">Penjualan (SALE)</option>
                     <option value="RETURN">Pengembalian (RETURN)</option>
                   </select>
                 </div>
               )}

               <div>
                 <label className="block text-sm font-semibold text-neutral-700 mb-2">Header (setiap baris baru)</label>
                 <textarea
                   value={headerLines.join('\n')}
                   onChange={(e) => setHeaderLines(e.target.value.split('\n'))}
                   rows={4}
                   className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all font-mono text-sm"
                   placeholder="TOKO ABC
Jl. Contoh No.1
------------------------"
                 />
               </div>

               <div>
                 <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                   <input 
                     type="checkbox" 
                     checked={showDiscount} 
                     onChange={(e) => setShowDiscount(e.target.checked)} 
                     className="w-4 h-4"
                   />
                   Tampilkan diskon pada item
                 </label>
               </div>

               <div>
                 <label className="block text-sm font-semibold text-neutral-700 mb-2">Footer (setiap baris baru)</label>
                 <textarea
                   value={footerLines.join('\n')}
                   onChange={(e) => setFooterLines(e.target.value.split('\n'))}
                   rows={4}
                   className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all font-mono text-sm"
                   placeholder="Terima kasih
Silahkan datang lagi"
                 />
               </div>

               <div className="border-t border-neutral-200 pt-4">
                 <h3 className="text-sm font-semibold text-neutral-700 mb-2">Preview</h3>
                 <div className="bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-xs font-mono text-neutral-900 dark:text-neutral-100 max-w-xs mx-auto">
                   {logoEnabled && logoPath && (
                     <div className="text-center mb-2">
                       <Image 
                         src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/${logoPath}`} 
                         alt="Logo" 
                         width={64} 
                         height={64} 
                         className="object-contain mx-auto"
                       />
                     </div>
                   )}
                   
                   <div className="border-b border-neutral-300 pb-2 mb-2 text-center">
                     {headerLines.length > 0 ? (
                       headerLines.map((line, i) => <div key={i}>{line}</div>)
                     ) : (
                       <>
                         <div className="font-bold">TOKO ABC</div>
                         <div>Jl. Contoh No.1</div>
                         <div>------------------------</div>
                       </>
                     )}
                   </div>
                   
                   <div className="space-y-1 my-2">
                     <div className="flex justify-between">
                       <span>Item 1</span>
                       <span>15,000</span>
                     </div>
                     {showDiscount && (
                       <div className="flex justify-between text-neutral-500 text-[10px]">
                         <span>  Diskon 10%</span>
                         <span>-1,500</span>
                       </div>
                     )}
                     <div className="flex justify-between">
                       <span>Item 2</span>
                       <span>20,000</span>
                     </div>
                   </div>
                   
                   <div className="border-t border-neutral-300 pt-2 mt-2">
                     <div className="flex justify-between font-bold">
                       <span>{type === 'RETURN' ? 'TOTAL REFUND' : 'TOTAL'}</span>
                       <span>{type === 'RETURN' ? '-33,500' : '33,500'}</span>
                     </div>
                     {type === 'SALE' && (
                       <>
                         <div className="flex justify-between mt-1">
                           <span>BAYAR</span>
                           <span>35,000</span>
                         </div>
                         <div className="flex justify-between">
                           <span>KEMBALI</span>
                           <span>1,500</span>
                         </div>
                       </>
                     )}
                   </div>
                   
                   {footerLines.length > 0 && (
                     <div className="border-t border-neutral-300 pt-2 mt-2 text-center">
                       {footerLines.map((line, i) => <div key={i}>{line}</div>)}
                     </div>
                   )}
                 </div>
               </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 font-medium shadow-md transition-all"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
                {selectedTemplate && (
                  <>
                    <button
                      onClick={handleSetActive}
                      disabled={loading || activeTemplate?.id === selectedTemplate.id}
                      className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 font-medium shadow-md transition-all"
                    >
                      Aktifkan
                    </button>
                    <button
                      onClick={handleDeleteTemplate}
                      disabled={loading}
                      className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 font-medium shadow-md transition-all"
                    >
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
