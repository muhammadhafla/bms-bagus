'use client';

import { useState, useEffect } from 'react';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTemplate,
  IconX,
  IconArrowDown,
} from '@tabler/icons-react';
import { AmbientLayout, Button } from '@/components/ui';
import { Portal } from '@/components/ui/Portal';
import { AdminOnly } from '@/components/role';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
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
    content_json:
      '{\n  "width_mm": 33,\n  "height_mm": 15,\n  "items": [\n    { "type": "text", "field": "name", "x": 2, "y": 2, "fontSize": 8 },\n    { "type": "text", "field": "price", "x": 2, "y": 6, "fontSize": 12, "bold": true },\n    { "type": "line", "x": 0, "y": 10, "width": 33, "thickness": 1 },\n    { "type": "logo", "x": 2, "y": 11, "width": 20 },\n    { "type": "qrcode", "field": "barcode", "x": 23, "y": 11, "size": 4 }\n  ]\n}',
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
          'Content-Type': 'application/json',
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
      content_json:
        typeof template.content_json === 'string'
          ? template.content_json
          : JSON.stringify(template.content_json, null, 2),
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
        method: 'DELETE',
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
              <IconArrowDown className="h-5 w-5 animate-bounce" />
            </div>
          }
          refreshingContent={
            <div className="flex items-center justify-center py-4">
              <div className="border-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          }
        >
          <div className="mb-4 lg:mb-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="animate-fade-in-up flex items-center gap-4">
                <IconTemplate
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Label Templates
                  </h1>
                  <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Kelola template desain cetak label barcode Anda.
                  </p>
                </div>
              </div>
              <div className="animate-fade-in-up flex w-full items-center gap-3 lg:w-auto">
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      name: '',
                      language: 'TSPL',
                      content_json:
                        '{\n  "width_mm": 33,\n  "height_mm": 15,\n  "items": [\n    { "type": "text", "field": "name", "x": 2, "y": 2, "fontSize": 8 },\n    { "type": "text", "field": "price", "x": 2, "y": 6, "fontSize": 12, "bold": true },\n    { "type": "line", "x": 0, "y": 10, "width": 33, "thickness": 1 },\n    { "type": "logo", "x": 2, "y": 11, "width": 20 },\n    { "type": "qrcode", "field": "barcode", "x": 23, "y": 11, "size": 4 }\n  ]\n}',
                      active: true,
                    });
                    setError(null);
                    setIsModalOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 shadow-sm transition-shadow hover:shadow-md lg:w-auto lg:py-2"
                >
                  <IconPlus size={20} />
                  <span className="font-medium">Tambah Template</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="animate-fade-in-up flex-1" style={{ animationDelay: '100ms' }}>
            <div className="shadow-elevated flex min-h-[400px] flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-900/60">
              <div className="flex-1 overflow-x-auto">
                {/* Desktop Table */}
                <table className="hidden w-full min-w-[800px] border-collapse text-left md:table">
                  <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                    <tr>
                      <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                        Nama Template
                      </th>
                      <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                        Bahasa
                      </th>
                      <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                        Status
                      </th>
                      <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                        Dibuat Pada
                      </th>
                      <th className="w-24 p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <tr
                          key={i}
                          className="border-b border-neutral-100 dark:border-neutral-800/50"
                        >
                          <td className="p-4">
                            <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          </td>
                          <td className="p-4">
                            <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          </td>
                          <td className="p-4">
                            <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                          </td>
                          <td className="p-4">
                            <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          </td>
                          <td className="p-4">
                            <div className="h-8 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          </td>
                        </tr>
                      ))
                    ) : templates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center">
                          <div className="flex flex-col items-center justify-center py-10 text-neutral-500 dark:text-neutral-400">
                            <IconTemplate className="mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-700" />
                            <p>Belum ada template</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      templates.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-neutral-100 text-sm transition-colors hover:bg-white/50 dark:border-neutral-800/50 dark:hover:bg-neutral-800/30"
                        >
                          <td className="p-4 font-medium text-neutral-800 dark:text-neutral-200">
                            {t.name}
                          </td>
                          <td className="p-4 font-medium text-neutral-600 dark:text-neutral-400">
                            {t.language}
                          </td>
                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm ${t.active ? 'border border-green-200 bg-green-100 text-green-800 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-400' : 'border border-gray-200 bg-gray-100 text-gray-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}
                            >
                              {t.active ? 'Aktif' : 'Tidak Aktif'}
                            </span>
                          </td>
                          <td className="p-4 text-neutral-600 dark:text-neutral-400">
                            {formatDateWIB(t.created_at)}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(t)}
                                className="text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30 rounded-lg p-2 transition-colors"
                                title="Edit"
                              >
                                <IconEdit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="text-accent-rose-600 hover:bg-accent-rose-50 dark:text-accent-rose-400 dark:hover:bg-accent-rose-900/30 rounded-lg p-2 transition-colors"
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
                <div className="flex flex-col gap-4 p-4 md:hidden">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="space-y-3 rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="h-5 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                        </div>
                        <div className="mt-2 flex justify-end gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800/50">
                          <div className="h-9 w-9 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          <div className="h-9 w-9 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                        </div>
                      </div>
                    ))
                  ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-neutral-500 dark:text-neutral-400">
                      <IconTemplate className="mb-3 h-12 w-12 text-neutral-300 dark:text-neutral-700" />
                      <p>Belum ada template</p>
                    </div>
                  ) : (
                    templates.map((t) => (
                      <div
                        key={t.id}
                        className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-100 bg-white/50 p-3 dark:border-neutral-800/50 dark:bg-neutral-900/30"
                      >
                        <div className="absolute top-4 right-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase shadow-sm ${t.active ? 'border border-green-200 bg-green-100 text-green-800 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-400' : 'border border-gray-200 bg-gray-100 text-gray-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}
                          >
                            {t.active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>

                        <div className="pr-20">
                          <h3 className="mb-1 text-base font-bold text-neutral-900 dark:text-neutral-100">
                            {t.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            <span className="flex items-center gap-1.5">
                              <IconTemplate size={14} className="text-neutral-400" /> {t.language}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700"></span>
                            <span>{formatDateWIB(t.created_at)}</span>
                          </div>
                        </div>

                        <div className="mt-1 flex justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800/50">
                          <Button
                            onClick={() => handleEdit(t)}
                            variant="secondary"
                            size="sm"
                            className="text-brand-600 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40 flex h-auto flex-1 items-center justify-center gap-1.5 rounded-lg border-transparent px-3 py-2 sm:flex-none"
                          >
                            <IconEdit size={16} /> Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(t.id)}
                            variant="secondary"
                            size="sm"
                            className="text-accent-rose-600 bg-accent-rose-50 hover:bg-accent-rose-100 dark:bg-accent-rose-900/20 dark:text-accent-rose-400 dark:hover:bg-accent-rose-900/40 flex h-auto flex-1 items-center justify-center gap-1.5 rounded-lg border-transparent px-3 py-2 sm:flex-none"
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
              <div
                className="animate-fade-in fixed inset-0 z-[100] flex items-end justify-center bg-neutral-900/60 backdrop-blur-sm sm:items-center sm:p-4"
                onClick={() => setIsModalOpen(false)}
              >
                <div
                  className="shadow-elevated animate-slide-up sm:animate-scale-in flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border-t border-neutral-200 bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:rounded-b-2xl sm:border dark:border-neutral-800 dark:bg-neutral-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-4 py-4 sm:px-6 dark:border-neutral-800 dark:bg-neutral-950/50">
                    <h2 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl dark:text-white">
                      {editingId ? 'Edit Template' : 'Tambah Template Baru'}
                    </h2>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                    >
                      <IconX size={22} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
                    <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 shadow-sm dark:border-red-800/50 dark:bg-red-900/30 dark:text-red-400">
                          {error}
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Nama Template
                        </label>
                        <input
                          type="text"
                          required
                          className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-xl border border-neutral-200/60 bg-white p-3 text-neutral-900 shadow-sm transition-all focus:ring-1 focus:outline-none dark:border-neutral-800/60 dark:bg-neutral-900 dark:text-white"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Contoh: Label Harga 33x15"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Bahasa Printer
                        </label>
                        <select
                          className="focus:border-brand-500 focus:ring-brand-500 w-full appearance-none rounded-xl border border-neutral-200/60 bg-white p-3 text-neutral-900 shadow-sm transition-all focus:ring-1 focus:outline-none dark:border-neutral-800/60 dark:bg-neutral-900 dark:text-white"
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        >
                          <option value="TSPL">TSPL (TSC / Xprinter)</option>
                          <option value="ZPL">ZPL (Zebra)</option>
                          <option value="ESC-POS">ESC-POS (Epson)</option>
                        </select>
                      </div>

                      <div className="bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800/50 rounded-xl border p-4">
                        <p className="text-brand-800 dark:text-brand-300 mb-2 flex items-center gap-2 text-sm font-semibold">
                          <span className="bg-brand-500 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white">
                            !
                          </span>
                          Panduan Koordinat
                        </p>
                        <ul className="text-brand-700 dark:text-brand-400 ml-1 list-inside list-disc space-y-1 text-xs">
                          <li>
                            Ubah nilai{' '}
                            <strong className="text-brand-900 dark:text-brand-200 font-semibold">
                              x
                            </strong>{' '}
                            menjadi lebih kecil untuk menggeser objek ke kiri.
                          </li>
                          <li>
                            Ubah nilai{' '}
                            <strong className="text-brand-900 dark:text-brand-200 font-semibold">
                              y
                            </strong>{' '}
                            menjadi lebih besar untuk menggeser objek ke bawah.
                          </li>
                          <li>
                            Koordinat ini dihitung dengan satuan milimeter (mm), menyesuaikan
                            penggaris pada template Anda.
                          </li>
                        </ul>
                      </div>

                      <div className="flex min-h-[300px] flex-1 flex-col">
                        <label className="mb-1.5 flex justify-between text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          <span>Desain JSON</span>
                          <span className="text-brand-600 dark:text-brand-400 cursor-pointer text-xs font-semibold hover:underline">
                            Format Guide
                          </span>
                        </label>
                        <textarea
                          required
                          className="focus:border-brand-500 focus:ring-brand-500 min-h-[250px] w-full flex-1 resize-y rounded-xl border border-neutral-200/60 bg-neutral-50 p-4 font-mono text-sm text-neutral-800 shadow-inner transition-all focus:ring-1 focus:outline-none dark:border-neutral-800/60 dark:bg-neutral-950 dark:text-neutral-200"
                          value={formData.content_json}
                          onChange={(e) =>
                            setFormData({ ...formData, content_json: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="pb-safe flex flex-col justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 px-4 py-4 sm:flex-row sm:gap-3 sm:px-6 dark:border-neutral-800 dark:bg-neutral-950/50">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsModalOpen(false)}
                        className="order-2 w-full sm:order-1 sm:w-auto"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={saving}
                        className="order-1 w-full sm:order-2 sm:w-auto"
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
