import { useState, useEffect } from 'react';
import { Modal, TextInput, SelectInput, Button, Badge } from '@/components/ui';
import { IconMapPin, IconExternalLink, IconCheck, IconClock } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Kehadiran } from '@/lib/api/payroll';
import { toast } from 'sonner';
import { getTimeFromIso } from './KehadiranTable';

interface KehadiranModalsProps {
  selectedKehadiran: Kehadiran | null;
  setSelectedKehadiran: (val: Kehadiran | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (val: boolean) => void;
  reviewPulangAwalModalItem: Kehadiran | null;
  setReviewPulangAwalModalItem: (val: Kehadiran | null) => void;
  karyawanIdOptions: { label: string; value: string }[];
  storeFormOptions: { label: string; value: string }[];
  createMutation: any;
  updateMutation: any;
  reviewPulangAwalMutation: any;
}

export function KehadiranModals({
  selectedKehadiran,
  setSelectedKehadiran,
  isCreateOpen,
  setIsCreateOpen,
  reviewPulangAwalModalItem,
  setReviewPulangAwalModalItem,
  karyawanIdOptions,
  storeFormOptions,
  createMutation,
  updateMutation,
  reviewPulangAwalMutation,
}: KehadiranModalsProps) {
  // Edit State
  const [editStatusHadir, setEditStatusHadir] = useState<string>('');
  const [editStatusLembur, setEditStatusLembur] = useState<string>('');
  const [editLokasiMasukId, setEditLokasiMasukId] = useState<string>('');
  const [editLokasiPulangId, setEditLokasiPulangId] = useState<string>('');

  useEffect(() => {
    if (selectedKehadiran) {
      setEditStatusHadir(selectedKehadiran.status_hadir);
      setEditStatusLembur(selectedKehadiran.status_lembur);
      setEditLokasiMasukId(selectedKehadiran.lokasi_masuk_id || '');
      setEditLokasiPulangId(selectedKehadiran.lokasi_pulang_id || '');
    }
  }, [selectedKehadiran]);

  // Create State
  const [createDate, setCreateDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [createUserId, setCreateUserId] = useState('');
  const [createStatusHadir, setCreateStatusHadir] = useState('hadir');
  const [createStatusLembur, setCreateStatusLembur] = useState('tidak_ada');
  const [createLokasiId, setCreateLokasiId] = useState('');

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedKehadiran) return;
    
    const fd = new FormData(e.currentTarget);
    const status_hadir = editStatusHadir as any;
    const waktu_masuk_time = fd.get('waktu_masuk') as string;
    const waktu_pulang_time = fd.get('waktu_pulang') as string;
    const menit_telat = Number(fd.get('menit_telat'));
    const menit_lembur_disetujui = Number(fd.get('menit_lembur_disetujui'));
    const status_lembur = editStatusLembur as any;

    const originalDateStr = selectedKehadiran.tanggal;
    
    let waktu_masuk_iso: string | null = selectedKehadiran.waktu_masuk;
    if (waktu_masuk_time) {
      const d = new Date(`${originalDateStr}T${waktu_masuk_time}:00`);
      if (!isNaN(d.getTime())) waktu_masuk_iso = d.toISOString();
    }
    
    let waktu_pulang_iso: string | null = selectedKehadiran.waktu_pulang || null;
    if (waktu_pulang_time) {
      const d = new Date(`${originalDateStr}T${waktu_pulang_time}:00`);
      if (!isNaN(d.getTime())) waktu_pulang_iso = d.toISOString();
    }

    if (status_hadir !== 'hadir') {
      waktu_masuk_iso = null;
      waktu_pulang_iso = null;
    }

    let menit_kerja: number | undefined = undefined;
    if (waktu_masuk_iso && waktu_pulang_iso) {
      const dMasuk = new Date(waktu_masuk_iso).getTime();
      const dPulang = new Date(waktu_pulang_iso).getTime();
      if (dPulang > dMasuk) {
        menit_kerja = Math.round((dPulang - dMasuk) / (1000 * 60));
      }
    }

    updateMutation.mutate(
      {
        id: selectedKehadiran.id,
        status_hadir,
        waktu_masuk: waktu_masuk_iso,
        waktu_pulang: waktu_pulang_iso,
        ...(menit_kerja !== undefined ? { menit_kerja } : {}),
        menit_telat,
        menit_lembur_aktual: menit_lembur_disetujui,
        menit_lembur_disetujui,
        status_lembur,
        lokasi_masuk_id: editLokasiMasukId || null,
        lokasi_pulang_id: editLokasiPulangId || null,
      },
      {
        onSuccess: () => setSelectedKehadiran(null),
      }
    );
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createUserId) {
      toast.error('Pilih karyawan terlebih dahulu');
      return;
    }

