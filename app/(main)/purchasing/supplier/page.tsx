'use client';
import { toast } from 'sonner';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/lib/auth';
import { supplierApi, Supplier } from '@/lib/api/supplier';
import {
  IconTruck,
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconLoader2,
  IconInbox,
  IconX,
  IconDeviceFloppy,
  IconDotsVertical,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Button,
  DataTable,
  Modal,
  TextInput,
  TextareaInput,
  Pagination,
  ConfirmDialog,
} from '@/components/ui';
import { AdminOnly } from '@/components/role';

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search, Sorting, and Pagination
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('nama');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formKontak, setFormKontak] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formError, setFormError] = useState<{ nama?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenActionId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // Role Auth Checks
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const initialized = useAuthStore((state) => state.initialized);
  const showAdminActions = initialized && (profile?.role?.toLowerCase() === 'admin' || isAdmin());

  // Fetch data
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await supplierApi.getAll();
    if (result.error) {
      setError(result.error.message || 'Gagal memuat data supplier');
      toast.error('Gagal memuat data supplier');
    } else {
      setSuppliers(result.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Handle Sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // Filter & Sort logic
  const filteredAndSorted = useMemo(() => {
    let result = [...suppliers];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          (s.kontak && s.kontak.toLowerCase().includes(q)) ||
          (s.alamat && s.alamat.toLowerCase().includes(q))
      );
    }

    if (sortKey) {
      result.sort((a, b) => {
        const valA = String((a as import('@/types').Supplier)[sortKey as keyof import('@/types').Supplier] || '').toLowerCase();
        const valB = String((b as import('@/types').Supplier)[sortKey as keyof import('@/types').Supplier] || '').toLowerCase();
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [suppliers, search, sortKey, sortDirection]);

  // Paginated Data
  const paginatedSuppliers = useMemo(() => {
    const start = (page - 1) * LIMIT;
    return filteredAndSorted.slice(start, start + LIMIT);
  }, [filteredAndSorted, page]);

  const totalPages = Math.ceil(filteredAndSorted.length / LIMIT) || 1;

  // Open modal for add
  const handleAddClick = () => {
    setSelectedSupplier(null);
    setFormNama('');
    setFormKontak('');
    setFormAlamat('');
    setFormError({});
    setModalOpen(true);
  };

  // Open modal for edit
  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormNama(supplier.nama);
    setFormKontak(supplier.kontak || '');
    setFormAlamat(supplier.alamat || '');
    setFormError({});
    setModalOpen(true);
  };

  // Submit Modal
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError({});

    const namaTrimmed = formNama.trim();
    if (!namaTrimmed) {
      setFormError({ nama: 'Nama supplier harus diisi' });
      return;
    }

    setIsSaving(true);
    const data = {
      nama: namaTrimmed,
      kontak: formKontak.trim() || undefined,
      alamat: formAlamat.trim() || undefined,
    };

    if (selectedSupplier) {
      // Edit
      const result = await supplierApi.update(selectedSupplier.id, data);
      if (result.error) {
        const msg = result.error.message?.includes('duplicate')
          ? 'Nama supplier sudah terdaftar'
          : result.error.message || 'Gagal mengubah data supplier';
        toast.error(msg);
      } else if (result.data) {
        toast.success('Supplier berhasil diperbarui');
        setSuppliers((prev) =>
          prev.map((s) => (s.id === selectedSupplier.id ? result.data! : s))
        );
        setModalOpen(false);
      }
    } else {
      // Create
      const result = await supplierApi.create(data);
      if (result.error) {
        const msg = result.error.message?.includes('duplicate')
          ? 'Nama supplier sudah terdaftar'
          : result.error.message || 'Gagal menambahkan supplier';
        toast.error(msg);
      } else if (result.data) {
        toast.success('Supplier berhasil ditambahkan');
        setSuppliers((prev) => [result.data!, ...prev]);
        setModalOpen(false);
      }
    }
    setIsSaving(false);
  };

  // Open delete confirmation
  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    
    const result = await supplierApi.delete(supplierToDelete.id);
    if (result.error) {
      toast.error(result.error.message || 'Gagal menghapus supplier');
    } else {
      toast.success('Supplier berhasil dihapus');
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierToDelete.id));
      // Adjust page if page becomes empty
      const updatedTotalItems = filteredAndSorted.length - 1;
      const maxPage = Math.ceil(updatedTotalItems / LIMIT) || 1;
      if (page > maxPage) {
        setPage(maxPage);
      }
    }
    setDeleteConfirmOpen(false);
    setSupplierToDelete(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const columns = [
    {
      key: 'nama',
      header: 'Nama Supplier',
      sortable: true,
      render: (item: Supplier) => (
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {item.nama}
        </span>
      ),
    },
    {
      key: 'kontak',
      header: 'Kontak',
      sortable: true,
      render: (item: Supplier) =>
        item.kontak ? (
          <span className="text-neutral-700 dark:text-neutral-300 font-mono">
            {item.kontak}
          </span>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-600">-</span>
        ),
    },
    {
      key: 'alamat',
      header: 'Alamat',
      sortable: true,
      render: (item: Supplier) =>
        item.alamat ? (
          <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-xs block">
            {item.alamat}
          </span>
        ) : (
          <span className="text-neutral-400 dark:text-neutral-600">-</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Tanggal Terdaftar',
      sortable: true,
      render: (item: Supplier) => (
        <span className="text-neutral-500 dark:text-neutral-400 text-sm">
          {formatDate(item.created_at)}
        </span>
      ),
    },
    ...(showAdminActions
      ? [
          {
            key: 'aksi',
            header: 'Aksi',
            align: 'center' as const,
            render: (item: Supplier) => (
              <div className="flex justify-center gap-1">
                <button
                  onClick={() => handleEditClick(item)}
                  className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  title="Ubah Supplier"
                >
                  <IconEdit size={18} stroke={2} />
                </button>
                <button
                  onClick={() => handleDeleteClick(item)}
                  className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30 transition-colors"
                  title="Hapus Supplier"
                >
                  <IconTrash size={18} stroke={2} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <AmbientLayout>
      <AdminOnly>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        {/* Header Section */}
        <div className="mb-4 lg:mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-5">
            <div className="flex items-center gap-4 pl-12 lg:pl-0">
              <IconTruck className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Supplier
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-xs lg:text-base font-medium">
                  Kelola data supplier untuk transaksi pembelian.
                </p>
              </div>
            </div>
            
            {/* Search and Action Container */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64 max-w-md lg:max-w-none">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 z-10 pointer-events-none">
                  <IconSearch size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama, kontak..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-white"
                />
              </div>
              
              {showAdminActions && (
                <Button
                  onClick={handleAddClick}
                  leftIcon={<IconPlus className="w-5 h-5" />}
                  variant="primary"
                  className="shadow-brand rounded-xl shrink-0"
                >
                  <span className="hidden sm:inline">Tambah Supplier</span>
                  <span className="sm:hidden">Tambah</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {loading ? (
            <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated">
              <div className="animate-pulse">
                <div className="h-12 bg-neutral-100/50 dark:bg-neutral-950/50 border-b border-neutral-200/50 dark:border-neutral-800/50" />
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 border-b border-neutral-100 dark:border-neutral-800/50 px-4">
                    <div className="h-4 bg-neutral-200/60 dark:bg-neutral-800/60 rounded w-full mt-6" />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-red-50/30 dark:bg-red-900/20 backdrop-blur-md rounded-3xl border border-red-200/50 dark:border-red-800/50 shadow-elevated">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <button
                onClick={fetchSuppliers}
                className="mt-4 text-sm text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="overflow-hidden rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated py-16 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500">
              <IconInbox size={64} className="mb-4 opacity-50 text-neutral-300 dark:text-neutral-700" />
              <p className="text-lg font-medium">Tidak ada data supplier</p>
              {search && <p className="text-sm">Cobalah kata kunci pencarian lainnya</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-4 h-full justify-between pb-8">
              <DataTable
                columns={columns}
                data={paginatedSuppliers}
                keyField="id"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
                className="rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl shadow-elevated overflow-auto"
                mobileRender={(item: Supplier) => (
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{item.nama}</div>
                        <div className="text-sm text-neutral-500 truncate mt-0.5">{item.kontak || '-'}</div>
                      </div>
                      {showAdminActions && (
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                              setOpenActionId(openActionId === item.id ? null : item.id);
                            }}
                            className="p-2 -m-2 rounded-xl text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <IconDotsVertical size={20} stroke={2} />
                          </button>
                          
                          {openActionId === item.id && (
                            <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px] py-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg animate-fade-in-up">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditClick(item); setOpenActionId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                              >
                                <IconEdit className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); setOpenActionId(null); }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                              >
                                <IconTrash className="w-4 h-4" /> Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-neutral-700 dark:text-neutral-300">
                      {item.alamat || <span className="text-neutral-400 dark:text-neutral-600">-</span>}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                )}
              />
              
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="py-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Form Modal (Create/Edit) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedSupplier ? 'Ubah Data Supplier' : 'Tambah Supplier Baru'}
        size="md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-5">
          <TextInput
            label="Nama Supplier"
            placeholder="Masukkan nama supplier"
            value={formNama}
            onChange={(e) => setFormNama(e.target.value)}
            error={formError.nama}
            required
            disabled={isSaving}
          />
          <TextInput
            label="Kontak"
            placeholder="Masukkan nomor telepon atau email"
            value={formKontak}
            onChange={(e) => setFormKontak(e.target.value)}
            disabled={isSaving}
          />
          <TextareaInput
            label="Alamat"
            placeholder="Masukkan alamat lengkap supplier"
            value={formAlamat}
            onChange={(e) => setFormAlamat(e.target.value)}
            rows={3}
            disabled={isSaving}
          />

          <div className="flex gap-3 justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={isSaving}
              className="rounded-xl"
              leftIcon={<IconX size={18} />}
            >
              <span className="hidden sm:inline">Batal</span>
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSaving}
              className="rounded-xl px-5"
              leftIcon={<IconDeviceFloppy size={18} />}
            >
              <span className="hidden sm:inline">Simpan</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Hapus Supplier"
        message={`Apakah Anda yakin ingin menghapus supplier "${supplierToDelete?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        danger
      />
      </AdminOnly>
    </AmbientLayout>
  );
}
