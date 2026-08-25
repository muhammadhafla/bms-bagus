'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { karyawanApi, Karyawan } from '@/lib/api/payroll';
import { Card, DataTable, Button, Modal, TextInput, Badge, PriceInput, type Column } from '@/components/ui';
import { IconUsers, IconEdit, IconSearch, IconClock, IconWallet, IconChevronRight } from '@tabler/icons-react';
import { toast } from 'sonner';
import { debounce } from '@/lib/utils';

export default function AdminKaryawanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat halaman...</div>}>
      <AdminKaryawanContent />
    </Suspense>
  );
}

function AdminKaryawanContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<Karyawan | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');

  // Form states for PriceInput
  const [formGajiHarian, setFormGajiHarian] = useState(0);
  const [formDendaTelat, setFormDendaTelat] = useState(0);
  const [formLembur, setFormLembur] = useState(0);

  useEffect(() => {
    if (selectedUser) {
      setFormGajiHarian(selectedUser.gaji_harian);
      setFormDendaTelat(selectedUser.denda_telat_per_jam);
      setFormLembur(selectedUser.lembur_per_jam);
    }
  }, [selectedUser]);

  // URL sync for search
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
    } else {
      params.delete('search');
    }
    const currentQueryString = searchParams.toString();
    const newQueryString = params.toString();
    if (newQueryString !== currentQueryString) {
      router.replace(`${pathname}${newQueryString ? `?${newQueryString}` : ''}`, { scroll: false });
    }
  }, [debouncedSearch, pathname, router, searchParams]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: list, isLoading } = useQuery({
    queryKey: ['admin_payroll_karyawan'],
    queryFn: () => karyawanApi.getAll().then(res => res.data),
  });

  // Filter list by search locally
  const filteredList = list?.filter(item => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const nameMatch = item.profiles?.nama?.toLowerCase().includes(q);
    const emailMatch = item.profiles?.email?.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: Partial<Karyawan> & { user_id: string }) => karyawanApi.upsert(payload),
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal menyimpan: ' + res.error.message);
        return;
      }
      toast.success('Data Karyawan berhasil disimpan!');
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_karyawan'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

    const fd = new FormData(e.currentTarget);
    const payload = {
      user_id: selectedUser.user_id,
      jam_masuk: fd.get('jam_masuk') as string,
      jam_pulang: fd.get('jam_pulang') as string,
      gaji_harian: formGajiHarian,
      denda_telat_per_jam: formDendaTelat,
      lembur_per_jam: formLembur,
      nama_bank: fd.get('nama_bank') as string,
      no_rekening: fd.get('no_rekening') as string,
    };

    upsertMutation.mutate(payload);
  };

  const columns: Column<Karyawan>[] = [
    { key: 'nama', header: 'Nama', render: (row: Karyawan) => row.profiles?.nama || 'Unknown' },
    { key: 'email', header: 'Email', render: (row: Karyawan) => row.profiles?.email || '-' },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row: Karyawan) => (
        <Badge variant={row.status_karyawan === 'aktif' ? 'success' : 'default'}>
          {row.status_karyawan === 'aktif' ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ) 
    },
    { key: 'jam', header: 'Jam Kerja', render: (row: Karyawan) => `${row.jam_masuk.substring(0,5)} - ${row.jam_pulang.substring(0,5)}` },
    { key: 'gaji', header: 'Gaji Harian', render: (row: Karyawan) => `Rp ${row.gaji_harian.toLocaleString('id-ID')}` },
    { 
      key: 'aksi',
      header: 'Aksi', 
      render: (row: Karyawan) => (
        <Button 
          variant="secondary" 
          size="sm" 
          leftIcon={<IconEdit size={16} />}
          onClick={() => setSelectedUser(row)}
        >
          Edit
        </Button>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 px-2 py-6 w-full md:p-4 lg:p-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <IconUsers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Master Data Karyawan</h1>
            <p className="hidden md:block text-neutral-500">Kelola rate gaji harian dan jadwal shift staf.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-64">
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
            <IconSearch size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200/60 bg-white py-2 pr-3 pl-9 text-sm shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:shadow-brand dark:border-neutral-800/60 dark:bg-neutral-900"
          />
        </div>
      </div>

      <Card className="overflow-hidden" padding="none">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <DataTable 
            columns={columns}
            data={filteredList || []}
            keyField="id"
            onRowClick={(item) => setSelectedUser(item)}
            mobileRender={(item: Karyawan) => (
              <div className="flex flex-col gap-3 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold dark:bg-blue-900/30 dark:text-blue-400">
                      {item.profiles?.nama?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-white truncate">
                        {item.profiles?.nama || 'Unknown'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{item.profiles?.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={item.status_karyawan === 'aktif' ? 'success' : 'default'}>
                      {item.status_karyawan === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <IconChevronRight size={18} className="text-neutral-400 shrink-0" />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <IconClock size={16} />
                      <span>Jam Kerja</span>
                    </div>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {item.jam_masuk.substring(0,5)} - {item.jam_pulang.substring(0,5)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <IconWallet size={16} />
                      <span>Gaji Harian</span>
                    </div>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      Rp {item.gaji_harian.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </Card>

      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`Edit Karyawan: ${selectedUser.profiles?.nama}`}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Jam Masuk"
                name="jam_masuk"
                type="time"
                defaultValue={selectedUser.jam_masuk.substring(0,5)}
                required
              />
              <TextInput
                label="Jam Pulang"
                name="jam_pulang"
                type="time"
                defaultValue={selectedUser.jam_pulang.substring(0,5)}
                required
              />
            </div>
            
            <PriceInput
              label="Gaji Harian"
              name="gaji_harian"
              value={formGajiHarian}
              onChange={setFormGajiHarian}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <PriceInput
                label="Denda Telat / Jam"
                name="denda_telat_per_jam"
                value={formDendaTelat}
                onChange={setFormDendaTelat}
              />
              <PriceInput
                label="Lembur / Jam"
                name="lembur_per_jam"
                value={formLembur}
                onChange={setFormLembur}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Nama Bank"
                name="nama_bank"
                type="text"
                defaultValue={selectedUser.nama_bank || ''}
                placeholder="Misal: BCA"
              />
              <TextInput
                label="No Rekening"
                name="no_rekening"
                type="text"
                defaultValue={selectedUser.no_rekening || ''}
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              className="mt-4"
              loading={upsertMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
