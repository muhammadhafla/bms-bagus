'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { IconTags, IconEdit, IconTrash, IconSearch, IconPlus, IconDeviceFloppy, IconX, IconDotsVertical } from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import { toast } from "sonner";
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AmbientLayout } from '@/components/ui';
import { kategoriApi, Kategori } from '@/lib/api';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateWIB } from '@/lib/utils';

export default function KategoriPage() {
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
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null; nama: string | null }>({
    isOpen: false,
    id: null,
    nama: null
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
        setKategoris(prev => prev.map(k => k.id === editingId ? { ...k, nama: formNama } : k));
        handleCloseModal();
      }
    } else {
      const result = await kategoriApi.create(formNama);
      if (result.error) {
        toast.error('Gagal menambahkan kategori');
      } else if (result.data) {
        toast.success('Kategori berhasil ditambahkan');
        setKategoris(prev => [...prev, result.data as Kategori]);
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
      setKategoris(prev => prev.filter(k => k.id !== deleteConfirm.id));
    }
    setDeleteConfirm({ isOpen: false, id: null, nama: null });
  };

  const filteredKategoris = useMemo(() => {
    if (!searchQuery) return kategoris;
    const fuse = new Fuse(kategoris, { keys: ['nama'], threshold: 0.4 });
    return fuse.search(searchQuery).map(result => result.item);
  }, [kategoris, searchQuery]);

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-5">
            <div className="flex items-center gap-4">
              <IconTags className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Manajemen Kategori</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Kelola kategori barang</p>
              </div>
            </div>
            
            {/* Search and Action Container */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500 z-10">
                  <IconSearch size={18} />
                </div>
                <TextInput
                  placeholder="Cari kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              <AdminOnly>
                <Button variant="primary" onClick={() => handleOpenModal()} leftIcon={<IconPlus size={18} />} className="shrink-0">
                  <span className="hidden sm:inline">Tambah Kategori</span>
                  <span className="sm:hidden">Tambah</span>
                </Button>
              </AdminOnly>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="h-full custom-scrollbar overflow-y-auto">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-[1fr_200px_100px] gap-4 p-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
              <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Kategori</div>
              <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Dibuat Pada</div>
              <div className="text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</div>
            </div>
            
            {/* List */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 grid md:grid-cols-[1fr_200px_100px] gap-4 items-center">
                    <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="hidden md:block h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="hidden md:block h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" />
                  </div>
                ))
              ) : filteredKategoris.length === 0 ? (
                <div className="p-12 text-center text-neutral-500">
                  {searchQuery ? 'Kategori tidak ditemukan' : 'Tidak ada kategori'}
                </div>
              ) : (
                filteredKategoris.map(kategori => (
                  <div key={kategori.id} className="p-4 flex md:grid md:grid-cols-[1fr_200px_100px] gap-3 md:gap-4 items-start md:items-center hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{kategori.nama}</div>
                      {/* Mobile Date */}
                      <div className="md:hidden text-xs text-neutral-500 mt-1">
                        Dibuat pada: {formatDateWIB(kategori.created_at)}
                      </div>
                    </div>
                    
                    {/* Desktop Date */}
                    <div className="hidden md:block text-sm text-neutral-500 whitespace-nowrap">
                      {formatDateWIB(kategori.created_at)}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center md:justify-center shrink-0">
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
                            className="p-2 -m-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 btn-press transition-colors"
                            title="Opsi"
                          >
                            <IconDotsVertical className="w-5 h-5" />
                          </button>
                          
                          {openActionId === kategori.id && (
                            <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg animate-fade-in-up">
                              <button
                                onClick={() => { handleOpenModal(kategori); setOpenActionId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                              >
                                <IconEdit className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm({ isOpen: true, id: kategori.id, nama: kategori.nama }); setOpenActionId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                              >
                                <IconTrash className="w-4 h-4" /> Hapus
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
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
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
    </AmbientLayout>
  );
}
