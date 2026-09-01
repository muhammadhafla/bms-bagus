'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconTrash,
  IconUpload,
  IconBold,
  IconItalic,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconTable,
  IconAlertTriangle,
  IconCode,
  IconKeyboard,
  IconLink,
  IconEye,
  IconEdit,
  IconSparkles,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, ConfirmDialog, PageLoadingSpinner } from '@/components/ui';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { helpDocsApi } from '@/lib/api/help-docs';
import { useAuthStore, useIsAdmin } from '@/lib/auth';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const queryClient = useQueryClient();

  const { initialized } = useAuthStore();
  const isAdminUser = useIsAdmin();

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('umum');
  const [contentMd, setContentMd] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch article if editId exists
  const { data: existingArticle, isLoading: articleLoading } = useQuery({
    queryKey: ['help-article-edit', editId],
    queryFn: () => (editId ? helpDocsApi.getById(editId) : Promise.resolve({ data: null, error: null })),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingArticle?.data) {
      const art = existingArticle.data;
      setTitle(art.title);
      setSlug(art.slug);
      setCategory(art.category || 'umum');
      setContentMd(art.content_md || '');
      setIsPublished(art.is_published ?? true);
    }
  }, [existingArticle]);

  // Auto-generate slug when title changes (only for new articles)
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editId) {
      const autoSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setSlug(autoSlug);
    }
  };

  // Insert markdown snippet at cursor
  const insertSnippet = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = contentMd.substring(start, end) || placeholder;

    const newContent = contentMd.substring(0, start) + before + selected + after + contentMd.substring(end);
    setContentMd(newContent);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 10);
  };

  // Import .md file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      toast.error('Harap pilih file dengan format .md atau .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContentMd(text);
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        handleTitleChange(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      toast.success(`File "${file.name}" berhasil diimpor`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Save Document
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Judul dokumen wajib diisi');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug URL dokumen wajib diisi');
      return;
    }
    if (!contentMd.trim()) {
      toast.error('Konten dokumen Markdown tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        // Update
        const res = await helpDocsApi.update(editId, {
          title,
          slug,
          category,
          content_md: contentMd,
          is_published: isPublished,
        });

        if (res.error) {
          toast.error(`Gagal memperbarui dokumen: ${res.error.message}`);
        } else {
          toast.success('Dokumen SOP berhasil diperbarui');
          queryClient.invalidateQueries({ queryKey: ['help-articles'] });
          queryClient.invalidateQueries({ queryKey: ['help-article', slug] });
          router.push(`/help?topic=${slug}`);
        }
      } else {
        // Create new
        const res = await helpDocsApi.create({
          title,
          slug,
          category,
          content_md: contentMd,
          is_published: isPublished,
          order_index: 10,
        });

        if (res.error) {
          toast.error(`Gagal membuat dokumen: ${res.error.message}`);
        } else {
          toast.success('Dokumen SOP baru berhasil dibuat dan dipublikasikan');
          queryClient.invalidateQueries({ queryKey: ['help-articles'] });
          router.push(`/help?topic=${slug}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Document
  const handleDelete = async () => {
    if (!editId) return;
    setIsSaving(true);
    try {
      const res = await helpDocsApi.delete(editId);
      if (res.error) {
        toast.error(`Gagal menghapus dokumen: ${res.error.message}`);
      } else {
        toast.success('Dokumen SOP berhasil dihapus');
        queryClient.invalidateQueries({ queryKey: ['help-articles'] });
        router.push('/help');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSaving(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Non-admin guard
  if (initialized && !isAdminUser) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <IconAlertTriangle size={32} />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Akses Terbatas</h2>
        <p className="text-xs text-neutral-500">
          Halaman Editor Dokumen Help hanya dapat diakses oleh akun dengan wewenang Administrator.
        </p>
        <Link
          href="/help"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700"
        >
          <IconArrowLeft size={16} />
          <span>Kembali ke Pusat Bantuan</span>
        </Link>
      </div>
    );
  }

  if (articleLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Header Controls */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Left: Back Link & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <IconArrowLeft size={15} />
              <span>Batal</span>
            </Link>

            <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 hidden sm:block" />

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white truncate">
                {editId ? 'Edit Dokumen SOP' : 'Tulis Dokumen SOP Baru'}
              </h1>
              <span className="text-[10px] text-neutral-400 block truncate">
                Format Markdown (.md) didukung penuh
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Import file .md button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".md,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <IconUpload size={14} />
              <span className="hidden sm:inline">Import .md</span>
            </button>

            {/* Delete button (if editing) */}
            {editId && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
              >
                <IconTrash size={14} />
                <span className="hidden sm:inline">Hapus</span>
              </button>
            )}

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <IconDeviceFloppy size={15} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan & Publikasikan'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Editor Form Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-6 space-y-4">
        {/* Document Metadata Form Card */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Title */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Judul Dokumen SOP / Panduan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Contoh: SOP Penanganan Retur Konsinyasi Khusus"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Kategori Dokumen
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              >
                <option value="gudang">Gudang & Logistik</option>
                <option value="kasir">Kasir & Penjualan</option>
                <option value="finance">Keuangan & Payroll</option>
                <option value="pengaturan">Pengaturan & Role</option>
                <option value="umum">Panduan Umum / Lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            {/* Slug URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                Slug URL (Identifier): <code>/help?topic={slug || 'slug-artikel'}</code>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="sop-penanganan-retur"
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-mono text-xs text-neutral-800 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              />
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-4">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Status Publikasi:
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-neutral-300 peer-checked:bg-emerald-600 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full dark:bg-neutral-700" />
                <span className="ml-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {isPublished ? 'Diterbitkan (Publik)' : 'Draf (Konsep)'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Markdown Toolbar */}
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-neutral-200/80 bg-white p-2 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
          <ToolbarButton
            icon={<IconBold size={15} />}
            title="Tebal (Bold)"
            onClick={() => insertSnippet('**', '**', 'teks tebal')}
          />
          <ToolbarButton
            icon={<IconItalic size={15} />}
            title="Miring (Italic)"
            onClick={() => insertSnippet('*', '*', 'teks miring')}
          />
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <ToolbarButton
            icon={<IconH1 size={15} />}
            title="Heading 1"
            onClick={() => insertSnippet('# ', '\n', 'Judul Besar')}
          />
          <ToolbarButton
            icon={<IconH2 size={15} />}
            title="Heading 2"
            onClick={() => insertSnippet('## ', '\n', 'Sub Judul')}
          />
          <ToolbarButton
            icon={<IconH3 size={15} />}
            title="Heading 3"
            onClick={() => insertSnippet('### ', '\n', 'Bagian')}
          />
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <ToolbarButton
            icon={<IconList size={15} />}
            title="Bullet List"
            onClick={() => insertSnippet('- ', '\n', 'Poin item')}
          />
          <ToolbarButton
            icon={<IconListNumbers size={15} />}
            title="Numbered List"
            onClick={() => insertSnippet('1. ', '\n', 'Langkah')}
          />
          <ToolbarButton
            icon={<IconTable size={15} />}
            title="Tabel Data"
            onClick={() =>
              insertSnippet(
                '\n| Kolom 1 | Kolom 2 | Kolom 3 |\n| :--- | :--- | :--- |\n| Data A | Data B | Data C |\n'
              )
            }
          />
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <ToolbarButton
            icon={<IconInfoCircle size={15} />}
            title="Kotak Catatan (Note)"
            onClick={() => insertSnippet('> [!NOTE]\n> ', '\n', 'Catatan penting di sini')}
          />
          <ToolbarButton
            icon={<IconSparkles size={15} />}
            title="Kotak Tips"
            onClick={() => insertSnippet('> [!TIP]\n> ', '\n', 'Tips operasional di sini')}
          />
          <ToolbarButton
            icon={<IconAlertTriangle size={15} />}
            title="Kotak Peringatan (Warning)"
            onClick={() => insertSnippet('> [!WARNING]\n> ', '\n', 'Peringatan SOP di sini')}
          />
          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <ToolbarButton
            icon={<IconKeyboard size={15} />}
            title="Tombol Hotkey <kbd>"
            onClick={() => insertSnippet('<kbd>', '</kbd>', 'F2')}
          />
          <ToolbarButton
            icon={<IconLink size={15} />}
            title="Tautan Internal / URL"
            onClick={() => insertSnippet('[Buka Menu](/purchasing)', '', '')}
          />
          <ToolbarButton
            icon={<IconCode size={15} />}
            title="Blok Kode"
            onClick={() => insertSnippet('```text\n', '\n```', 'kode atau teks mentah')}
          />

          {/* Mobile View Switcher */}
          <div className="ml-auto flex items-center lg:hidden bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMobileTab('editor')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeMobileTab === 'editor'
                  ? 'bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white'
                  : 'text-neutral-500'
              }`}
            >
              <IconEdit size={13} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeMobileTab === 'preview'
                  ? 'bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-white'
                  : 'text-neutral-500'
              }`}
            >
              <IconEye size={13} />
              <span>Pratinjau</span>
            </button>
          </div>
        </div>

        {/* Split-Screen Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 items-stretch min-h-[550px]">
          {/* Left Column: Markdown Input Editor */}
          <div
            className={`flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 ${
              activeMobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <span>✍️ Teks Sumber Markdown</span>
              <span>{contentMd.length} Karakter</span>
            </div>

            <textarea
              ref={textareaRef}
              value={contentMd}
              onChange={(e) => setContentMd(e.target.value)}
              placeholder="# Tulis judul artikel di sini...&#10;&#10;Tuliskan panduan langkah demi langkah menggunakan format Markdown."
              className="flex-1 w-full resize-none font-mono text-xs text-neutral-900 leading-relaxed placeholder:text-neutral-400 focus:outline-none dark:bg-transparent dark:text-white"
              rows={22}
            />
          </div>

          {/* Right Column: Live Real-time Rendered Preview */}
          <div
            className={`flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900 overflow-y-auto ${
              activeMobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
              <span>👁️ Pratinjau Tampilan</span>
              <Badge variant="info" size="sm">
                Real-Time
              </Badge>
            </div>

            <div className="flex-1">
              {contentMd.trim() ? (
                <MarkdownRenderer content={contentMd} />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-neutral-400">
                  <IconSparkles size={28} className="mb-2 text-neutral-300 dark:text-neutral-600" />
                  <span>Ketik teks di sebelah kiri untuk melihat hasil pratinjau di sini.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Hapus Dokumen SOP Ini?"
        message={`Apakah Anda yakin ingin menghapus dokumen "${title}"? Aksi ini permanen dan tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Dokumen"
        cancelLabel="Batal"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
    >
      {icon}
    </button>
  );
}

export default function EditorPage() {
  return (
    <React.Suspense fallback={<PageLoadingSpinner />}>
      <EditorContent />
    </React.Suspense>
  );
}
