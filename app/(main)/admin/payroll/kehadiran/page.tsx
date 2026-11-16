'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeQuery } from '@/lib/hooks/useRealtimeQuery';
import { kehadiranApi, Kehadiran, lokasiKerjaApi } from '@/lib/api/payroll';
import { karyawanApi } from '@/lib/api/payroll/karyawan';
import { Button } from '@/components/ui';
import { 
  IconClock, 
  IconCalendarEvent, 
  IconCheck, 
  IconAlertCircle,
  IconUserCheck,
  IconSearch,
  IconX
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { downloadOrShareFile } from '@/lib/utils/file-share';

import { useKehadiranMutations } from './_hooks/useKehadiranMutations';
import { KehadiranTable } from './_components/KehadiranTable';
import { KehadiranFilters, FilterBadges, FilterState } from './_components/KehadiranFilters';
import { KehadiranModals } from './_components/KehadiranModals';

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

  const tabParam = searchParams.get('tab') as 'all' | 'pulang_awal' | 'lembur' | null;

  // Tab State disinkronkan langsung dengan URL searchParams
  const activeTab = tabParam && ['all', 'pulang_awal', 'lembur'].includes(tabParam) ? tabParam : 'all';

  const [selectedLemburIds, setSelectedLemburIds] = useState<string[]>([]);
  const [selectedPulangAwalIds, setSelectedPulangAwalIds] = useState<string[]>([]);
  const [reviewPulangAwalModalItem, setReviewPulangAwalModalItem] = useState<Kehadiran | null>(null);
  const [reviewLemburModalItem, setReviewLemburModalItem] = useState<Kehadiran | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedKehadiran, setSelectedKehadiran] = useState<Kehadiran | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // URL state
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const search = searchParams.get('search') || '';
  const statusHadir = searchParams.get('statusHadir') || 'all';
  const lokasiId = searchParams.get('lokasiId') || 'all';

  const updateFilters = useCallback((newFilters: FilterState & { tab?: 'all' | 'pulang_awal' | 'lembur' }) => {
    const params = new URLSearchParams(searchParams.toString());
    const targetTab = newFilters.tab !== undefined ? newFilters.tab : activeTab;
    if (targetTab && targetTab !== 'all') {
      params.set('tab', targetTab);
    } else {
      params.delete('tab');
    }
    if (newFilters.search !== undefined) newFilters.search ? params.set('search', newFilters.search) : params.delete('search');
    if (newFilters.startDate !== undefined) newFilters.startDate ? params.set('startDate', newFilters.startDate) : params.delete('startDate');
    if (newFilters.endDate !== undefined) newFilters.endDate ? params.set('endDate', newFilters.endDate) : params.delete('endDate');
    if (newFilters.statusHadir !== undefined) newFilters.statusHadir && newFilters.statusHadir !== 'all' ? params.set('statusHadir', newFilters.statusHadir) : params.delete('statusHadir');
    if (newFilters.lokasiId !== undefined) newFilters.lokasiId && newFilters.lokasiId !== 'all' ? params.set('lokasiId', newFilters.lokasiId) : params.delete('lokasiId');
    
    params.set('page', (newFilters.page || 1).toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, activeTab, pathname, router]);

  // Inline Search State with Debounce (350ms)
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilters({ search: searchInput, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, updateFilters]);

  const setPage = (newPage: number) => {
    updateFilters({ page: newPage });
  };

  const handleTabChange = (newTab: 'all' | 'pulang_awal' | 'lembur') => {
    setSelectedLemburIds([]);
    setSelectedPulangAwalIds([]);
    updateFilters({ tab: newTab, page: 1 });
  };

  // 1. Query Live Summary Stats Hari Ini
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['admin_today_kehadiran_summary'],
    queryFn: () => kehadiranApi.getTodaySummary().then(res => res.data),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Query All-Time Pending Backlog Counters for Tabs
  const { data: pendingLemburCount } = useQuery({
    queryKey: ['admin_pending_lembur_count'],
    queryFn: () => kehadiranApi.getPendingLemburCount().then(res => res.count),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: pendingPulangAwalCount } = useQuery({
    queryKey: ['admin_pending_pulang_awal_count'],
    queryFn: () => kehadiranApi.getPendingPulangAwalCount().then(res => res.count),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // 2. Query Data Kehadiran (Server-Side Paginated)
  const { 
    data: paginatedResult, 
    isLoading: isLoadingList,
    isError: isErrorList,
    refetch: refetchList
  } = useQuery({
    queryKey: ['admin_payroll_kehadiran_paginated', page, limit, search, startDate, endDate, statusHadir, lokasiId, activeTab],
    queryFn: () => kehadiranApi.getPaginated({
      page,
      limit,
      search,
      startDate,
      endDate,
      statusHadir: activeTab === 'all' ? statusHadir : undefined,
      lokasiId,
      statusLembur: activeTab === 'lembur' ? 'pending' : undefined,
      statusPulangAwal: activeTab === 'pulang_awal' ? 'pending' : undefined
    }).then(res => res.data),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  useRealtimeQuery({
    table: 'kehadiran',
    queryKeys: [
      ['admin_today_kehadiran_summary'],
      ['admin_payroll_kehadiran_paginated'],
      ['admin_pending_lembur_count'],
      ['admin_pending_pulang_awal_count'],
    ],
  });

  const list = paginatedResult?.list || [];
  const totalItems = paginatedResult?.total || 0;
  const totalPages = Math.ceil(totalItems / limit);

  // 3. Query Master Karyawan & Toko (Cache StaleTime 5 Menit)
  const { data: karyawanList } = useQuery({
    queryKey: ['admin_payroll_karyawan'],
    queryFn: () => karyawanApi.getAll().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: storeList } = useQuery({
    queryKey: ['admin_payroll_stores'],
    queryFn: () => lokasiKerjaApi.getAll().then(res => res.data || []),
    staleTime: 5 * 60 * 1000,
  });

  const {
    createMutation,
    updateMutation,
    reviewPulangAwalMutation,
    bulkReviewPulangAwalMutation,
    reviewLemburMutation,
    bulkApproveMutation,
  } = useKehadiranMutations({
    onSuccessBulkReviewPulangAwal: () => setSelectedPulangAwalIds([]),
    onSuccessBulkApprove: () => setSelectedLemburIds([]),
  });

  const handleToggleSelectPulangAwal = (id: string) => {
    setSelectedPulangAwalIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectLembur = (id: string) => {
    setSelectedLemburIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllLembur = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedLemburIds(list.map((item) => item.id));
    } else {
      setSelectedLemburIds([]);
    }
  };

  const handleSelectAllPulangAwal = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedPulangAwalIds(list.map((item) => item.id));
    } else {
      setSelectedPulangAwalIds([]);
    }
  };

  const handleBulkReviewPulangAwal = (keputusan: 'hitung_penuh' | 'sesuai_durasi') => {
    if (selectedPulangAwalIds.length === 0) {
      toast.error('Pilih setidaknya satu data pulang awal');
      return;
    }
    bulkReviewPulangAwalMutation.mutate({ ids: selectedPulangAwalIds, keputusan });
  };

  const handleBulkApprove = () => {
    if (selectedLemburIds.length === 0) {
      toast.error('Pilih setidaknya satu data lembur');
      return;
    }
    bulkApproveMutation.mutate(selectedLemburIds);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const url = `/api/export/kehadiran/csv?startDate=${startDate}&endDate=${endDate}&lokasiId=${lokasiId}&statusHadir=${statusHadir}`;
      await downloadOrShareFile(url, `Rekap_Kehadiran_${startDate || 'all'}_${endDate || 'all'}.csv`, 'Rekap Kehadiran', 'text/csv');
      toast.success('File CSV berhasil diunduh');
    } catch (err: any) {
      toast.error('Gagal mengekspor CSV: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsExporting(false);
    }
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

  const storeFormOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [];
    if (storeList) {
      storeList.forEach(s => {
        opts.push({ label: s.nama, value: s.id });
      });
    }
    return opts;
  }, [storeList]);

  return (
    <div className="flex flex-col gap-3 px-2 py-4 w-full md:p-4 lg:p-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            <IconClock className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-white">Kelola Kehadiran</h1>
            <p className="hidden md:block text-[11px] sm:text-sm text-neutral-500 leading-snug">Pantau presensi, keterlambatan, pulang awal, dan persetujuan lembur karyawan.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Search Input */}
          <div className="relative flex-1 sm:w-60 min-w-[160px]">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-2xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilters({ search: '', page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 cursor-pointer"
                aria-label="Bersihkan pencarian"
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          <KehadiranFilters 
            search={search}
            startDate={startDate}
            endDate={endDate}
            statusHadir={statusHadir}
            lokasiId={lokasiId}
            karyawanList={karyawanList || []}
            storeList={storeList || []}
            updateFilters={updateFilters}
            activeFilters={getActiveFilters()}
            isExporting={isExporting}
            onExportCsv={handleExportCsv}
            onOpenCreate={() => setIsCreateOpen(true)}
          />
        </div>
      </div>

      {/* Compact Live Stats Summary */}
      <div className="grid grid-cols-3 divide-x divide-neutral-200/60 dark:divide-neutral-800 bg-white border border-neutral-200/80 rounded-xl shadow-sm dark:bg-neutral-900 dark:border-neutral-800 my-2">
        {/* Hadir */}
        <div className="flex flex-col p-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 mb-1">Hadir</span>
          <span className="text-lg font-black text-neutral-900 dark:text-white font-mono leading-none">
            {isLoadingSummary ? '--' : `${summaryData?.total_hadir || 0}/${summaryData?.total_aktif || 0}`}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 leading-none">
            {isLoadingSummary ? '...' : `${summaryData?.hadir_tepat || 0} tepat, ${summaryData?.hadir_telat || 0} telat`}
          </span>
        </div>

        {/* Terlambat */}
        <div className="flex flex-col p-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-500 mb-1">Telat</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono leading-none">
            {isLoadingSummary ? '--' : summaryData?.hadir_telat || 0}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 leading-none">
            Butuh tinjauan
          </span>
        </div>

        {/* Izin/Sakit/Off */}
        <div className="flex flex-col p-3">
          <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-500 mb-1">Absen</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono leading-none">
            {isLoadingSummary ? '--' : (summaryData?.izin || 0) + (summaryData?.sakit || 0) + (summaryData?.off || 0)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 leading-none truncate">
            {isLoadingSummary ? '...' : `${summaryData?.izin || 0}i ${summaryData?.sakit || 0}s ${summaryData?.off || 0}o`}
          </span>
        </div>
      </div>

      {/* Tabs & Bulk Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
        <div role="tablist" aria-label="Tab Kategori Presensi" className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
          <button
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => handleTabChange('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Semua Presensi
          </button>
          
          <button
            role="tab"
            aria-selected={activeTab === 'pulang_awal'}
            onClick={() => handleTabChange('pulang_awal')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pulang_awal'
                ? 'bg-white dark:bg-neutral-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Pulang Awal</span>
            {(pendingPulangAwalCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                {pendingPulangAwalCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'lembur'}
            onClick={() => handleTabChange('lembur')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'lembur'
                ? 'bg-white dark:bg-neutral-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Persetujuan Lembur</span>
            {(pendingLemburCount || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
                {pendingLemburCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'pulang_awal' && selectedPulangAwalIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={bulkReviewPulangAwalMutation.isPending}
              onClick={() => handleBulkReviewPulangAwal('hitung_penuh')}
              leftIcon={<IconCheck size={16} />}
              className="!bg-emerald-600 hover:!bg-emerald-700 text-white"
            >
              Hitung Penuh ({selectedPulangAwalIds.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={bulkReviewPulangAwalMutation.isPending}
              onClick={() => handleBulkReviewPulangAwal('sesuai_durasi')}
              leftIcon={<IconClock size={16} />}
            >
              Sesuai Durasi ({selectedPulangAwalIds.length})
            </Button>
          </div>
        )}

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

      <FilterBadges 
        activeFilters={getActiveFilters()} 
        totalItems={totalItems} 
        onResetAll={() => {
          setSearchInput('');
          updateFilters({ search: '', startDate: '', endDate: '', statusHadir: 'all', lokasiId: 'all', page: 1 });
        }}
      />

      <KehadiranTable 
        list={list}
        isLoadingList={isLoadingList}
        isErrorList={isErrorList}
        onRetry={refetchList}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={limit}
        setPage={setPage}
        activeTab={activeTab}
        selectedLemburIds={selectedLemburIds}
        selectedPulangAwalIds={selectedPulangAwalIds}
        handleToggleSelectLembur={handleToggleSelectLembur}
        handleToggleSelectPulangAwal={handleToggleSelectPulangAwal}
        handleSelectAllLembur={handleSelectAllLembur}
        handleSelectAllPulangAwal={handleSelectAllPulangAwal}
        setReviewPulangAwalModalItem={setReviewPulangAwalModalItem}
        setReviewLemburModalItem={setReviewLemburModalItem}
        handleOpenEdit={setSelectedKehadiran}
      />

      <KehadiranModals
        selectedKehadiran={selectedKehadiran}
        setSelectedKehadiran={setSelectedKehadiran}
        isCreateOpen={isCreateOpen}
        setIsCreateOpen={setIsCreateOpen}
        reviewPulangAwalModalItem={reviewPulangAwalModalItem}
        setReviewPulangAwalModalItem={setReviewPulangAwalModalItem}
        reviewLemburModalItem={reviewLemburModalItem}
        setReviewLemburModalItem={setReviewLemburModalItem}
        karyawanIdOptions={karyawanIdOptions}
        storeFormOptions={storeFormOptions}
        createMutation={createMutation}
        updateMutation={updateMutation}
        reviewPulangAwalMutation={reviewPulangAwalMutation}
        reviewLemburMutation={reviewLemburMutation}
      />
    </div>
  );
}
