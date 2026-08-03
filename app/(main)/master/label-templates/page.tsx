'use client';

import { useState, useEffect } from 'react';
import { IconPlus, IconEdit, IconTrash, IconTemplate, IconX, IconArrowDown } from '@tabler/icons-react';
import { AmbientLayout, Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { AdminOnly } from '@/components/role';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(
  () => import('react-simple-pull-to-refresh'),
  { ssr: false }
);
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/fetchApi';
import { formatDateWIB } from '@/lib/utils';

interface LabelTemplate {
  id: string;
  name: string;
  language: string;
  content_json: string;
  active: boolean;
  created_at: string;
}

export default function LabelTemplatesPage() {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    language: 'TSPL',
    content_json: '{\n  "width_mm": 33,\n  "height_mm": 15,\n  "items": [\n    { "type": "text", "field": "name", "x": 2, "y": 2, "fontSize": 8 },\n    { "type": "text", "field": "price", "x": 2, "y": 6, "fontSize": 12, "bold": true },\n    { "type": "line", "x": 0, "y": 10, "width": 33, "thickness": 1 },\n    { "type": "logo", "x": 2, "y": 11, "width": 20 },\n    { "type": "qrcode", "field": "barcode", "x": 23, "y": 11, "size": 4 }\n  ]\n}',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetchApi('/api/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      let parsedJson;
      try {
        parsedJson = JSON.parse(formData.content_json);
      } catch (e) {
        throw new Error('Format JSON tidak valid');
      }

      const url = editingId ? `/api/templates/${editingId}` : '/api/templates';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchApi(url, {
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          language: formData.language,
          content_json: parsedJson,
          active: formData.active,
        }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        fetchTemplates();
        setFormData({ ...formData, name: '' });
      } else {
        throw new Error(data.error || 'Gagal menyimpan template');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: LabelTemplate) => {
    setFormData({
      name: template.name,
      language: template.language,
      content_json: typeof template.content_json === 'string' ? template.content_json : JSON.stringify(template.content_json, null, 2),
      active: template.active,
    });
    setEditingId(template.id);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus template ini?')) {
      return;
    }
    
    try {
      const res = await fetchApi(`/api/templates/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus template');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan sistem');
    }
  };

  const handleRefresh = async () => {
    try {
      const res = await fetchApi('/api/templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <AmbientLayout>
      <AdminOnly>
      <PullToRefresh
        onRefresh={handleRefresh}
        pullingContent={
          <div className="flex items-center justify-center py-4 text-neutral-400">
            <IconArrowDown className="w-5 h-5 animate-bounce" />
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center py-4">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4 animate-fade-in-up">
            <IconTemplate className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Label Templates</h1>
              <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Kelola template desain cetak label barcode Anda.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 animate-fade-in-up w-full lg:w-auto">
            <Button
              variant="primary"
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  language: 'TSPL',
                  content_json: '{\n  "width_mm": 33,\n  "height_mm": 15,\n  "items": [\n    { "type": "text", "field": "name", "x": 2, "y": 2, "fontSize": 8 },\n    { "type": "text", "field": "price", "x": 2, "y": 6, "fontSize": 12, "bold": true },\n    { "type": "line", "x": 0, "y": 10, "width": 33, "thickness": 1 },\n    { "type": "logo", "x": 2, "y": 11, "width": 20 },\n    { "type": "qrcode", "field": "barcode", "x": 23, "y": 11, "size": 4 }\n  ]\n}',
                  active: true,
                });
                setError(null);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 rounded-xl shadow-sm hover:shadow-md transition-shadow w-full lg:w-auto py-2.5 lg:py-2"
            >
              <IconPlus size={20} />
              <span className="font-medium">Tambah Template</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 rounded-3xl shadow-elevated overflow-hidden min-h-[400px] flex flex-col">
          <div className="overflow-x-auto flex-1">
            {/* Desktop Table */}
            <table className="w-full text-left border-collapse min-w-[800px] hidden md:table">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Nama Template</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Bahasa</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Dibuat Pada</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/50">
                      <td className="p-4"><div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 py-10">
                        <IconTemplate className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-700" />
                        <p>Belum ada template</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.id} className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white/50 dark:hover:bg-neutral-800/30 transition-colors text-sm">
                      <td className="p-4 font-medium text-neutral-800 dark:text-neutral-200">{t.name}</td>
                      <td className="p-4 font-medium text-neutral-600 dark:text-neutral-400">{t.language}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${t.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700'}`}>
                          {t.active ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{formatDateWIB(t.created_at)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-2 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <IconEdit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-2 text-accent-rose-600 hover:bg-accent-rose-50 dark:text-accent-rose-400 dark:hover:bg-accent-rose-900/30 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <IconTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col p-4 gap-4">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="border border-neutral-100 dark:border-neutral-800/50 rounded-2xl p-3 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                      <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                      <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/50 mt-2">
                      <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                      <div className="h-9 w-9 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 py-10">
                  <IconTemplate className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-700" />
                  <p>Belum ada template</p>
                </div>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="bg-white/50 dark:bg-neutral-900/30 border border-neutral-100 dark:border-neutral-800/50 rounded-2xl p-3 flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wider ${t.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700'}`}>
                        {t.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    
                    <div className="pr-20">
                      <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base mb-1">{t.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        <span className="flex items-center gap-1.5"><IconTemplate size={14} className="text-neutral-400" /> {t.language}</span>
                        <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                        <span>{formatDateWIB(t.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/50 mt-1">
                      <Button 
                        onClick={() => handleEdit(t)}
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40 border-transparent h-auto rounded-lg"
                      >
                        <IconEdit size={16} /> Edit
                      </Button>
                      <Button 
                        onClick={() => handleDelete(t.id)}
                        variant="secondary"
                        size="sm"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-3 text-accent-rose-600 bg-accent-rose-50 hover:bg-accent-rose-100 dark:bg-accent-rose-900/20 dark:text-accent-rose-400 dark:hover:bg-accent-rose-900/40 border-transparent h-auto rounded-lg"
                      >
                        <IconTrash size={16} /> Hapus
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 bg-neutral-900/60 flex items-end sm:items-center justify-center z-[100] sm:p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-2xl shadow-elevated max-w-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] border-t sm:border border-neutral-200 dark:border-neutral-800 animate-slide-up sm:animate-scale-in rounded-t-2xl sm:rounded-b-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-4 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-950/50">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">{editingId ? 'Edit Template' : 'Tambah Template Baru'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <IconX size={22} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-200 dark:border-red-800/50 shadow-sm">{error}</div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Nama Template</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-neutral-900 dark:text-white"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Contoh: Label Harga 33x15"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Bahasa Printer</label>
                    <select 
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-neutral-900 dark:text-white appearance-none"
                      value={formData.language}
                      onChange={(e) => setFormData({...formData, language: e.target.value})}
                    >
                      <option value="TSPL">TSPL (TSC / Xprinter)</option>
                      <option value="ZPL">ZPL (Zebra)</option>
                      <option value="ESC-POS">ESC-POS (Epson)</option>
                    </select>
                  </div>
                  
                  <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 p-4 rounded-xl">
                    <p className="text-sm text-brand-800 dark:text-brand-300 font-semibold mb-2 flex items-center gap-2">
                      <span className="bg-brand-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">!</span>
                      Panduan Koordinat
                    </p>
                    <ul className="text-xs text-brand-700 dark:text-brand-400 list-disc list-inside space-y-1 ml-1">
                      <li>Ubah nilai <strong className="font-semibold text-brand-900 dark:text-brand-200">x</strong> menjadi lebih kecil untuk menggeser objek ke kiri.</li>
                      <li>Ubah nilai <strong className="font-semibold text-brand-900 dark:text-brand-200">y</strong> menjadi lebih besar untuk menggeser objek ke bawah.</li>
                      <li>Koordinat ini dihitung dengan satuan milimeter (mm), menyesuaikan penggaris pada template Anda.</li>
                    </ul>
                  </div>
                  
                  <div className="flex-1 min-h-[300px] flex flex-col">
                    <label className="flex text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 justify-between">
                      <span>Desain JSON</span>
                      <span className="text-xs text-brand-600 dark:text-brand-400 cursor-pointer hover:underline font-semibold">Format Guide</span>
                    </label>
                    <textarea 
                      required 
                      className="w-full flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 shadow-inner rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-neutral-800 dark:text-neutral-200 resize-y min-h-[250px]"
                      value={formData.content_json}
                      onChange={(e) => setFormData({...formData, content_json: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="px-4 sm:px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 bg-neutral-50/50 dark:bg-neutral-950/50 pb-safe">
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={saving}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      </PullToRefresh>
      </AdminOnly>
    </AmbientLayout>
  );
}
