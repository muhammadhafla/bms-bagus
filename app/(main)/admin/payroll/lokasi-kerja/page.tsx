'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lokasiKerjaApi, LokasiKerja } from '@/lib/api/payroll/lokasi_kerja';
import { IconMapPin, IconPlus, IconEdit } from '@tabler/icons-react';
import { toast } from 'sonner';

import { Button, DataTable, Modal, TextInput, SelectInput, Badge, type Column } from '@/components/ui';

export default function LokasiKerjaAdminPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nama: '',
    latitude: '',
    longitude: '',
    radius_meter: '100',
    is_active: 'true'
  });

  const { data: locations, isLoading } = useQuery({
    queryKey: ['admin_lokasi_kerja'],
    queryFn: () => lokasiKerjaApi.getAll().then(res => res.data || [])
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<LokasiKerja, 'id' | 'created_at' | 'updated_at'>) => lokasiKerjaApi.create(data),
    onSuccess: (res) => {
      if (res.error) toast.error(res.error.message);
      else {
        toast.success('Lokasi berhasil ditambahkan');
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['admin_lokasi_kerja'] });
        queryClient.invalidateQueries({ queryKey: ['payroll', 'stores'] });
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string, data: Partial<LokasiKerja> }) => lokasiKerjaApi.update(args.id, args.data),
    onSuccess: (res) => {
      if (res.error) toast.error(res.error.message);
      else {
        toast.success('Lokasi berhasil diupdate');
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['admin_lokasi_kerja'] });
        queryClient.invalidateQueries({ queryKey: ['payroll', 'stores'] });
      }
    }
  });

  const handleEdit = (loc: LokasiKerja) => {
    setFormData({
      nama: loc.nama,
      latitude: loc.latitude.toString(),
      longitude: loc.longitude.toString(),
      radius_meter: loc.radius_meter.toString(),
      is_active: loc.is_active ? 'true' : 'false'
    });
    setEditingId(loc.id);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setFormData({ nama: '', latitude: '', longitude: '', radius_meter: '100', is_active: 'true' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung fitur lokasi GPS.');
      return;
    }
    
    const toastId = toast.loading('Mencari lokasi saat ini...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString()
        }));
        toast.success('Lokasi berhasil didapatkan!', { id: toastId });
      },
      (err) => {
        toast.error('Gagal mendapatkan lokasi. Pastikan izin GPS diberikan.', { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAutoPaste = (input: string) => {
    if (!input) return;

    // Helper for DMS to DD
    const dmsToDd = (degrees: string, minutes: string, seconds: string, direction: string) => {
      let dd = Number(degrees) + Number(minutes) / 60 + Number(seconds) / (60 * 60);
      if (direction === 'S' || direction === 'W') {
        dd = dd * -1;
      }
      return dd.toFixed(6);
    };

    // 1. Try matching DMS format: 6°58'41.7"S 109°38'02.4"E
    const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+([\d.,]+)["\s]*([NS])\s*,?\s*(\d+)[°\s]+(\d+)['\s]+([\d.,]+)["\s]*([EW])/i;
    const matchDms = input.match(dmsRegex);
    
    if (matchDms) {
      const lat = dmsToDd(matchDms[1], matchDms[2], matchDms[3].replace(',', '.'), matchDms[4].toUpperCase());
      const lng = dmsToDd(matchDms[5], matchDms[6], matchDms[7].replace(',', '.'), matchDms[8].toUpperCase());
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      toast.success('Koordinat DMS berhasil diproses!');
      return;
    }

    // 2. Try matching standard Decimal Degrees: -6.978250, 109.634000
    const ddRegex = /(-?\d+[.,]\d+)\s*,\s*(-?\d+[.,]\d+)/;
    const matchDd = input.match(ddRegex);
    
    if (matchDd) {
      setFormData(prev => ({ 
        ...prev, 
        latitude: matchDd[1].replace(',', '.'), 
        longitude: matchDd[2].replace(',', '.') 
      }));
      toast.success('Koordinat Desimal berhasil diproses!');
      return;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nama: formData.nama,
      latitude: parseFloat(formData.latitude.replace(',', '.')),
      longitude: parseFloat(formData.longitude.replace(',', '.')),
      radius_meter: parseInt(formData.radius_meter),
      is_active: formData.is_active === 'true'
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const columns: Column<LokasiKerja>[] = [
    {
      key: 'nama',
      header: 'Nama Lokasi',
      render: (loc) => <span className="font-medium text-slate-800 dark:text-neutral-200">{loc.nama}</span>
    },
    {
      key: 'koordinat',
      header: 'Koordinat (Lat, Lng)',
      render: (loc) => <span className="font-mono text-xs text-slate-500 dark:text-neutral-400">{loc.latitude}, {loc.longitude}</span>
    },
    {
      key: 'radius',
      header: 'Radius',
      render: (loc) => <span className="text-slate-500 dark:text-neutral-400">{loc.radius_meter} meter</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (loc) => (
        <Badge variant={loc.is_active ? 'success' : 'default'} size="sm">
          {loc.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      )
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'right',
      render: (loc) => (
        <div className="flex justify-end">
          <Button 
            variant="secondary" 
            size="sm"
            leftIcon={<IconEdit size={16} />}
            onClick={() => handleEdit(loc)}
          >
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4 px-2 py-4 w-full md:p-4 lg:p-8 pb-20">
      <div className="flex flex-row items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <IconMapPin className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-white">Lokasi Outlet</h1>
            <p className="hidden md:block text-[11px] sm:text-sm text-neutral-500 leading-snug">Atur koordinat outlet (GPS) untuk absensi.</p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button 
            variant="primary" 
            onClick={handleCreateNew}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:w-auto sm:!px-4 sm:!py-2"
          >
            <IconPlus size={18} className="shrink-0" />
            <span className="hidden font-medium sm:inline">Tambah Lokasi</span>
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex overflow-hidden flex-col min-h-[400px] rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <DataTable 
              columns={columns}
              data={locations || []}
              keyField="id"
              className="border-none flex-1"
              emptyState={
                <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <IconMapPin className="mb-2 h-10 w-10 opacity-20" />
                  <p>Belum ada data lokasi outlet.</p>
                </div>
              }
            />
          </div>
        )}
      </div>

      {/* Mobile view fallback for the table */}
      <div className="flex flex-col gap-3 lg:hidden">
        {isLoading ? (
          <div className="h-24 w-full animate-pulse rounded-xl bg-white dark:bg-neutral-900 shadow-sm" />
        ) : locations?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white/50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
            <IconMapPin className="mx-auto mb-2 h-8 w-8 text-neutral-400 opacity-50" />
            <p className="text-sm font-medium text-neutral-500">Belum ada data.</p>
          </div>
        ) : (
          locations?.map((loc) => (
            <div key={loc.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white">{loc.nama}</h3>
                  <p className="font-mono text-xs text-neutral-500 mt-1">{loc.latitude}, {loc.longitude}</p>
                  <p className="text-xs text-neutral-500 mt-1">Radius: {loc.radius_meter}m</p>
                </div>
                <Badge variant={loc.is_active ? 'success' : 'default'} size="sm">
                  {loc.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button variant="secondary" size="sm" fullWidth onClick={() => handleEdit(loc)} leftIcon={<IconEdit size={16} />}>
                  Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Lokasi Outlet' : 'Tambah Lokasi Outlet'}
        isBottomSheetOnMobile={true}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <TextInput 
            label="Nama Lokasi"
            placeholder="Misal: Toko Pusat"
            value={formData.nama}
            onChange={(e) => setFormData({...formData, nama: e.target.value})}
            required
          />

          <div className="flex flex-col gap-1 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <TextInput 
              label="Paste dari Google Maps (Opsional)"
              placeholder="Contoh: 6°58'41.7&quot;S 109°38'02.4&quot;E"
              onChange={(e) => handleAutoPaste(e.target.value)}
            />
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 leading-snug">
              Paste koordinat yang disalin dari Google Maps. Sistem akan otomatis mengisi Latitude & Longitude di bawah.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-4">
              <TextInput 
                label="Latitude"
                type="text"
                placeholder="-6.200000"
                value={formData.latitude}
                onChange={(e) => setFormData({...formData, latitude: e.target.value.replace(/[^0-9.,-]/g, '')})}
                required
              />
              <TextInput 
                label="Longitude"
                type="text"
                placeholder="106.816666"
                value={formData.longitude}
                onChange={(e) => setFormData({...formData, longitude: e.target.value.replace(/[^0-9.,-]/g, '')})}
                required
              />
            </div>
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              leftIcon={<IconMapPin size={16} />}
              onClick={handleGetCurrentLocation}
              className="self-start mt-1"
            >
              Gunakan Lokasi Saat Ini
            </Button>
          </div>
          <TextInput 
            label="Radius (Meter)"
            type="number"
            min={10}
            value={formData.radius_meter}
            onChange={(e) => setFormData({...formData, radius_meter: e.target.value})}
            required
          />
          <SelectInput
            label="Status"
            value={formData.is_active}
            onChange={(value) => setFormData({...formData, is_active: value})}
            options={[
              { label: 'Aktif', value: 'true' },
              { label: 'Nonaktif', value: 'false' }
            ]}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
