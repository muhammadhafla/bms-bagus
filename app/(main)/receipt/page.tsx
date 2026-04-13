'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { receiptApi, ReceiptTemplate, ReceiptLogo } from '@/lib/api';
import { IconReceipt } from '@tabler/icons-react';
import Header from '@/components/ui/Header';

export default function ReceiptPage() {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [logos, setLogos] = useState<ReceiptLogo[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ReceiptTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReceiptTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<'SALE' | 'RETURN'>('SALE');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [templatesResult, logosResult, activeResult] = await Promise.all([
        receiptApi.getAllTemplates(),
        receiptApi.getAllLogos(),
        receiptApi.getActiveTemplate(),
      ]);

      if (templatesResult.error) {
        setError('Gagal memuat template');
      } else {
        setTemplates(templatesResult.data || []);
      }

      if (logosResult.error) {
        setError('Gagal memuat logo');
      } else {
        setLogos(logosResult.data || []);
      }

      if (activeResult.data) {
        setActiveTemplate(activeResult.data);
        setSelectedTemplate(activeResult.data);
        setName(activeResult.data.name);
        setHeaderText(activeResult.data.header_text || '');
        setFooterText(activeResult.data.footer_text || '');
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
    setHeaderText(template.header_text || '');
    setFooterText(template.footer_text || '');
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!name.trim()) {
      setError('Nama template wajib diisi');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (selectedTemplate) {
        const result = await receiptApi.updateTemplate(selectedTemplate.id, {
          name: name.trim(),
          header_text: headerText,
          footer_text: footerText,
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
          header_text: headerText,
          footer_text: footerText,
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
  }, [name, headerText, footerText, type, selectedTemplate, loadData]);

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
        setHeaderText('');
        setFooterText('');
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
      } else {
        setSuccess('Logo berhasil diupload');
        setLogoFile(null);
        loadData();
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Terjadi kesalahan');
    } finally {
      setLogoUploading(false);
    }
  }, [logoFile, loadData]);

  const handleDeleteLogo = useCallback(async (id: string) => {
    if (!confirm('Yakin hapus logo?')) return;

    try {
      const result = await receiptApi.deleteLogo(id);
      if (result.error) {
        setError('Gagal menghapus logo');
      } else {
        setSuccess('Logo dihapus');
        loadData();
      }
    } catch (err) {
      console.error('Error deleting logo:', err);
      setError('Terjadi kesalahan');
    }
  }, [loadData]);

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
                  setHeaderText('');
                  setFooterText('');
                }}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                + Template Baru
              </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">Logo</h2>
              <div className="flex gap-2 mb-4">
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
              <div className="grid grid-cols-3 gap-3">
                {logos.map((logo) => (
                  <div key={logo.id} className="border-2 border-neutral-100 dark:border-neutral-800 rounded-xl p-2 relative group hover:shadow-md transition-all bg-white dark:bg-neutral-950">
                    <div className="relative aspect-square">
                      <Image src={logo.image_url} alt={logo.name} fill className="object-contain" />
                    </div>
                    <button
                      onClick={() => handleDeleteLogo(logo.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {logos.length === 0 && (
                  <p className="text-neutral-500 text-sm col-span-3">Belum ada logo</p>
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
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Header</label>
                <textarea
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all"
                  placeholder="Nama toko, alamat, telepon"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Footer</label>
                <textarea
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-all"
                  placeholder="Terima kasih..."
                />
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <h3 className="text-sm font-semibold text-neutral-700 mb-2">Preview</h3>
                <div className="bg-neutral-50 dark:bg-neutral-950 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">
                  {headerText ? (
                    <div className="border-b-2 border-neutral-300 pb-2 mb-2 text-center">{headerText}</div>
                  ) : (
                    <div className="border-b-2 border-neutral-300 pb-2 mb-2">
                      <p className="font-bold text-center">TOKO SAYA</p>
                      <p className="text-center">Jl. Contoh No. 123</p>
                      <p className="text-center">Telp: 081234567890</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Item 1</span>
                      <span>10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Item 2</span>
                      <span>20,000</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-neutral-300 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>TOTAL</span>
                      <span>30,000</span>
                    </div>
                  </div>
                  {footerText ? (
                    <div className="border-t-2 border-neutral-300 pt-2 mt-2 text-center">{footerText}</div>
                  ) : (
                    <div className="border-t-2 border-neutral-300 pt-2 mt-2 text-center">
                      <p>Terima kasih</p>
                      <p>Silahkan datang lagi</p>
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
