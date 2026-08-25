'use client';

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kehadiranApi, Kehadiran } from '@/lib/api/payroll';
import { karyawanApi } from '@/lib/api/payroll/karyawan';
import { Card, DataTable, Button, Modal, TextInput, Badge, SelectInput, DateRangePicker, FilterButton, ModernPagination, type Column } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { IconClock, IconEdit, IconX, IconSearch, IconCalendarEvent, IconCheck, IconChevronRight } from '@tabler/icons-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function AdminKehadiranPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat halaman...</div>}>
      <AdminKehadiranContent />
    </Suspense>
  );
}

function AdminKehadiranContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // URL state
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const search = searchParams.get('search') || '';
  const statusHadir = searchParams.get('statusHadir') || 'all';

  const updateFilters = (newFilters: { search?: string; startDate?: string; endDate?: string; statusHadir?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.search !== undefined) newFilters.search ? params.set('search', newFilters.search) : params.delete('search');
    if (newFilters.startDate !== undefined) newFilters.startDate ? params.set('startDate', newFilters.startDate) : params.delete('startDate');
    if (newFilters.endDate !== undefined) newFilters.endDate ? params.set('endDate', newFilters.endDate) : params.delete('endDate');
    if (newFilters.statusHadir !== undefined) newFilters.statusHadir && newFilters.statusHadir !== 'all' ? params.set('statusHadir', newFilters.statusHadir) : params.delete('statusHadir');
    
    // Reset page to 1 when filters change
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Temp state for ResponsivePanel
  const [tempSearch, setTempSearch] = useState(search);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [tempStatusHadir, setTempStatusHadir] = useState(statusHadir);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleOpenFilter = () => {
    setTempSearch(search);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempStatusHadir(statusHadir);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    updateFilters({
      search: tempSearch,
      startDate: tempStartDate,
      endDate: tempEndDate,
      statusHadir: tempStatusHadir,
    });
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    updateFilters({ search: '', startDate: '', endDate: '', statusHadir: 'all' });
    setIsFilterOpen(false);
  };

  const getActiveFilters = () => {
    const badges = [];
    if (search) {
      badges.push({ id: 'search', label: `Karyawan: ${search}`, onRemove: () => updateFilters({ search: '' }) });
    }
    if (startDate && endDate) {
      badges.push({
        id: 'date',
        label: `${startDate} - ${endDate}`,
        onRemove: () => updateFilters({ startDate: '', endDate: '' }),
      });
    }
    if (statusHadir && statusHadir !== 'all') {
      badges.push({
        id: 'status',
        label: `Status: ${statusHadir.charAt(0).toUpperCase() + statusHadir.slice(1)}`,
        onRemove: () => updateFilters({ statusHadir: 'all' }),
      });
    }
    return badges;
  };

  const activeFilters = getActiveFilters();

  // Query Data
  const { data: list, isLoading } = useQuery({
    queryKey: ['admin_payroll_kehadiran', startDate, endDate],
    queryFn: () => kehadiranApi.getAll(startDate, endDate).then(res => res.data),
  });

  const { data: karyawanList } = useQuery({
    queryKey: ['admin_payroll_karyawan'],
    queryFn: () => karyawanApi.getAll().then(res => res.data),
  });

  const karyawanOptions = useMemo(() => {
    const opts = [{ label: 'Semua Karyawan', value: '' }];
    if (karyawanList) {
      karyawanList.forEach(k => {
        if (k.profiles?.nama) {
          opts.push({ label: k.profiles.nama, value: k.profiles.nama });
        }
      });
    }
    return opts;
  }, [karyawanList]);

  // Client-side filtering
  const filteredList = useMemo(() => {
    if (!list) return [];
    return list.filter(item => {
      let matchSearch = true;
      let matchStatus = true;
      if (search) {
        matchSearch = (item.profiles?.nama || '').toLowerCase().includes(search.toLowerCase());
      }
      if (statusHadir && statusHadir !== 'all') {
        matchStatus = item.status_hadir === statusHadir;
      }
      return matchSearch && matchStatus;
    });
  }, [list, search, statusHadir]);

  // Pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / limit);
  
  const paginatedList = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredList.slice(startIndex, startIndex + limit);
  }, [filteredList, page, limit]);

  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Edit State
  const [selectedKehadiran, setSelectedKehadiran] = useState<Kehadiran | null>(null);
  const [editStatusHadir, setEditStatusHadir] = useState<string>('');
  const [editStatusLembur, setEditStatusLembur] = useState<string>('');

  const handleOpenEdit = (item: Kehadiran) => {
    setSelectedKehadiran(item);
    setEditStatusHadir(item.status_hadir);
    setEditStatusLembur(item.status_lembur);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Kehadiran> & { id: string }) => {
      const { id, ...rest } = payload;
      return kehadiranApi.updateKehadiran(id, rest);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal menyimpan: ' + res.error.message);
        return;
      }
      toast.success('Data Kehadiran berhasil diupdate!');
      setSelectedKehadiran(null);
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_kehadiran'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

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

    // We must combine the original Date with the new Time.
    const originalDateStr = selectedKehadiran.tanggal; // 'YYYY-MM-DD'
    
    let waktu_masuk_iso = selectedKehadiran.waktu_masuk;
    if (waktu_masuk_time) {
      const d = new Date(`${originalDateStr}T${waktu_masuk_time}:00`);
      if (!isNaN(d.getTime())) waktu_masuk_iso = d.toISOString();
    }
    
    let waktu_pulang_iso = selectedKehadiran.waktu_pulang || null;
    if (waktu_pulang_time) {
      const d = new Date(`${originalDateStr}T${waktu_pulang_time}:00`);
      if (!isNaN(d.getTime())) waktu_pulang_iso = d.toISOString();
    }

    updateMutation.mutate({
      id: selectedKehadiran.id,
      status_hadir,
      waktu_masuk: waktu_masuk_iso,
      waktu_pulang: waktu_pulang_iso,
      menit_telat,
      menit_lembur_disetujui,
      status_lembur,
    });
  };

  const getTimeFromIso = (isoString?: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir': return <Badge variant="success">Hadir</Badge>;
      case 'izin': return <Badge variant="warning">Izin</Badge>;
      case 'sakit': return <Badge variant="warning">Sakit</Badge>;
      case 'alpha': return <Badge variant="danger">Alpha</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns: Column<Kehadiran>[] = [
    { 
      key: 'tanggal', 
      header: 'Tanggal', 
      render: (row: Kehadiran) => (
        <span className="font-medium">{format(new Date(row.tanggal), 'dd MMM yyyy', { locale: idLocale })}</span>
      )
    },
    { key: 'nama', header: 'Nama Karyawan', render: (row: Kehadiran) => row.profiles?.nama || 'Unknown' },
    { key: 'status_hadir', header: 'Kehadiran', render: (row: Kehadiran) => getStatusBadge(row.status_hadir) },
    { 
      key: 'waktu', 
      header: 'Waktu (M - P)', 
      render: (row: Kehadiran) => (
        <span className="font-mono text-xs">
          {getTimeFromIso(row.waktu_masuk)} - {getTimeFromIso(row.waktu_pulang) || '--:--'}
        </span>
      ) 
    },
    { 
      key: 'telat', 
      header: 'Telat', 
      render: (row: Kehadiran) => row.menit_telat > 0 ? <span className="text-rose-500 font-medium">{row.menit_telat}m</span> : <span className="text-neutral-400">-</span>
    },
    { 
      key: 'lembur', 
      header: 'Lembur', 
      render: (row: Kehadiran) => {
        if (row.status_lembur === 'disetujui') return <Badge variant="success">+{row.menit_lembur_disetujui}m</Badge>;
        if (row.status_lembur === 'pending') return <Badge variant="warning">Pending</Badge>;
        if (row.status_lembur === 'ditolak') return <Badge variant="danger">Ditolak</Badge>;
        return <span className="text-neutral-400">-</span>;
      }
    },
    { 
      key: 'aksi',
      header: 'Aksi', 
      render: (row: Kehadiran) => (
        <Button 
          variant="secondary" 
          size="sm" 
          leftIcon={<IconEdit size={16} />}
          onClick={() => handleOpenEdit(row)}
        >
          Edit
        </Button>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-2 px-2 py-4 w-full md:p-4 lg:p-8 pb-20">
      <div className="flex flex-row items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            <IconClock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-white">Kelola Kehadiran</h1>
            <p className="hidden md:block text-[11px] sm:text-sm text-neutral-500 leading-snug">Pantau absen dan lembur karyawan.</p>
          </div>
        </div>

        <div className="shrink-0 mt-0.5">
          <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} />
        </div>
      </div>

      <div className="no-scrollbar mb-2 flex w-full items-center gap-2 overflow-x-auto py-1 sm:py-2 whitespace-nowrap">
        {activeFilters.length === 0 && (
          <span className="text-xs sm:text-sm text-neutral-500 italic dark:text-neutral-400">
            Menampilkan semua data kehadiran
          </span>
        )}
        {activeFilters.map((badge) => (
          <div
            key={badge.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/50 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {badge.label}
            {badge.onRemove && (
              <button
                onClick={badge.onRemove}
                className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="hidden lg:flex overflow-hidden flex-col min-h-[500px] rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <DataTable 
              columns={columns}
              data={paginatedList}
              keyField="id"
              className="border-none flex-1"
              onRowClick={handleOpenEdit}
              emptyState={
                <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <IconCalendarEvent className="mb-2 h-10 w-10 opacity-20" />
                  <p>Tidak ada data kehadiran yang ditemukan.</p>
                </div>
              }
            />
            
            <ModernPagination
              page={page}
              totalPages={totalPages}
              total={totalItems}
              limit={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      <div className="block space-y-3 lg:hidden">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : paginatedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
            <IconCalendarEvent className="mb-2 h-10 w-10 opacity-20" />
            <p>Tidak ada data kehadiran yang ditemukan.</p>
          </div>
        ) : (
          <>
            {paginatedList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-neutral-50/90 active:scale-[0.98] dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
                      {item.profiles?.nama || 'Unknown'}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                      <IconCalendarEvent size={12} />
                      {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="origin-top-right scale-90">
                      {getStatusBadge(item.status_hadir)}
                    </div>
                    <div className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-neutral-400 transition-all group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-900/20 dark:group-hover:text-brand-400">
                      <IconChevronRight size={18} stroke={2.5} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-1 grid grid-cols-3 gap-x-4 gap-y-1.5 border-t border-neutral-100 pt-2 text-[13px] dark:border-neutral-800/60">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Masuk</span>
                    <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">{getTimeFromIso(item.waktu_masuk) || '--:--'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Pulang</span>
                    <span className="font-mono text-sm font-medium text-neutral-900 dark:text-white">{getTimeFromIso(item.waktu_pulang) || '--:--'}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">Telat</span>
                    <span className={`text-sm font-medium ${item.menit_telat > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                      {item.menit_telat}m
                    </span>
                  </div>
                </div>
                
                {item.status_lembur !== 'tidak_ada' && (
                  <div className="mt-1 flex items-center gap-1.5 border-t border-neutral-100 pt-2 text-[11px] dark:border-neutral-800/60">
                    <span className="text-neutral-500">Lembur:</span>
                    <div className="origin-left scale-90">
                      {item.status_lembur === 'disetujui' && <Badge variant="success">+{item.menit_lembur_disetujui}m</Badge>}
                      {item.status_lembur === 'pending' && <Badge variant="warning">Pending {item.menit_lembur_aktual}m</Badge>}
                      {item.status_lembur === 'ditolak' && <Badge variant="danger">Ditolak</Badge>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {totalPages > 1 && (
              <ModernPagination
                page={page}
                totalPages={totalPages}
                total={totalItems}
                limit={limit}
                onPageChange={setPage}
                className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
              />
            )}
          </>
        )}
      </div>

      {/* Filter SlideOver */}
      <ResponsivePanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Kehadiran"
      >
        <div className="space-y-6">
          <div>
            <SelectInput
              label="Karyawan"
              value={tempSearch}
              onChange={(val) => setTempSearch(val)}
              options={karyawanOptions}
            />
          </div>

          <div>
            <DateRangePicker
              startDate={tempStartDate}
              endDate={tempEndDate}
              onChange={(start, end) => {
                setTempStartDate(start);
                setTempEndDate(end);
              }}
              label="Periode Tanggal"
              className="w-full"
            />
          </div>

          <div>
            <SelectInput
              label="Status Kehadiran"
              value={tempStatusHadir}
              onChange={(val) => setTempStatusHadir(val)}
              options={[
                { label: 'Semua Status', value: 'all' },
                { label: 'Hadir', value: 'hadir' },
                { label: 'Izin', value: 'izin' },
                { label: 'Sakit', value: 'sakit' },
                { label: 'Alpha', value: 'alpha' },
                { label: 'Off', value: 'off' },
              ]}
            />
          </div>

          <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <Button variant="secondary" className="w-1/2" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" className="w-1/2" onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        </div>
      </ResponsivePanel>

      {/* Edit Modal */}
      {selectedKehadiran && (
        <Modal
          isOpen={!!selectedKehadiran}
          onClose={() => setSelectedKehadiran(null)}
          title={`Edit Kehadiran: ${selectedKehadiran.profiles?.nama}`}
          isBottomSheetOnMobile
        >
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 mt-4">
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 mb-2 flex items-center justify-between">
              <span className="text-sm text-neutral-500">Tanggal:</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {format(new Date(selectedKehadiran.tanggal), 'EEEE, dd MMM yyyy', { locale: idLocale })}
              </span>
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
              <TextInput
                label="Waktu Masuk"
                name="waktu_masuk"
                type="time"
                defaultValue={getTimeFromIso(selectedKehadiran.waktu_masuk)}
                required
              />
              <TextInput
                label="Waktu Pulang"
                name="waktu_pulang"
                type="time"
                defaultValue={getTimeFromIso(selectedKehadiran.waktu_pulang)}
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
    </div>
  );
}
