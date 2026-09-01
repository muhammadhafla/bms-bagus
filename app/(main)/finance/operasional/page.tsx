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
  IconEdit, 
  IconArrowUpRight 
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PengeluaranOperasionalPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [selectedGudangId, setSelectedGudangId] = useState<string>('');
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

  const list = data || [];
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedList = list.slice((page - 1) * limit, page * limit);

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
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconReceipt className="h-8 w-8 text-brand-500" stroke={1.5} />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Pengeluaran Operasional</h1>
            <p className="hidden md:block text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Catat dan pantau biaya operasional toko harian.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48 sm:w-56">
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
          <Button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }} 
            className="flex items-center justify-center gap-2" 
            variant="primary"
          >
            <IconPlus size={18} />
            <span>Tambah Pengeluaran</span>
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600 dark:text-neutral-300">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Memuat data...</td></tr>
              ) : paginatedList.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-neutral-500">Belum ada data pengeluaran operasional.</td></tr>
              ) : (
                paginatedList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.gudang?.nama ? (
                        <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                          {item.gudang.nama}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{item.kategori}</td>
                    <td className="px-6 py-4">{item.keterangan || '-'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-600 dark:text-rose-400">
                      Rp {item.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.profiles?.nama || 'Unknown'}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button 
                          variant="secondary" 
                          className="!p-2" 
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Pengeluaran"
                        >
                          <IconEdit size={16} />
                        </Button>
                        <Button 
                          variant="danger" 
                          className="!p-2" 
                          onClick={() => setDeleteId(item.id)}
                          title="Hapus Pengeluaran"
                        >
                          <IconTrash size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden flex flex-col gap-3 mt-4">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Memuat data...</div>
        ) : paginatedList.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500 border border-dashed rounded-xl mt-4">Belum ada data pengeluaran.</div>
        ) : (
          paginatedList.map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm relative">
              <div className="absolute top-3 right-3 flex items-center gap-1">
                <button 
                  className="text-neutral-400 hover:text-brand-500 transition-colors p-1"
                  onClick={() => handleOpenEdit(item)}
                  title="Edit Pengeluaran"
                >
                  <IconEdit size={16} />
                </button>
                <button 
                  className="text-neutral-300 hover:text-rose-500 transition-colors p-1"
                  onClick={() => setDeleteId(item.id)}
                  title="Hapus Pengeluaran"
                >
                  <IconTrash size={16} />
                </button>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30">
                <IconArrowUpRight className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 pr-12">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-neutral-900 dark:text-white truncate">
                    {item.kategori}
                  </p>
                  {item.gudang?.nama && (
                    <span className="inline-flex items-center rounded-md bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50">
                      {item.gudang.nama}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 truncate">{item.keterangan || '-'}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}</p>
              </div>
              <div className="text-right shrink-0 mt-3">
                <p className="font-black text-rose-600 dark:text-rose-400">
                  - Rp {item.nominal.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] font-bold text-neutral-400 mt-1">{item.profiles?.nama}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <ModernPagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Modal Tambah / Edit */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }} 
        title={editingId ? 'Edit Pengeluaran Operasional' : 'Tambah Pengeluaran Operasional'} 
        isBottomSheetOnMobile
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
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

          <div className="mt-4 flex gap-3 justify-end">
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
          if (deleteId) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </AmbientLayout>
  );
}