    const fd = new FormData(e.currentTarget);
    const status_hadir = createStatusHadir as any;
    const waktu_masuk_time = fd.get('waktu_masuk') as string;
    const waktu_pulang_time = fd.get('waktu_pulang') as string;
    
    let waktu_masuk_iso: string | null = new Date(`${createDate}T00:00:00`).toISOString();
    if (waktu_masuk_time) {
      const d = new Date(`${createDate}T${waktu_masuk_time}:00`);
      if (!isNaN(d.getTime())) waktu_masuk_iso = d.toISOString();
    }

    let waktu_pulang_iso: string | null = null;
    if (waktu_pulang_time) {
      const d = new Date(`${createDate}T${waktu_pulang_time}:00`);
      if (!isNaN(d.getTime())) waktu_pulang_iso = d.toISOString();
    }

    if (status_hadir !== 'hadir') {
      waktu_masuk_iso = null;
      waktu_pulang_iso = null;
    }

    let menit_kerja = 0;
    if (waktu_masuk_iso && waktu_pulang_iso) {
      const dMasuk = new Date(waktu_masuk_iso).getTime();
      const dPulang = new Date(waktu_pulang_iso).getTime();
      if (dPulang > dMasuk) {
        menit_kerja = Math.round((dPulang - dMasuk) / (1000 * 60));
      }
    }

    const menit_lembur_disetujui = Number(fd.get('menit_lembur_disetujui') || 0);

