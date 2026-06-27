'use client';

import { useState, useEffect, useCallback } from 'react';
import { IconTags, IconEdit, IconTrash, IconRefresh, IconPlus, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { AdminOnly } from '@/components/role';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AmbientLayout } from '@/components/ui';
import { kategoriApi, Kategori } from '@/lib/api';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export default function KategoriPage() {
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState('');
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null; nama: string | null }>({
    isOpen: false,
    id: null,
    nama: null
  });
  
  const { showToast } = useToast();

  const fetchKategoris = useCallback(async () => {
    setLoading(true);
    const result = await kategoriApi.getAll();
    if (result.error) {
      showToast('Gagal memuat data kategori', 'error');
    } else {
      setKategoris(result.data || []);
    }
    setLoading(false);
  }, [showToast]);

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
      showToast('Nama kategori tidak boleh kosong', 'error');
      return;
    }

    if (editingId) {
      const result = await kategoriApi.update(editingId, formNama);
      if (result.error) {
        showToast('Gagal memperbarui kategori', 'error');
      } else {
        showToast('Kategori berhasil diperbarui', 'success');
        setKategoris(prev => prev.map(k => k.id === editingId ? { ...k, nama: formNama } : k));
        handleCloseModal();
      }
    } else {
      const result = await kategoriApi.create(formNama);
      if (result.error) {
        showToast('Gagal menambahkan kategori', 'error');
      } else if (result.data) {
        showToast('Kategori berhasil ditambahkan', 'success');
        setKategoris(prev => [...prev, result.data as Kategori]);
        handleCloseModal();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;

    const result = await kategoriApi.delete(deleteConfirm.id);
    if (result.error) {
      showToast('Gagal menghapus kategori', 'error');
    } else {
      showToast('Kategori berhasil dihapus', 'success');
      setKategoris(prev => prev.filter(k => k.id !== deleteConfirm.id));
    }
    setDeleteConfirm({ isOpen: false, id: null, nama: null });
  };

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconTags className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Manajemen Kategori</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Kelola kategori barang</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchKategoris}
                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm rounded-xl hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-colors"
              >
                <IconRefresh className="w-4 h-4" />
                Refresh
              </button>
              
              <AdminOnly>
                <Button variant="primary" onClick={() => handleOpenModal()} leftIcon={<IconPlus size={18} />}>
                  Tambah Kategori
                </Button>
              </AdminOnly>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl shadow-elevated mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="overflow-x-auto h-full custom-scrollbar">
            <table className="w-full min-w-[600px]">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md sticky top-0 z-10 border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nama Kategori</th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400">Dibuat Pada</th>
                  <th className="px-5 py-4 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mx-auto" /></td>
                    </tr>
                  ))
                ) : kategoris.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-neutral-500">
                      Tidak ada kategori
                    </td>
                  </tr>
                ) : (
                  kategoris.map(kategori => (
                    <tr key={kategori.id} className="hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-5 py-4 font-medium text-neutral-900 dark:text-neutral-100">{kategori.nama}</td>
                      <td className="px-5 py-4 text-sm text-neutral-500">
                        {new Date(kategori.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <AdminOnly>
                            <button
                              onClick={() => handleOpenModal(kategori)}
                              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 btn-press transition-colors"
                            >
                              <IconEdit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, id: kategori.id, nama: kategori.nama })}
                              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 btn-press transition-colors"
                            >
                              <IconTrash className="w-5 h-5" />
                            </button>
                          </AdminOnly>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Edit Kategori' : 'Tambah Kategori'}
        size="sm"
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
          <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              variant="secondary"
              onClick={handleCloseModal}
              className="flex-1"
              leftIcon={<IconX size={18} />}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="flex-1"
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
