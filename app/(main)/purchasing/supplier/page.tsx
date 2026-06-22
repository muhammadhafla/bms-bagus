'use client';

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
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Button,
  DataTable,
  Modal,
  TextInput,
  TextareaInput,
  ConfirmDialog,
  Pagination,
  useToast,
} from '@/components/ui';

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

  const { showToast } = useToast();
  
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
      showToast('Gagal memuat data supplier', 'error');
    } else {
      setSuppliers(result.data || []);
    }
    setLoading(false);
  }, [showToast]);

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
        const valA = String((a as any)[sortKey] || '').toLowerCase();
        const valB = String((b as any)[sortKey] || '').toLowerCase();
        
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
        showToast(msg, 'error');
      } else if (result.data) {
        showToast('Supplier berhasil diperbarui', 'success');
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
        showToast(msg, 'error');
      } else if (result.data) {
        showToast('Supplier berhasil ditambahkan', 'success');
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
      showToast(result.error.message || 'Gagal menghapus supplier', 'error');
    } else {
      showToast('Supplier berhasil dihapus', 'success');
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
      <div className="flex flex-col h-[calc(100vh-2rem)]">
        {/* Header Section */}
        <div className="mb-6 flex-shrink-0 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-brand">
                <IconTruck className="w-6 h-6 text-white" stroke={1.5} />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                  Supplier
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-base font-medium">
                  Kelola data supplier untuk transaksi pembelian.
                </p>
              </div>
            </div>
            {showAdminActions && (
              <Button
                onClick={handleAddClick}
                leftIcon={<IconPlus className="w-5 h-5" />}
                variant="primary"
                className="shadow-brand rounded-xl"
              >
                <span className="hidden sm:inline">Tambah Supplier</span>
              </Button>
            )}
          </div>

          {/* Search bar */}
          <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconSearch size={20} />
              </div>
              <input
                type="text"
                placeholder="Cari nama, kontak, atau alamat..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm rounded-xl focus:outline-none focus:border-brand-500 focus:shadow-brand transition-all text-neutral-900 dark:text-white"
              />
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
    </AmbientLayout>
  );
}
