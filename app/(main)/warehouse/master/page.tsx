'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  IconSettings,
  IconPlus,
  IconEdit,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  DataTable,
  type Column,
  Modal,
  TextInput,
  SelectInput,
  CheckboxInput,
} from '@/components/ui';
import { AdminOnly } from '@/components/role';
import { gudangApi } from '@/lib/api/warehouse';
import { lokasiKerjaApi } from '@/lib/api/payroll/lokasi_kerja';
import { Gudang, TipeGudang } from '@/types/warehouse';

export default function WarehouseMasterPage() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGudang, setEditingGudang] = useState<Gudang | null>(null);

  // Form State
  const [kodeGudang, setKodeGudang] = useState('');
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState<TipeGudang>('PUSAT');
  const [alamat, setAlamat] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState('');
  const [kontakPj, setKontakPj] = useState('');
  const [lokasiKerjaId, setLokasiKerjaId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // Fetch Gudang List
  const { data: gudangRes, isLoading } = useQuery({
    queryKey: ['warehouse-list-master'],
    queryFn: () => gudangApi.getAll(),
  });

  // Fetch Lokasi Kerja (outlet GPS relations)
  const { data: lokasiRes } = useQuery({
    queryKey: ['payroll-lokasi-kerja'],
    queryFn: () => lokasiKerjaApi.getAll(),
  });

  const gudangs = gudangRes?.data || [];
  const lokasiList = lokasiRes?.data || [];

  const handleOpenAdd = () => {
    setEditingGudang(null);
    setKodeGudang('');
    setNama('');
    setTipe('PUSAT');
    setAlamat('');
    setPenanggungJawab('');
    setKontakPj('');
    setLokasiKerjaId('');
    setIsActive(true);
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: Gudang) => {
    setEditingGudang(g);
    setKodeGudang(g.kode_gudang);
    setNama(g.nama);
    setTipe(g.tipe);
    setAlamat(g.alamat || '');
    setPenanggungJawab(g.penanggung_jawab || '');
    setKontakPj(g.kontak_pj || '');
    setLokasiKerjaId(g.lokasi_kerja_id || '');
    setIsActive(g.is_active);
    setIsDefault(g.is_default);
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!kodeGudang.trim() || !nama.trim()) {
        throw new Error('Kode gudang dan nama gudang wajib diisi');
      }

      const payload = {
        kode_gudang: kodeGudang.trim().toUpperCase(),
        nama: nama.trim(),
        tipe,
        alamat: alamat.trim() || null,
        penanggung_jawab: penanggungJawab.trim() || null,
        kontak_pj: kontakPj.trim() || null,
        lokasi_kerja_id: lokasiKerjaId || null,
        is_active: isActive,
        is_default: isDefault,
      };

      if (editingGudang) {
        const res = await gudangApi.update(editingGudang.id, payload);
        if (res.error) throw res.error;
        return res.data;
      } else {
        const res = await gudangApi.create(payload);
        if (res.error) throw res.error;
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        editingGudang ? 'Master gudang berhasil diubah' : 'Master gudang baru berhasil ditambahkan',
      );
      queryClient.invalidateQueries({ queryKey: ['warehouse-list-master'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-list'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan data gudang');
    },
  });

  const columns: Column<Gudang>[] = [
    {
      key: 'kode_gudang',
      header: 'Kode',
      render: (row) => (
        <span className="font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
          {row.kode_gudang}
        </span>
      ),
    },
    {
      key: 'nama',
      header: 'Nama Lokasi Gudang',
      render: (row) => (
        <div>
          <span className="font-semibold text-neutral-900 dark:text-white block text-sm">
            {row.nama}
          </span>
          <span className="text-[11px] text-neutral-500">{row.alamat || 'Tidak ada alamat'}</span>
        </div>
      ),
    },
    {
      key: 'tipe',
      header: 'Tipe',
      render: (row) => {
        const variantMap: Record<TipeGudang, 'info' | 'success' | 'danger' | 'warning'> = {
          PUSAT: 'info',
          CABANG: 'success',
          RETUR: 'danger',
          TRANSIT: 'warning',
        };
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={variantMap[row.tipe] || 'default'} size="sm">
              {row.tipe}
            </Badge>
            {row.is_default && (
              <Badge variant="default" size="sm">
                DEFAULT
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'penanggung_jawab',
      header: 'Penanggung Jawab (PIC)',
      render: (row) => (
        <div className="text-xs">
          <span className="font-medium text-neutral-800 dark:text-neutral-200 block">
            {row.penanggung_jawab || '-'}
          </span>
          {row.kontak_pj && <span className="text-neutral-500">{row.kontak_pj}</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'default'} size="sm">
          {row.is_active ? 'Aktif' : 'Non-aktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<IconEdit className="h-4 w-4" />}
          onClick={() => handleOpenEdit(row)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminOnly>
      <AmbientLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
                <IconSettings className="h-7 w-7 text-brand-600 dark:text-brand-400" />
                Master Data Gudang & Lokasi
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Konfigurasi daftar gudang fisik, toko cabang, dan penanggung jawab lokasi
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                leftIcon={<IconPlus className="h-4 w-4" />}
                onClick={handleOpenAdd}
              >
                Tambah Gudang Baru
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Daftar Gudang Terdaftar</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={gudangs}
                keyField="id"
                loading={isLoading}
                emptyState={
                  <div className="p-8 text-center text-xs text-neutral-400">
                    Belum ada master gudang yang terdaftar.
                  </div>
                }
              />
            </CardContent>
          </Card>

          {/* Modal Add / Edit */}
          {isModalOpen && (
            <Modal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title={editingGudang ? 'Edit Master Gudang' : 'Tambah Gudang Baru'}
              size="md"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Kode Gudang (Unik):
                    </label>
                    <TextInput
                      value={kodeGudang}
                      onChange={(e) => setKodeGudang(e.target.value)}
                      placeholder="Contoh: GD-PST / GD-TK2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Tipe Lokasi:
                    </label>
                    <SelectInput
                      value={tipe}
                      onChange={(val) => setTipe(val as TipeGudang)}
                      options={[
                        { value: 'PUSAT', label: 'Gudang Pusat / Utama' },
                        { value: 'CABANG', label: 'Toko / Gudang Cabang' },
                        { value: 'RETUR', label: 'Gudang Retur & Karantina' },
                        { value: 'TRANSIT', label: 'Gudang Transit Logistik' },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Nama Lokasi Gudang:
                  </label>
                  <TextInput
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Contoh: Gudang Utama & Toko Pusat"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Alamat Lengkap:
                  </label>
                  <TextInput
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Alamat fisik gudang..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Penanggung Jawab (PIC):
                    </label>
                    <TextInput
                      value={penanggungJawab}
                      onChange={(e) => setPenanggungJawab(e.target.value)}
                      placeholder="Nama kepala gudang..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Kontak PIC (No. Telp/WA):
                    </label>
                    <TextInput
                      value={kontakPj}
                      onChange={(e) => setKontakPj(e.target.value)}
                      placeholder="0812xxxx..."
                    />
                  </div>
                </div>

                {lokasiList.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Integrasi Lokasi Outlet Kerja (GPS):
                    </label>
                    <SelectInput
                      value={lokasiKerjaId}
                      onChange={setLokasiKerjaId}
                      options={[
                        { value: '', label: 'Tidak Terhubung ke Lokasi Absensi' },
                        ...lokasiList.map((l: any) => ({
                          value: l.id,
                          label: `${l.nama} (Radius: ${l.radius_meter}m)`,
                        })),
                      ]}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <CheckboxInput
                    id="is-active"
                    label="Gudang Aktif (Dapat digunakan untuk mutasi dan stok)"
                    checked={isActive}
                    onChange={setIsActive}
                  />
                  <CheckboxInput
                    id="is-default"
                    label="Jadikan Gudang Utama Default (Tujuan restock supplier default)"
                    checked={isDefault}
                    onChange={setIsDefault}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    loading={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    Simpan Master Gudang
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </AmbientLayout>
    </AdminOnly>
  );
}
