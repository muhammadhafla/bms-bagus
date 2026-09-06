'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerApi } from '@/lib/api/ledger';
import { gudangApi } from '@/lib/api/warehouse';
import { 
  Button, 
  Modal, 
  TextInput, 
  TextareaInput, 
  SelectInput, 
  ModernPagination, 
  AmbientLayout,
  ConfirmDialog
} from '@/components/ui';
import { 
  IconReceipt, 
  IconPlus, 
  IconTrash, 
  IconChevronRight, 
  IconSearch, 
  IconX 
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PengeluaranOperasionalPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
  const [search, setSearch] = useState('');
  const limit = 50;

  const { data: gudangRes } = useQuery({
    queryKey: ['warehouse-list'],
    queryFn: () => gudangApi.getAll({ activeOnly: true }),
  });
  const gudangList = useMemo(() => gudangRes?.data || [], [gudangRes?.data]);

  const { data, isLoading } = useQuery({
    queryKey: ['pengeluaran_operasional', selectedGudangId],
    queryFn: () => ledgerApi.getPengeluaranOperasional(undefined, undefined, undefined, selectedGudangId || undefined),
  });

  const rawList = useMemo(() => data || [], [data]);

  // Client-side search filtering
  const filteredList = useMemo(() => {
    if (!search.trim()) return rawList;
    const q = search.toLowerCase();
    return rawList.filter((item: any) => {
      const matchKategori = item.kategori?.toLowerCase().includes(q);
      const matchKeterangan = item.keterangan?.toLowerCase().includes(q);
      const matchAdmin = item.profiles?.nama?.toLowerCase().includes(q);
      const matchGudang = item.gudang?.nama?.toLowerCase().includes(q);
      return matchKategori || matchKeterangan || matchAdmin || matchGudang;
    });
  }, [rawList, search]);

  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedList = useMemo(() => {
    return filteredList.slice((page - 1) * limit, page * limit);
  }, [filteredList, page, limit]);

  // Summary stats
  const totalNominal = useMemo(() => {
    return filteredList.reduce((acc: number, item: any) => acc + (Number(item.nominal) || 0), 0);
  }, [filteredList]);

  // Reset page when search or warehouse changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedGudangId]);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [gudangId, setGudangId] = useState('');
  const [kategori, setKategori] = useState('Listrik');
  const [kategoriLainnya, setKategoriLainnya] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));

  const standardCategories = ['Listrik', 'Air', 'Internet', 'Konsumsi', 'Sewa', 'ATK'];

  // Default warehouse when modal opens
  useEffect(() => {
    if (gudangList.length > 0 && !gudangId) {
      const def = gudangList.find((g) => g.is_default) || gudangList[0];
      setGudangId(def?.id || '');
    }
  }, [gudangList, gudangId]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const finalKategori = kategori === 'Lainnya' ? kategoriLainnya : kategori;
      const cleanNominal = Number(nominal.replace(/\D/g, ''));

      if (editingId) {
        return ledgerApi.updatePengeluaranOperasional(editingId, {
          kategori: finalKategori,
          nominal: cleanNominal,
          keterangan,
          tanggal,
          gudang_id: gudangId || null,
        });
      } else {
        return ledgerApi.insertPengeluaranOperasional({
          kategori: finalKategori,
          nominal: cleanNominal,
          keterangan,
          tanggal,
          metode_pembayaran: 'CASH',
          gudang_id: gudangId || null,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil dicatat');
      setIsModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['pengeluaran_operasional'] });
      queryClient.invalidateQueries({ queryKey: ['buku_besar'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan pengeluaran');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ledgerApi.deletePengeluaranOperasional(id),
    onSuccess: () => {
      toast.success('Pengeluaran berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['pengeluaran_operasional'] });
      queryClient.invalidateQueries({ queryKey: ['buku_besar'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus pengeluaran');
    }
  });

  const resetForm = () => {
    setEditingId(null);
    const def = gudangList.find((g) => g.is_default) || gudangList[0];
    setGudangId(def?.id || '');
    setKategori('Listrik');
    setKategoriLainnya('');
    setNominal('');
    setKeterangan('');
    setTanggal(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setGudangId(item.gudang_id || '');
    if (standardCategories.includes(item.kategori)) {
      setKategori(item.kategori);
      setKategoriLainnya('');
    } else {
      setKategori('Lainnya');
      setKategoriLainnya(item.kategori);
    }
    setNominal(Number(item.nominal).toLocaleString('id-ID'));
    setKeterangan(item.keterangan || '');
    setTanggal(item.tanggal);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominal) return toast.error('Nominal wajib diisi');
    saveMutation.mutate();
  };

  return (
    <AmbientLayout>
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/50">
            <IconReceipt className="h-6 w-6" stroke={1.75} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Pengeluaran Operasional
            </h1>
            <p className="hidden md:block text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Catat dan pantau biaya operasional toko harian.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
          variant="primary"
        >
          <IconPlus size={18} />
          <span>Tambah Pengeluaran</span>
        </Button>
      </div>

      {/* Filter and Summary Bar */}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 dark:text-neutral-500">
              <IconSearch size={16} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kategori, keterangan, admin..."
              className="w-full rounded-xl border border-neutral-200/80 bg-white/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 shadow-2xs backdrop-blur-md transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-white dark:placeholder-neutral-500 dark:focus:bg-neutral-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Warehouse Selector */}
          <div className="w-full sm:w-60">
            <SelectInput
              value={selectedGudangId}
              onChange={(val) => {
                setSelectedGudangId(val);
                setPage(1);
              }}
              options={[
                { label: 'Semua Outlet / Cabang', value: '' },
                ...gudangList.map((g) => ({
                  label: `${g.nama} (${g.kode_gudang})`,
                  value: g.id,
                })),
              ]}
            />
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/60 bg-white/60 px-3 py-1.5 text-xs text-neutral-600 shadow-2xs backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300">
            <span className="text-neutral-400 dark:text-neutral-500">Total:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              Rp {totalNominal.toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              ({totalItems})
            </span>
          </div>
        </div>
      </div>

      {/* Desktop Table Layout (Entire Row Clickable, inspired by InventoryTable) */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/70 shadow-sm backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-900/60 mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="border-b border-neutral-200/60 bg-neutral-50/80 backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-950/50 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Lokasi</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5">Keterangan</th>
                <th className="px-5 py-3.5 text-right">Nominal</th>
                <th className="px-5 py-3.5">Admin</th>
                <th className="w-12 px-3 py-3.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <span>Memuat data pengeluaran...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <IconReceipt className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {search ? 'Tidak ada pengeluaran yang cocok' : 'Belum ada data pengeluaran'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {search
                          ? 'Coba ganti kata kunci pencarian atau filter lokasi.'
                          : 'Klik tombol "Tambah Pengeluaran" untuk mulai mencatat.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item: any) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenEdit(item)}
                    className="group cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                      {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {item.gudang?.nama ? (
                        <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                          {item.gudang.nama}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">
                      {item.kategori}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                      {item.keterangan || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      - Rp {item.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                      {item.profiles?.nama || 'Unknown'}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 inline-flex rounded-lg p-1.5 text-neutral-400 transition-all">
                        <IconChevronRight size={18} stroke={2.5} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout (Compact p-3, Entirely Clickable, inspired by InventoryTable) */}
      <div className="md:hidden flex flex-col gap-2 mt-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <span>Memuat data...</span>
            </div>
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500 border border-dashed rounded-2xl bg-white/40 dark:bg-neutral-900/40 dark:border-neutral-800">
            {search ? 'Tidak ada pengeluaran yang cocok dengan pencarian.' : 'Belum ada data pengeluaran.'}
          </div>
        ) : (
          paginatedList.map((item: any) => (
            <div
              key={item.id}
              onClick={() => handleOpenEdit(item)}
              className="group flex cursor-pointer flex-col gap-1.5 rounded-2xl border border-neutral-200/60 bg-white/70 backdrop-blur-xl p-3 shadow-2xs transition-all duration-200 active:scale-[0.98] hover:bg-neutral-50/90 dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80"
            >
              {/* Top Row: Category + Warehouse chip, and Chevron right */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0 pr-2">
                  <span className="font-semibold text-sm leading-tight text-neutral-900 dark:text-white truncate">
                    {item.kategori}
                  </span>
                  {item.gudang?.nama && (
                    <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                      {item.gudang.nama}
                    </span>
                  )}
                </div>
                <div className="group-hover:text-brand-600 dark:group-hover:text-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 -mr-1 shrink-0 rounded-lg p-1 text-neutral-400 transition-all">
                  <IconChevronRight size={18} stroke={2.5} />
                </div>
              </div>

              {/* Middle Row: Note / Keterangan (only rendered if present and not '-') */}
              {item.keterangan && item.keterangan !== '-' && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                  {item.keterangan}
                </p>
              )}

              {/* Bottom Row: Date & Admin (left), Amount (right) */}
              <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800/60 pt-2 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <span>{format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}</span>
                  <span>•</span>
                  <span className="truncate max-w-[110px] text-neutral-500 dark:text-neutral-400 font-medium">
                    {item.profiles?.nama || 'Unknown'}
                  </span>
                </div>
                <span className="font-bold text-sm text-rose-600 dark:text-rose-400 shrink-0">
                  - Rp {item.nominal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5">
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Modal Tambah / Edit (with Delete Button in Modal Footer) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }} 
        title={editingId ? 'Edit Pengeluaran Operasional' : 'Tambah Pengeluaran Operasional'} 
        isBottomSheetOnMobile
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <SelectInput
            label="Lokasi Toko / Cabang"
            value={gudangId}
            onChange={(val) => setGudangId(val)}
            options={gudangList.map((g) => ({
              label: `${g.nama} (${g.kode_gudang})`,
              value: g.id,
            }))}
            required
          />

          <SelectInput
            label="Kategori"
            value={kategori}
            onChange={(val) => setKategori(val)}
            options={[
              { label: 'Listrik', value: 'Listrik' },
              { label: 'Air', value: 'Air' },
              { label: 'Internet', value: 'Internet' },
              { label: 'Konsumsi', value: 'Konsumsi' },
              { label: 'Sewa', value: 'Sewa' },
              { label: 'ATK', value: 'ATK' },
              { label: 'Lainnya', value: 'Lainnya' },
            ]}
          />
          
          {kategori === 'Lainnya' && (
            <TextInput
              label="Kategori Lainnya"
              value={kategoriLainnya}
              onChange={(e) => setKategoriLainnya(e.target.value)}
              placeholder="Masukkan kategori"
              required
            />
          )}

          <TextInput
            label="Nominal (Rp)"
            value={nominal}
            onChange={(e) => {
              const num = e.target.value.replace(/\D/g, '');
              setNominal(num ? Number(num).toLocaleString('id-ID') : '');
            }}
            placeholder="0"
            required
            className="text-lg font-bold"
          />

          <TextInput
            label="Tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
          />

          <TextareaInput
            label="Keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Detail tambahan (opsional)"
            rows={3}
          />

          {/* Modal Actions: Delete button on left (edit mode), Cancel and Save on right */}
          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-neutral-800">
            {editingId ? (
              <Button
                variant="danger"
                type="button"
                onClick={() => setDeleteId(editingId)}
                leftIcon={<IconTrash size={16} />}
              >
                Hapus
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }} 
                type="button"
              >
                Batal
              </Button>
              <Button variant="primary" type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Hapus Pengeluaran"
        message="Yakin ingin menghapus data ini? Mutasi di Buku Besar juga akan ikut terhapus secara otomatis."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        danger
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setIsModalOpen(false);
            resetForm();
          }
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </AmbientLayout>
  );
}
