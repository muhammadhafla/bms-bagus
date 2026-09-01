'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kehadiranApi, Kehadiran, lokasiKerjaApi } from '@/lib/api/payroll';
import { karyawanApi } from '@/lib/api/payroll/karyawan';
import { DataTable, Button, Modal, TextInput, Badge, SelectInput, DateRangePicker, FilterButton, ModernPagination, type Column } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { 
  IconClock, 
  IconX, 
  IconCalendarEvent, 
  IconCheck, 
  IconChevronRight, 
  IconPlus,
  IconMapPin,
  IconExternalLink,
  IconDownload,
  IconAlertCircle,
  IconUserCheck
} from '@tabler/icons-react';
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

  // Tab State: 'all' | 'lembur'
  const [activeTab, setActiveTab] = useState<'all' | 'lembur'>('all');
  const [selectedLemburIds, setSelectedLemburIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // URL state
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const search = searchParams.get('search') || '';
  const statusHadir = searchParams.get('statusHadir') || 'all';
  const lokasiId = searchParams.get('lokasiId') || 'all';

  const updateFilters = (newFilters: { search?: string; startDate?: string; endDate?: string; statusHadir?: string; lokasiId?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFilters.search !== undefined) newFilters.search ? params.set('search', newFilters.search) : params.delete('search');
    if (newFilters.startDate !== undefined) newFilters.startDate ? params.set('startDate', newFilters.startDate) : params.delete('startDate');
    if (newFilters.endDate !== undefined) newFilters.endDate ? params.set('endDate', newFilters.endDate) : params.delete('endDate');
    if (newFilters.statusHadir !== undefined) newFilters.statusHadir && newFilters.statusHadir !== 'all' ? params.set('statusHadir', newFilters.statusHadir) : params.delete('statusHadir');
    if (newFilters.lokasiId !== undefined) newFilters.lokasiId && newFilters.lokasiId !== 'all' ? params.set('lokasiId', newFilters.lokasiId) : params.delete('lokasiId');
    
    // Page reset
    params.set('page', (newFilters.page || 1).toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setPage = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  // Temp state for ResponsivePanel
  const [tempSearch, setTempSearch] = useState(search);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [tempStatusHadir, setTempStatusHadir] = useState(statusHadir);
  const [tempLokasiId, setTempLokasiId] = useState(lokasiId);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 1. Query Live Summary Stats Hari Ini
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['admin_today_kehadiran_summary'],
    queryFn: () => kehadiranApi.getTodaySummary().then(res => res.data),
  });

  // 2. Query Data Kehadiran (Server-Side Paginated)
  const { data: paginatedResult, isLoading: isLoadingList } = useQuery({
    queryKey: ['admin_payroll_kehadiran_paginated', page, limit, search, startDate, endDate, statusHadir, lokasiId, activeTab],
    queryFn: () => kehadiranApi.getPaginated({
      page,
      limit,
      search,
      startDate,
      endDate,
      statusHadir: activeTab === 'lembur' ? undefined : statusHadir,
      lokasiId,
      statusLembur: activeTab === 'lembur' ? 'pending' : undefined
    }).then(res => res.data),
  });

  const list = paginatedResult?.list || [];
  const totalItems = paginatedResult?.total || 0;
  const totalPages = Math.ceil(totalItems / limit);

  // 3. Query Master Karyawan & Toko
  const { data: karyawanList } = useQuery({
    queryKey: ['admin_payroll_karyawan'],
    queryFn: () => karyawanApi.getAll().then(res => res.data),
  });

  const { data: storeList } = useQuery({
    queryKey: ['admin_payroll_stores'],
    queryFn: () => lokasiKerjaApi.getAll().then(res => res.data || []),
  });

  const handleOpenFilter = () => {
    setTempSearch(search);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempStatusHadir(statusHadir);
    setTempLokasiId(lokasiId);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    updateFilters({
      search: tempSearch,
      startDate: tempStartDate,
      endDate: tempEndDate,
      statusHadir: tempStatusHadir,
      lokasiId: tempLokasiId,
      page: 1
    });
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    updateFilters({ search: '', startDate: '', endDate: '', statusHadir: 'all', lokasiId: 'all', page: 1 });
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
    if (lokasiId && lokasiId !== 'all') {
      const selectedStore = storeList?.find(s => s.id === lokasiId);
      badges.push({
        id: 'lokasi',
        label: `Lokasi: ${selectedStore?.nama || 'Toko'}`,
        onRemove: () => updateFilters({ lokasiId: 'all' }),
      });
    }
    return badges;
  };

  const activeFilters = getActiveFilters();

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

  const karyawanIdOptions = useMemo(() => {
    const opts: { label: string, value: string }[] = [];
    if (karyawanList) {
      karyawanList.forEach(k => {
        if (k.user_id && k.profiles?.nama) {
          opts.push({ label: k.profiles.nama, value: k.user_id });
        }
      });
    }
    return opts;
  }, [karyawanList]);

  const storeFilterOptions = useMemo(() => {
    const opts = [{ label: 'Semua Lokasi Toko', value: 'all' }];
    if (storeList) {
      storeList.forEach(s => {
        opts.push({ label: s.nama, value: s.id });
      });
    }
    return opts;
  }, [storeList]);

  const storeFormOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    if (storeList) {
      storeList.forEach(s => {
        opts.push({ label: s.nama, value: s.id });
      });
    }
    return opts;
  }, [storeList]);

  // Bulk Approve Lembur Mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => kehadiranApi.bulkApproveLembur(ids),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Berhasil menyetujui ${res.data || selectedLemburIds.length} entri lembur!`);
      setSelectedLemburIds([]);
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_kehadiran_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['admin_today_kehadiran_summary'] });
    },
    onError: () => toast.error('Gagal melakukan approval lembur')
  });

  const handleSelectAllLembur = () => {
    if (selectedLemburIds.length === list.length) {
      setSelectedLemburIds([]);
    } else {
      setSelectedLemburIds(list.map(item => item.id));
    }
  };

  const handleToggleSelectLembur = (id: string) => {
    setSelectedLemburIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (selectedLemburIds.length === 0) {
      toast.error('Pilih setidaknya satu data lembur');
      return;
    }
    bulkApproveMutation.mutate(selectedLemburIds);
  };

  // Export to CSV Function
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await kehadiranApi.getAll(startDate, endDate, lokasiId, statusHadir);
      if (res.error || !res.data) {
        toast.error('Gagal mengambil data untuk ekspor: ' + (res.error?.message || 'Data kosong'));
        return;
      }

      const exportList = res.data;
      const headers = [
        'Tanggal',
        'Nama Karyawan',
        'Status Hadir',
        'Lokasi Masuk',
        'Lokasi Pulang',
        'Jam Masuk',
        'Jam Pulang',
        'Menit Kerja',
        'Menit Telat',
        'Lembur Aktual (Menit)',
        'Lembur Disetujui (Menit)',
        'Status Lembur'
      ];

      const rows = exportList.map(item => [
        item.tanggal,
        `"${(item.profiles?.nama || 'Unknown').replace(/"/g, '""')}"`,
        item.status_hadir,
        `"${(item.lokasi_masuk?.nama || '-').replace(/"/g, '""')}"`,
        `"${(item.lokasi_pulang?.nama || '-').replace(/"/g, '""')}"`,
        item.waktu_masuk ? format(new Date(item.waktu_masuk), 'HH:mm') : '-',
        item.waktu_pulang ? format(new Date(item.waktu_pulang), 'HH:mm') : '-',
        item.menit_kerja || 0,
        item.menit_telat || 0,
        item.menit_lembur_aktual || 0,
        item.menit_lembur_disetujui || 0,
        item.status_lembur
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `rekap_kehadiran_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Berhasil mengekspor ${exportList.length} data kehadiran!`);
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat ekspor data: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Edit State
  const [selectedKehadiran, setSelectedKehadiran] = useState<Kehadiran | null>(null);
  const [editStatusHadir, setEditStatusHadir] = useState<string>('');
  const [editStatusLembur, setEditStatusLembur] = useState<string>('');
  const [editLokasiMasukId, setEditLokasiMasukId] = useState<string>('');
  const [editLokasiPulangId, setEditLokasiPulangId] = useState<string>('');

  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [createUserId, setCreateUserId] = useState('');
  const [createStatusHadir, setCreateStatusHadir] = useState('hadir');
  const [createStatusLembur, setCreateStatusLembur] = useState('tidak_ada');
  const [createLokasiId, setCreateLokasiId] = useState('');

  const handleOpenEdit = (item: Kehadiran) => {
    setSelectedKehadiran(item);
    setEditStatusHadir(item.status_hadir);
    setEditStatusLembur(item.status_lembur);
    setEditLokasiMasukId(item.lokasi_masuk_id || '');
    setEditLokasiPulangId(item.lokasi_pulang_id || '');
  };

  const createMutation = useMutation({
    mutationFn: (payload: Omit<Kehadiran, 'id' | 'created_at' | 'profiles'>) => {
      return kehadiranApi.createKehadiran(payload);
    },
    onSuccess: (res) => {
      if (res.error) {
        if (res.error.message?.includes('duplicate key') || res.error.message?.includes('kehadiran_user_id_tanggal_key') || res.error.message?.includes('409')) {
          toast.error('Karyawan ini sudah memiliki entri pada tanggal tersebut. Silakan edit entri yang sudah ada.');
        } else {
          toast.error('Gagal membuat entri: ' + res.error.message);
        }
        return;
      }
      toast.success('Entri kehadiran berhasil dibuat!');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_kehadiran_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['admin_today_kehadiran_summary'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

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

    createMutation.mutate({
      user_id: createUserId,
      tanggal: createDate,
      status_hadir,
      waktu_masuk: waktu_masuk_iso,
      waktu_pulang: waktu_pulang_iso,
      menit_kerja: 0,
      menit_telat: Number(fd.get('menit_telat') || 0),
      menit_lembur_aktual: 0,
      menit_lembur_disetujui: Number(fd.get('menit_lembur_disetujui') || 0),
      status_lembur: (fd.get('status_lembur') as any) || 'tidak_ada',
      lokasi_masuk_id: createLokasiId || null,
      lokasi_pulang_id: createLokasiId || null,
    });
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
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_kehadiran_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['admin_today_kehadiran_summary'] });
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

    updateMutation.mutate({
      id: selectedKehadiran.id,
      status_hadir,
      waktu_masuk: waktu_masuk_iso,
      waktu_pulang: waktu_pulang_iso,
      menit_telat,
      menit_lembur_disetujui,
      status_lembur,
      lokasi_masuk_id: editLokasiMasukId || null,
      lokasi_pulang_id: editLokasiPulangId || null,
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
      case 'off': return <Badge variant="default">Off</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const columns: Column<Kehadiran>[] = [
    ...(activeTab === 'lembur' ? [{
      key: 'checkbox',
      header: 'Pilih',
      render: (row: Kehadiran) => (
        <input 
          type="checkbox" 
          checked={selectedLemburIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleSelectLembur(row.id);
          }}
          className="rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
        />
      )
    }] : []),
    { 
      key: 'tanggal', 
      header: 'Tanggal', 
      render: (row: Kehadiran) => (
        <span className="font-medium text-neutral-900 dark:text-white">
          {format(new Date(row.tanggal), 'dd MMM yyyy', { locale: idLocale })}
        </span>
      )
    },
    { 
      key: 'nama', 
      header: 'Nama Karyawan', 
      render: (row: Kehadiran) => (
        <span className="font-medium text-neutral-900 dark:text-white">
          {row.profiles?.nama || 'Unknown'}
        </span>
      ) 
    },
    { 
      key: 'status_hadir', 
      header: 'Kehadiran', 
      render: (row: Kehadiran) => getStatusBadge(row.status_hadir) 
    },
    {
      key: 'lokasi',
      header: 'Lokasi Toko',
      render: (row: Kehadiran) => {
        const storeMasuk = row.lokasi_masuk?.nama;
        const storePulang = row.lokasi_pulang?.nama;

        if (storeMasuk && storePulang && storeMasuk !== storePulang) {
          return (
            <div className="flex flex-col gap-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                <span className="inline-flex h-4 px-1.5 items-center justify-center rounded bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 text-[10px] font-bold">
                  Masuk
                </span>
                <span className="truncate">{storeMasuk}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                <span className="inline-flex h-4 px-1.5 items-center justify-center rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold">
                  Pulang
                </span>
                <span className="truncate">{storePulang}</span>
              </span>
            </div>
          );
        }

        const storeName = storeMasuk || storePulang;
        if (storeName) {
          return (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
              <IconMapPin size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
              <span>{storeName}</span>
            </div>
          );
        }

        return <span className="text-neutral-400 text-xs">-</span>;
      }
    },
    { 
      key: 'waktu', 
      header: 'Waktu (M - P)', 
      render: (row: Kehadiran) => (
        <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
          {getTimeFromIso(row.waktu_masuk)} - {getTimeFromIso(row.waktu_pulang) || '--:--'}
        </span>
      ) 
    },
    { 
      key: 'telat', 
      header: 'Telat', 
      render: (row: Kehadiran) => {
        if (row.menit_telat > 30) {
          return <span className="text-rose-600 font-semibold text-xs">{row.menit_telat}m (Denda)</span>;
        }
        if (row.menit_telat > 0) {
          return <span className="text-amber-600 font-medium text-xs">{row.menit_telat}m (Toleransi)</span>;
        }
        return <span className="text-neutral-400">-</span>;
      }
    },
    { 
      key: 'lembur', 
      header: 'Lembur', 
      render: (row: Kehadiran) => {
        if (row.status_lembur === 'disetujui') return <Badge variant="success">+{row.menit_lembur_disetujui}m</Badge>;
        if (row.status_lembur === 'pending') return <Badge variant="warning">Pending {row.menit_lembur_aktual}m</Badge>;
        if (row.status_lembur === 'ditolak') return <Badge variant="danger">Ditolak</Badge>;
        return <span className="text-neutral-400">-</span>;
      }
    }
  ];

  return (
    <div className="flex flex-col gap-3 px-2 py-4 w-full md:p-4 lg:p-8 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-row items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            <IconClock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-white">Kelola Kehadiran</h1>
            <p className="hidden md:block text-[11px] sm:text-sm text-neutral-500 leading-snug">Pantau presensi, keterlambatan, dan persetujuan lembur karyawan.</p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button 
            variant="secondary"
            onClick={handleExportCsv}
            loading={isExporting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:w-auto sm:!px-3.5 sm:!py-2 text-xs font-semibold"
          >
            <IconDownload size={17} className="shrink-0" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </Button>

          <Button 
            variant="primary" 
            onClick={() => setIsCreateOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl !min-h-0 !p-0 sm:w-auto sm:!px-4 sm:!py-2"
          >
            <IconPlus size={18} className="shrink-0" />
            <span className="hidden font-medium sm:inline">Tambah Entri</span>
          </Button>
          
          <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} className="!mt-0 !mr-0" />
        </div>
      </div>

      {/* 4-Card Live Stats Summary Widget */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-1">
        {/* Card 1: Hadir Hari Ini */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-500">Hadir Hari Ini</span>
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <IconUserCheck size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono">
              {isLoadingSummary ? '--' : `${summaryData?.total_hadir || 0}/${summaryData?.total_aktif || 0}`}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isLoadingSummary ? 'Memuat...' : `${summaryData?.hadir_tepat || 0} tepat, ${summaryData?.hadir_telat || 0} telat`}
            </p>
          </div>
        </div>

        {/* Card 2: Terlambat */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-500">Terlambat</span>
            <div className="p-1 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <IconClock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {isLoadingSummary ? '--' : summaryData?.hadir_telat || 0}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Tercatat datang setelah jam masuk
            </p>
          </div>
        </div>

        {/* Card 3: Izin / Sakit / Off */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-500">Izin / Sakit / Off</span>
            <div className="p-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <IconCalendarEvent size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {isLoadingSummary ? '--' : (summaryData?.izin || 0) + (summaryData?.sakit || 0) + (summaryData?.off || 0)}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isLoadingSummary ? 'Memuat...' : `${summaryData?.izin || 0} izin, ${summaryData?.sakit || 0} sakit, ${summaryData?.off || 0} off`}
            </p>
          </div>
        </div>

        {/* Card 4: Pending Lembur */}
        <div 
          onClick={() => setActiveTab('lembur')}
          className="rounded-2xl border border-neutral-200/80 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between cursor-pointer hover:border-teal-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-500">Pending Lembur</span>
            <div className="p-1 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
              <IconAlertCircle size={16} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
              {isLoadingSummary ? '--' : summaryData?.pending_lembur || 0}
            </div>
            <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5 font-medium">
              Ketuk untuk tinjau lembur &rarr;
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Bulk Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedLemburIds([]);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Semua Presensi
          </button>
          <button
            onClick={() => {
              setActiveTab('lembur');
              setSelectedLemburIds([]);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'lembur'
                ? 'bg-white dark:bg-neutral-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Persetujuan Lembur</span>
            {(summaryData?.pending_lembur || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
                {summaryData?.pending_lembur}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'lembur' && selectedLemburIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={bulkApproveMutation.isPending}
              onClick={handleBulkApprove}
              leftIcon={<IconCheck size={16} />}
              className="!bg-teal-600 hover:!bg-teal-700 text-white"
            >
              Setujui {selectedLemburIds.length} Lembur Terpilih
            </Button>
          </div>
        )}
      </div>

      {/* Active Filter Badges */}
      <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap">
        {activeFilters.length === 0 && (
          <span className="text-xs text-neutral-400 italic">
            Menampilkan data kehadiran ({totalItems} total entri)
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

      {/* Desktop Table View */}
      <div className="hidden lg:flex overflow-hidden flex-col min-h-[500px] rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        {isLoadingList ? (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <DataTable 
              columns={columns}
              data={list}
              keyField="id"
              className="border-none flex-1"
              onRowClick={handleOpenEdit}
              emptyState={
                <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <IconCalendarEvent className="mb-2 h-10 w-10 opacity-20" />
                  <p>Tidak ada data presensi yang ditemukan.</p>
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
        {isLoadingList ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
            <IconCalendarEvent className="mb-2 h-10 w-10 opacity-20" />
            <p>Tidak ada data kehadiran yang ditemukan.</p>
          </div>
        ) : (
          <>
            {list.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenEdit(item)}
                className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl transition-all duration-200 hover:bg-neutral-50/90 active:scale-[0.98] dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {activeTab === 'lembur' && (
                      <input 
                        type="checkbox" 
                        checked={selectedLemburIds.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelectLembur(item.id);
                        }}
                        className="mt-0.5 rounded border-neutral-300 text-teal-600 focus:ring-teal-500"
                      />
                    )}
                    <div>
                      <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
                        {item.profiles?.nama || 'Unknown'}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <IconCalendarEvent size={12} />
                          {format(new Date(item.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                        </span>
                        {(item.lokasi_masuk?.nama || item.lokasi_pulang?.nama) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-400">
                            <IconMapPin size={12} className="shrink-0 text-teal-600" />
                            <span>{item.lokasi_masuk?.nama || item.lokasi_pulang?.nama}</span>
                          </span>
                        )}
                      </div>
                    </div>
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
                    <span className={`text-xs font-semibold ${item.menit_telat > 30 ? 'text-rose-500 dark:text-rose-400' : item.menit_telat > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-900 dark:text-white'}`}>
                      {item.menit_telat > 30 ? `${item.menit_telat}m (Denda)` : item.menit_telat > 0 ? `${item.menit_telat}m (Grace)` : '0m'}
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

      {/* Filter SlideOver Panel */}
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
            <SelectInput
              label="Lokasi Toko"
              value={tempLokasiId}
              onChange={(val) => setTempLokasiId(val)}
              options={storeFilterOptions}
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
    </div>
  );
}