    createMutation.mutate(
      {
        user_id: createUserId,
        tanggal: createDate,
        status_hadir,
        waktu_masuk: waktu_masuk_iso,
        waktu_pulang: waktu_pulang_iso,
        menit_kerja,
        menit_telat: Number(fd.get('menit_telat') || 0),
        menit_lembur_aktual: menit_lembur_disetujui,
        menit_lembur_disetujui,
        status_lembur: (fd.get('status_lembur') as any) || 'tidak_ada',
        lokasi_masuk_id: createLokasiId || null,
        lokasi_pulang_id: createLokasiId || null,
      },
      {
        onSuccess: () => setIsCreateOpen(false),
      }
    );
  };

  return (
    <>
      {/* Edit Modal */}
      {selectedKehadiran && (
        <Modal
          isOpen={!!selectedKehadiran}
          onClose={() => setSelectedKehadiran(null)}
          title={`Edit Kehadiran: ${selectedKehadiran.profiles?.nama}`}
          isBottomSheetOnMobile
        >
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 mt-4">
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 mb-1 flex items-center justify-between">
              <span className="text-sm text-neutral-500">Tanggal:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {format(new Date(selectedKehadiran.tanggal), 'EEEE, dd MMM yyyy', { locale: idLocale })}
              </span>
            </div>

            {/* Location & GPS Info */}
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 mb-2">
                <IconMapPin size={15} />
                <span>Informasi Lokasi & Akurasi GPS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-neutral-500 dark:text-neutral-400">Absen Masuk:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedKehadiran.lokasi_masuk?.nama || (selectedKehadiran.lat_masuk ? 'Tercatat via GPS' : 'Tanpa data lokasi')}
                  </span>
                  {selectedKehadiran.accuracy_masuk && (
                    <span className="text-[10px] text-neutral-400">Akurasi: ±{Math.round(selectedKehadiran.accuracy_masuk)}m</span>
                  )}
                  {selectedKehadiran.lat_masuk && selectedKehadiran.lng_masuk && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedKehadiran.lat_masuk},${selectedKehadiran.lng_masuk}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline dark:text-teal-400 mt-0.5"
                    >
                      <IconExternalLink size={11} />
                      Buka Koordinat Maps
                    </a>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-neutral-500 dark:text-neutral-400">Absen Pulang:</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {selectedKehadiran.lokasi_pulang?.nama || (selectedKehadiran.lat_pulang ? 'Tercatat via GPS' : 'Tanpa data lokasi')}
                  </span>
                  {selectedKehadiran.accuracy_pulang && (
                    <span className="text-[10px] text-neutral-400">Akurasi: ±{Math.round(selectedKehadiran.accuracy_pulang)}m</span>
                  )}
                  {selectedKehadiran.lat_pulang && selectedKehadiran.lng_pulang && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedKehadiran.lat_pulang},${selectedKehadiran.lng_pulang}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:underline dark:text-teal-400 mt-0.5"
                    >
                      <IconExternalLink size={11} />
                      Buka Koordinat Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            <SelectInput
              label="Status Kehadiran"
              name="status_hadir"
              value={editStatusHadir}
              onChange={setEditStatusHadir}
              options={[
                { label: 'Hadir', value: 'hadir' },
                { label: 'Izin', value: 'izin' },
                { label: 'Sakit', value: 'sakit' },
                { label: 'Alpha', value: 'alpha' },
                { label: 'Off', value: 'off' },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <SelectInput
                label="Toko Masuk"
                name="lokasi_masuk_id"
                value={editLokasiMasukId}
                onChange={setEditLokasiMasukId}
                options={storeFormOptions}
              />
              <SelectInput
                label="Toko Pulang"
                name="lokasi_pulang_id"
                value={editLokasiPulangId}
                onChange={setEditLokasiPulangId}
                options={storeFormOptions}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Waktu Masuk"
                name="waktu_masuk"
                type="time"
                defaultValue={getTimeFromIso(selectedKehadiran.waktu_masuk)}
                required={editStatusHadir === 'hadir'}
                disabled={editStatusHadir !== 'hadir'}
              />
              <TextInput
                label="Waktu Pulang"
                name="waktu_pulang"
                type="time"
                defaultValue={getTimeFromIso(selectedKehadiran.waktu_pulang)}
                disabled={editStatusHadir !== 'hadir'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Menit Telat"
                name="menit_telat"
                type="number"
                min={0}
                defaultValue={selectedKehadiran.menit_telat.toString()}
              />
              <TextInput
                label="Lembur Disetujui (Menit)"
                name="menit_lembur_disetujui"
                type="number"
                min={0}
                defaultValue={(selectedKehadiran.menit_lembur_disetujui || 0).toString()}
              />
            </div>

            <SelectInput
              label="Status Lembur"
              name="status_lembur"
              value={editStatusLembur}
              onChange={setEditStatusLembur}
              options={[
                { label: 'Tidak Ada', value: 'tidak_ada' },
                { label: 'Pending', value: 'pending' },
                { label: 'Disetujui', value: 'disetujui' },
                { label: 'Ditolak', value: 'ditolak' },
              ]}
            />

            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              className="mt-4"
              loading={updateMutation.isPending}
            >
              Simpan Perubahan
            </Button>
          </form>
        </Modal>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Tambah Entri Kehadiran"
          isBottomSheetOnMobile
        >
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 mt-4">
            <SelectInput
              label="Karyawan"
              name="user_id"
              value={createUserId}
              onChange={setCreateUserId}
              options={karyawanIdOptions}
              placeholder="Pilih Karyawan..."
              searchPlaceholder="Cari nama karyawan..."
              required
            />
            
            <TextInput
              label="Tanggal"
              name="tanggal"
              type="date"
              value={createDate}
              onChange={(e) => setCreateDate(e.target.value)}
              required
            />

            <SelectInput
              label="Lokasi Toko"
              name="lokasi_id"
              value={createLokasiId}
              onChange={setCreateLokasiId}
              options={storeFormOptions}
            />

            <SelectInput
              label="Status Kehadiran"
              name="status_hadir"
              value={createStatusHadir}
              onChange={setCreateStatusHadir}
              options={[
                { label: 'Hadir', value: 'hadir' },
                { label: 'Izin', value: 'izin' },
                { label: 'Sakit', value: 'sakit' },
                { label: 'Alpha', value: 'alpha' },
                { label: 'Off', value: 'off' },
              ]}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Waktu Masuk"
                name="waktu_masuk"
                type="time"
                defaultValue="09:00"
                required={createStatusHadir === 'hadir'}
                disabled={createStatusHadir !== 'hadir'}
              />
              <TextInput
                label="Waktu Pulang"
                name="waktu_pulang"
                type="time"
                disabled={createStatusHadir !== 'hadir'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Menit Telat"
                name="menit_telat"
                type="number"
                min={0}
                defaultValue="0"
              />
              <TextInput
                label="Lembur Disetujui (Menit)"
                name="menit_lembur_disetujui"
                type="number"
                min={0}
                defaultValue="0"
              />
            </div>

            <SelectInput
              label="Status Lembur"
              name="status_lembur"
              value={createStatusLembur}
              onChange={setCreateStatusLembur}
              options={[
                { label: 'Tidak Ada', value: 'tidak_ada' },
                { label: 'Pending', value: 'pending' },
                { label: 'Disetujui', value: 'disetujui' },
                { label: 'Ditolak', value: 'ditolak' },
              ]}
            />

            <Button 
              type="submit" 
              variant="primary" 
              fullWidth 
              className="mt-4"
              loading={createMutation.isPending}
            >
              Simpan Entri
            </Button>
          </form>
        </Modal>
      )}

      {/* Modal Review Pulang Awal */}
      {reviewPulangAwalModalItem && (
        <Modal
          isOpen={!!reviewPulangAwalModalItem}
          onClose={() => setReviewPulangAwalModalItem(null)}
          title="Review Kepulangan Lebih Awal"
          size="md"
          isBottomSheetOnMobile
        >
          <div className="flex flex-col gap-4 mt-2">
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/40 dark:border-amber-900/40">
                <div>
                  <h4 className="font-bold text-base text-neutral-900 dark:text-white">
                    {reviewPulangAwalModalItem.profiles?.nama || 'Unknown'}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {format(new Date(reviewPulangAwalModalItem.tanggal), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
                  </p>
                </div>
                <Badge variant="warning">Pulang {reviewPulangAwalModalItem.menit_pulang_awal || 0} Menit Lebih Awal</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Jam Masuk:</span>
                  <span className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200">
                    {getTimeFromIso(reviewPulangAwalModalItem.waktu_masuk) || '--:--'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Jam Pulang Aktual:</span>
                  <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-300">
                    {getTimeFromIso(reviewPulangAwalModalItem.waktu_pulang_aktual || reviewPulangAwalModalItem.waktu_pulang) || '--:--'}
                  </span>
                </div>
              </div>

              {reviewPulangAwalModalItem.alasan_pulang_awal && (
                <div className="mt-3 pt-3 border-t border-amber-200/40 dark:border-amber-900/40">
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 block mb-0.5">Alasan Karyawan:</span>
                  <p className="text-xs italic text-neutral-800 dark:text-neutral-200 bg-white/60 dark:bg-neutral-900/50 p-2.5 rounded-xl border border-amber-200/30">
                    &quot;{reviewPulangAwalModalItem.alasan_pulang_awal}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Pilih Keputusan Penghitungan Absensi:
              </p>

              {/* Option 1: Hitung Penuh */}
              <button
                type="button"
                onClick={() => reviewPulangAwalMutation.mutate(
                  { id: reviewPulangAwalModalItem.id, keputusan: 'hitung_penuh' },
                  { onSuccess: () => setReviewPulangAwalModalItem(null) }
                )}
                disabled={reviewPulangAwalMutation.isPending}
                className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 mt-0.5">
                  <IconCheck size={18} stroke={2.5} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Hitung Penuh</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Jam clockout otomatis diset ke jam pulang jadwal shift dan durasi kerja dihitung penuh.
                  </p>
                </div>
              </button>

              {/* Option 2: Sesuai Durasi */}
              <button
                type="button"
                onClick={() => reviewPulangAwalMutation.mutate(
                  { id: reviewPulangAwalModalItem.id, keputusan: 'sesuai_durasi' },
                  { onSuccess: () => setReviewPulangAwalModalItem(null) }
                )}
                disabled={reviewPulangAwalMutation.isPending}
                className="flex items-start gap-3 p-3.5 rounded-2xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 hover:bg-slate-100/70 dark:bg-neutral-800/40 dark:hover:bg-neutral-800/70 text-left transition-all cursor-pointer group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-neutral-700 dark:text-neutral-300 mt-0.5">
                  <IconClock size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-200">Hitung Sesuai Durasi</p>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
                    Jam clockout tetap pada jam pulang aktual dan durasi kerja dihitung riil.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                variant="ghost"
                onClick={() => setReviewPulangAwalModalItem(null)}
                disabled={reviewPulangAwalMutation.isPending}
              >
                Batal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
