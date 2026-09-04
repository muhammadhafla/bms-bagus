'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import {
  IconTags,
  IconEdit,
  IconTrash,
  IconSearch,
  IconPlus,
  IconDeviceFloppy,
  IconX,
  IconDotsVertical,
  IconArrowDown,
} from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AmbientLayout } from '@/components/ui';
import { kategoriApi, Kategori } from '@/lib/api';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateWIB } from '@/lib/utils';

export default function KategoriPage() {
  const queryClient = useQueryClient();
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenActionId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string | null;
    nama: string | null;
  }>({
    isOpen: false,
    id: null,
    nama: null,
  });

  const fetchKategoris = useCallback(async () => {
    setLoading(true);
    const result = await kategoriApi.getAll();
    if (result.error) {
      toast.error('Gagal memuat data kategori');
    } else {
      setKategoris(result.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKategoris();
  }, [fetchKategoris]);

  const handleOpenModal = (kategori?: Kategori) => {
    if (kategori) {
      setEditingId(kategori.id);
      setFormNama(kategori.nama);
    } else {
      setEditingId(null);
      setFormNama('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormNama('');
  };

  const handleSave = async () => {
    if (!formNama.trim()) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    if (editingId) {
      const result = await kategoriApi.update(editingId, formNama);
      if (result.error) {
        toast.error('Gagal memperbarui kategori');
      } else {
        toast.success('Kategori berhasil diperbarui');
        setKategoris((prev) =>
          prev.map((k) => (k.id === editingId ? { ...k, nama: formNama } : k)),
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.kategori.all });
        queryClient.invalidateQueries({ queryKey: ['kategoris'] });
        queryClient.invalidateQueries({ queryKey: ['kategori-list'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        handleCloseModal();
      }
    } else {
      const result = await kategoriApi.create(formNama);
      if (result.error) {
        toast.error('Gagal menambahkan kategori');
      } else if (result.data) {
        toast.success('Kategori berhasil ditambahkan');
        setKategoris((prev) => [...prev, result.data as Kategori]);
        queryClient.invalidateQueries({ queryKey: queryKeys.kategori.all });
        queryClient.invalidateQueries({ queryKey: ['kategoris'] });
        queryClient.invalidateQueries({ queryKey: ['kategori-list'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        handleCloseModal();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;

    const result = await kategoriApi.delete(deleteConfirm.id);
    if (result.error) {
      toast.error('Gagal menghapus kategori');
    } else {
      toast.success('Kategori berhasil dihapus');
      setKategoris((prev) => prev.filter((k) => k.id !== deleteConfirm.id));
      queryClient.invalidateQueries({ queryKey: queryKeys.kategori.all });
      queryClient.invalidateQueries({ queryKey: ['kategoris'] });
      queryClient.invalidateQueries({ queryKey: ['kategori-list'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    }
    setDeleteConfirm({ isOpen: false, id: null, nama: null });
  };

  const filteredKategoris = useMemo(() => {
    if (!searchQuery) return kategoris;
    const fuse = new Fuse(kategoris, { keys: ['nama'], threshold: 0.4 });
    return fuse.search(searchQuery).map((result) => result.item);
  }, [kategoris, searchQuery]);

  const handleRefresh = async () => {
    const result = await kategoriApi.getAll();
    if (!result.error) {
      setKategoris(result.data || []);
    }
  };

  return (
    <AmbientLayout>
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
        <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)] lg:min-h-0">
          <div className="animate-fade-in-up mb-4 flex-shrink-0 lg:mb-6">
            <div className="mb-4 flex flex-col gap-4 lg:mb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <IconTags className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8" stroke={1.5} />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Manajemen Kategori
                  </h1>
                  <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Kelola kategori barang
                  </p>
                </div>
              </div>

              {/* Search and Action Container */}
              <div className="flex w-full items-center gap-3 lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-neutral-500">
                    <IconSearch size={18} />
                  </div>
                  <TextInput
                    placeholder="Cari kategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>

                <AdminOnly>
                  <Button
                    variant="primary"
                    onClick={() => handleOpenModal()}
                    leftIcon={<IconPlus size={18} />}
                    className="shrink-0"
                  >
                    <span className="hidden sm:inline">Tambah Kategori</span>
                    <span className="sm:hidden">Tambah</span>
                  </Button>
                </AdminOnly>
              </div>
            </div>
          </div>

          <div
            className="shadow-elevated animate-fade-in-up mb-6 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60"
            style={{ animationDelay: '100ms' }}
          >
            <div className="custom-scrollbar h-full overflow-y-auto">
              {/* Desktop Header */}
              <div className="sticky top-0 z-10 hidden grid-cols-[1fr_200px_100px] gap-4 border-b border-neutral-200/50 bg-white/50 p-4 backdrop-blur-md md:grid dark:border-neutral-800/50 dark:bg-neutral-950/50">
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Nama Kategori
                </div>
                <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Dibuat Pada
                </div>
                <div className="text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Aksi
                </div>
              </div>

              {/* List */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="grid items-center gap-4 p-4 md:grid-cols-[1fr_200px_100px]"
                    >
                      <div className="h-5 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="hidden h-5 w-24 animate-pulse rounded bg-neutral-200 md:block dark:bg-neutral-700" />
                      <div className="mx-auto hidden h-8 w-20 animate-pulse rounded bg-neutral-200 md:block dark:bg-neutral-700" />
                    </div>
                  ))
                ) : filteredKategoris.length === 0 ? (
                  <div className="p-12 text-center text-neutral-500">
                    {searchQuery ? 'Kategori tidak ditemukan' : 'Tidak ada kategori'}
                  </div>
                ) : (
                  filteredKategoris.map((kategori) => (
                    <div
                      key={kategori.id}
                      className="flex items-start gap-3 p-4 transition-colors hover:bg-white/50 md:grid md:grid-cols-[1fr_200px_100px] md:items-center md:gap-4 dark:hover:bg-neutral-800/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                          {kategori.nama}
                        </div>
                        {/* Mobile Date */}
                        <div className="mt-1 text-xs text-neutral-500 md:hidden">
                          Dibuat pada: {formatDateWIB(kategori.created_at)}
                        </div>
                      </div>

                      {/* Desktop Date */}
                      <div className="hidden text-sm whitespace-nowrap text-neutral-500 md:block">
                        {formatDateWIB(kategori.created_at)}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center md:justify-center">
                        <AdminOnly>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (e.nativeEvent) {
                                  e.nativeEvent.stopImmediatePropagation();
                                }
                                setOpenActionId(openActionId === kategori.id ? null : kategori.id);
                              }}
                              className="btn-press -m-2 rounded-xl p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                              title="Opsi"
                            >
                              <IconDotsVertical className="h-5 w-5" />
                            </button>

                            {openActionId === kategori.id && (
                              <div className="animate-fade-in-up absolute top-full right-0 z-50 mt-2 min-w-[140px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                                <button
                                  onClick={() => {
                                    handleOpenModal(kategori);
                                    setOpenActionId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                >
                                  <IconEdit className="h-4 w-4" /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirm({
                                      isOpen: true,
                                      id: kategori.id,
                                      nama: kategori.nama,
                                    });
                                    setOpenActionId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                  <IconTrash className="h-4 w-4" /> Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        </AdminOnly>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingId ? 'Edit Kategori' : 'Tambah Kategori'}
          size="sm"
          isBottomSheetOnMobile
        >
          <div className="space-y-4">
            <TextInput
              label="Nama Kategori"
              value={formNama}
              onChange={(e) => setFormNama(e.target.value)}
              placeholder="Masukkan nama kategori"
              required
              autoFocus
            />
            <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <Button
                variant="primary"
                onClick={handleSave}
                className="w-full"
                leftIcon={<IconDeviceFloppy size={18} />}
              >
                Simpan
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Hapus Kategori"
          message={`Apakah Anda yakin ingin menghapus kategori "${deleteConfirm.nama}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm({ isOpen: false, id: null, nama: null })}
          danger
        />
      </PullToRefresh>
    </AmbientLayout>
  );
}
