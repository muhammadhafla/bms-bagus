'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kasbonApi, Kasbon, karyawanApi } from '@/lib/api/payroll';
import { Card, DataTable, Button, Modal, Tabs, TextareaInput, Badge, SelectInput, TextInput, DateRangePicker, FilterButton, ModernPagination, type Column } from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { IconWallet, IconCheck, IconX, IconPlus, IconArrowDown } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function AdminKasbonClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const statusFilter = searchParams.get('status') || 'pending';
  const page = Number(searchParams.get('page')) || 1;
  const limit = 20;
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc';

  const updateFilters = useCallback((newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // Reset page to 1 on filter change, except when the change is the page itself
    if (!('page' in newFilters)) {
      params.set('page', '1');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const setStatusFilter = (status: string) => {
    updateFilters({ status });
  };

  useEffect(() => {
    if (statusFilter === 'disetujui') {
      toast.info('Informasi Mutasi', {
        description: 'Kasbon dengan status Disetujui otomatis masuk ke Buku Besar Mutasi Gaji sebagai saldo potongan (debit).',
        duration: 5000,
      });
    }
  }, [statusFilter]);

  const { data: kasbonData, isLoading, refetch } = useQuery({
    queryKey: ['admin_payroll_kasbon', { status: statusFilter, page, search, startDate, endDate, sortBy, sortDir }],
    queryFn: () => kasbonApi.getAll({ status: statusFilter, page, limit, search, startDate, endDate, sortBy, sortDir }),
  });

  const list = kasbonData?.data || [];
  const totalItems = kasbonData?.total || 0;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  const updateStatusMutation = useMutation({
    mutationFn: (args: { id: string, status: 'disetujui' | 'ditolak', reason?: string }) => 
      kasbonApi.updateStatus(args.id, args.status),
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal memperbarui: ' + res.error.message);
        return;
      }
      toast.success('Status kasbon diperbarui!');
      setConfirmApprove(null);
      setConfirmReject(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_kasbon'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  const [confirmApprove, setConfirmApprove] = useState<Kasbon | null>(null);
  const [confirmReject, setConfirmReject] = useState<Kasbon | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createUserId, setCreateUserId] = useState('');
  const [createNominal, setCreateNominal] = useState('');
  const [createKeterangan, setCreateKeterangan] = useState('');
  const [createStatus, setCreateStatus] = useState('disetujui');

  const { data: karyawanList } = useQuery({
    queryKey: ['admin_payroll_karyawan'],
    queryFn: () => karyawanApi.getAll().then(res => res.data),
    enabled: isCreateModalOpen
  });

  const createMutation = useMutation({
    mutationFn: () => kasbonApi.createAdmin(
      createUserId, 
      Number(createNominal.replace(/\D/g, '')), 
      createKeterangan, 
      createStatus as 'pending' | 'disetujui'
    ),
    onSuccess: (res) => {
      if (res.error) {
        toast.error('Gagal membuat kasbon: ' + res.error.message);
        return;
      }
      toast.success('Kasbon berhasil dibuat!');
      setIsCreateModalOpen(false);
      setCreateUserId('');
      setCreateNominal('');
      setCreateKeterangan('');
      queryClient.invalidateQueries({ queryKey: ['admin_payroll_kasbon'] });
    },
    onError: () => toast.error('Terjadi kesalahan sistem'),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserId) return toast.error('Pilih karyawan terlebih dahulu');
    const num = Number(createNominal.replace(/\D/g, ''));
    if (num <= 0) return toast.error('Nominal harus lebih dari 0');
    createMutation.mutate();
  };

  const handleApprove = () => {
    if (confirmApprove) {
      updateStatusMutation.mutate({ id: confirmApprove.id, status: 'disetujui' });
    }
  };

  const handleReject = () => {
    if (confirmReject) {
      updateStatusMutation.mutate({ id: confirmReject.id, status: 'ditolak', reason: rejectReason });
    }
  };

  // Filter SlideOver state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState(search);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [tempSortBy, setTempSortBy] = useState(sortBy);
  const [tempSortDir, setTempSortDir] = useState(sortDir);

  const handleOpenFilter = () => {
    setTempSearch(search);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempSortBy(sortBy);
    setTempSortDir(sortDir);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    updateFilters({
      search: tempSearch,
      startDate: tempStartDate,
      endDate: tempEndDate,
      sortBy: tempSortBy,
      sortDir: tempSortDir,
    });
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    updateFilters({ search: '', startDate: '', endDate: '', sortBy: 'created_at', sortDir: 'desc' });
    setIsFilterOpen(false);
  };

  const activeFilters = useMemo(() => {
    const badges = [];
    if (search) {
      badges.push({ id: 'search', label: `Cari: ${search}`, onRemove: () => updateFilters({ search: '' }) });
    }
    if (startDate && endDate) {
      badges.push({
        id: 'date',
        label: `${startDate} - ${endDate}`,
        onRemove: () => updateFilters({ startDate: '', endDate: '' }),
      });
    }
    return badges;
  }, [search, startDate, endDate, updateFilters]);

  const columns: Column<Kasbon>[] = [
    { 
      key: 'tanggal',
      header: 'Tanggal', 
      render: (row: Kasbon) => format(new Date(row.tanggal), 'd MMM yyyy', { locale: localeId }) 
    },
    { 
      key: 'karyawan', 
      header: 'Karyawan', 
      render: (row: Kasbon) => {
        const saldoArr = row.profiles?.vw_payroll_saldo;
        const saldo = saldoArr && saldoArr.length > 0 ? saldoArr[0].total_saldo : 0;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-neutral-900 dark:text-white">
              {row.profiles?.nama || 'Unknown'}
            </span>
            <span className={`text-xs font-semibold ${
              saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              Saldo: {saldo < 0 ? '-' : ''}Rp {Math.abs(saldo).toLocaleString('id-ID')}
            </span>
          </div>
        );
      }
    },
    { key: 'nominal', header: 'Nominal', render: (row: Kasbon) => `Rp ${row.nominal.toLocaleString('id-ID')}` },
    { key: 'keterangan', header: 'Keterangan', render: (row: Kasbon) => row.keterangan || '-' },
    { 
      key: 'aksi',
      header: 'Aksi / Status', 
      render: (row: Kasbon) => {
        if (statusFilter === 'pending') {
          return (
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 border-none"
                leftIcon={<IconCheck size={16} />}
                onClick={() => setConfirmApprove(row)}
              >
                Setujui
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                leftIcon={<IconX size={16} />}
                onClick={() => setConfirmReject(row)}
              >
                Tolak
              </Button>
            </div>
          );
        }
        
        return (
          <Badge variant={row.status === 'disetujui' ? 'success' : 'danger'}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        );
      }
    }
  ];

  const tabItems = [
    { id: 'pending', label: 'Menunggu Persetujuan' },
    { id: 'disetujui', label: 'Disetujui' },
    { id: 'ditolak', label: 'Ditolak' }
  ];

  return (
    <PullToRefresh
      onRefresh={async () => {
        await refetch();
      }}
      pullingContent={
        <div className="flex items-center justify-center py-4 text-neutral-400">
          <IconArrowDown className="h-5 w-5 animate-bounce" />
        </div>
      }
      refreshingContent={
        <div className="flex items-center justify-center py-4">
          <div className="border-brand-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      }
    >
      <div className="flex flex-col gap-2 px-2 py-4 w-full md:p-4 lg:p-8 pb-20">
        <div className="flex flex-row items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <IconWallet className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold leading-tight text-neutral-900 dark:text-white">Persetujuan Kasbon</h1>
              <p className="hidden md:block text-[11px] sm:text-sm text-neutral-500 leading-snug">Kelola pengajuan kasbon karyawan.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} className="!m-0 !h-10 !min-h-[40px]" />
            <Button 
              variant="primary" 
              onClick={() => setIsCreateModalOpen(true)}
              className="shrink-0 !h-10 !min-h-[40px] !py-0"
              leftIcon={<IconPlus size={16} />}
            >
              <span className="hidden sm:inline">Buat Kasbon</span>
              <span className="sm:hidden">Buat</span>
            </Button>
          </div>
        </div>

        <Tabs 
          items={tabItems} 
          activeId={statusFilter} 
          onChange={setStatusFilter} 
          className="mb-2"
        />

        <div className="no-scrollbar mb-2 flex w-full items-center gap-2 overflow-x-auto py-1 sm:py-2 whitespace-nowrap">
          {activeFilters.length === 0 && (
            <span className="text-xs sm:text-sm text-neutral-500 italic dark:text-neutral-400">
              Menampilkan data terbaru
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

        <ResponsivePanel
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filter Kasbon"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Pencarian
              </label>
              <input
                type="text"
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                placeholder="Cari karyawan atau keterangan..."
                className="focus:ring-brand-500/20 focus:border-brand-500 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-neutral-900 transition-all focus:ring-2 focus:outline-none focus:ring-inset dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
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

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Urutkan Berdasarkan
              </label>
              <SelectInput
                value={tempSortBy}
                onChange={setTempSortBy}
                options={[
                  { label: 'Waktu Dibuat', value: 'created_at' },
                  { label: 'Tanggal Kasbon', value: 'tanggal' },
                  { label: 'Nominal Kasbon', value: 'nominal' },
                ]}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Arah Urutan
              </label>
              <SelectInput
                value={tempSortDir}
                onChange={(val) => setTempSortDir(val as 'asc' | 'desc')}
                options={[
                  { label: 'Menurun (Terbaru/Terbesar)', value: 'desc' },
                  { label: 'Menaik (Terlama/Terkecil)', value: 'asc' },
                ]}
                className="w-full"
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

        <div className="hidden lg:flex overflow-hidden flex-col rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : !list || list.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <IconWallet className="h-12 w-12 text-neutral-300 mb-4" />
              <h3 className="text-lg font-bold text-neutral-700">Tidak ada data</h3>
              <p className="text-neutral-500">Belum ada pengajuan kasbon dengan kriteria tersebut.</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <DataTable 
                columns={columns}
                data={list}
                keyField="id"
                className="border-none flex-1"
              />
              {totalPages > 1 && (
                <ModernPagination
                  page={page}
                  totalPages={totalPages}
                  total={totalItems}
                  limit={limit}
                  onPageChange={(p) => updateFilters({ page: p.toString() })}
                />
              )}
            </div>
          )}
        </div>

        {/* Mobile Card Layout */}
        <div className="block space-y-3 lg:hidden">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          ) : !list || list.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
               <IconWallet className="mb-2 h-10 w-10 opacity-20" />
               <p>Tidak ada data kasbon.</p>
             </div>
          ) : (
            <>
              {list.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-900/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 dark:text-white truncate">
                        {item.profiles?.nama || 'Unknown'}
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                        {(() => {
                          const sArr = item.profiles?.vw_payroll_saldo;
                          const s = sArr && sArr.length > 0 ? sArr[0].total_saldo : 0;
                          return (
                            <span className={s < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                              Saldo: {s < 0 ? '-' : ''}Rp {Math.abs(s).toLocaleString('id-ID')}
                            </span>
                          );
                        })()}
                        {' • '}
                        <span className="font-normal">{format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}</span>
                      </p>
                    </div>
                    {statusFilter !== 'pending' && (
                      <div className="shrink-0 scale-90 origin-top-right">
                        <Badge variant={item.status === 'disetujui' ? 'success' : 'danger'}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800/50 mt-1">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">Nominal Kasbon</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      Rp {item.nominal.toLocaleString('id-ID')}
                    </p>
                    {item.keterangan && (
                      <p className="text-xs text-neutral-600 mt-1.5 dark:text-neutral-400 line-clamp-2">
                        {item.keterangan}
                      </p>
                    )}
                  </div>

                  {statusFilter === 'pending' && (
                    <div className="flex gap-2 mt-1">
                      <Button 
                        variant="danger" 
                        className="flex-1"
                        size="sm"
                        leftIcon={<IconX size={16} />}
                        onClick={() => setConfirmReject(item)}
                      >
                        Tolak
                      </Button>
                      <Button 
                        variant="primary" 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 border-none"
                        size="sm"
                        leftIcon={<IconCheck size={16} />}
                        onClick={() => setConfirmApprove(item)}
                      >
                        Setujui
                      </Button>
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
                  onPageChange={(p) => updateFilters({ page: p.toString() })}
                  className="sticky bottom-0 z-20 -mx-4 mt-4 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
                />
              )}
            </>
          )}
        </div>

        {/* Modal Confirm Approve */}
        {confirmApprove && (
          <Modal
            isOpen={!!confirmApprove}
            onClose={() => setConfirmApprove(null)}
            title="Konfirmasi Persetujuan"
            isBottomSheetOnMobile
          >
            <div className="mt-4">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Apakah Anda yakin ingin menyetujui pengajuan kasbon dari <strong>{confirmApprove.profiles?.nama}</strong> sebesar <strong>Rp {confirmApprove.nominal.toLocaleString('id-ID')}</strong>?
              </p>

              {(() => {
                const sArr = confirmApprove.profiles?.vw_payroll_saldo;
                const saldo = sArr && sArr.length > 0 ? sArr[0].total_saldo : 0;
                const newSaldo = saldo - confirmApprove.nominal;
                return (
                  <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-neutral-500">Saldo Saat Ini</span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {saldo < 0 ? '-' : ''}Rp {Math.abs(saldo).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-neutral-500">Penarikan</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                        - Rp {confirmApprove.nominal.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-neutral-300 dark:border-neutral-600">
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">Prediksi Saldo Baru</span>
                      <span className={`text-lg font-black ${
                        newSaldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {newSaldo < 0 ? '-' : ''}Rp {Math.abs(newSaldo).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {newSaldo < 0 && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 text-right">
                        ⚠️ Karyawan akan berhutang pada perusahaan
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setConfirmApprove(null)}>Batal</Button>
                <Button 
                  variant="primary" 
                  className="bg-emerald-600 hover:bg-emerald-700 border-none"
                  onClick={handleApprove}
                  loading={updateStatusMutation.isPending}
                >
                  Ya, Setujui
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Confirm Reject */}
        {confirmReject && (
          <Modal
            isOpen={!!confirmReject}
            onClose={() => {
              setConfirmReject(null);
              setRejectReason('');
            }}
            title="Konfirmasi Penolakan"
            isBottomSheetOnMobile
          >
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-neutral-600 dark:text-neutral-400">
                Apakah Anda yakin ingin menolak pengajuan kasbon dari <strong>{confirmReject.profiles?.nama}</strong> sebesar <strong>Rp {confirmReject.nominal.toLocaleString('id-ID')}</strong>?
              </p>
              
              <TextareaInput
                label="Alasan Penolakan (Opsional)"
                placeholder="Berikan alasan mengapa kasbon ditolak..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />

              <div className="mt-4 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => {
                  setConfirmReject(null);
                  setRejectReason('');
                }}>Batal</Button>
                <Button 
                  variant="danger" 
                  onClick={handleReject}
                  loading={updateStatusMutation.isPending}
                >
                  Ya, Tolak
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal Create Kasbon */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Buat Kasbon Baru"
          isBottomSheetOnMobile
        >
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 mt-4">
            <SelectInput
              label="Karyawan"
              value={createUserId}
              onChange={(val) => setCreateUserId(val)}
              options={karyawanList?.map(k => ({ value: k.user_id, label: k.profiles?.nama || 'Unknown' })) || []}
              placeholder="Pilih Karyawan..."
              required
            />
            <TextInput
              label="Nominal"
              type="text"
              placeholder="Rp 0"
              value={createNominal}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCreateNominal(val ? `Rp ${Number(val).toLocaleString('id-ID')}` : '');
              }}
              required
            />
            <TextInput
              label="Keterangan"
              type="text"
              placeholder="Tulis keterangan kasbon..."
              value={createKeterangan}
              onChange={(e) => setCreateKeterangan(e.target.value)}
              required
            />
            <SelectInput
              label="Status Awal"
              value={createStatus}
              onChange={(val) => setCreateStatus(val)}
              options={[
                { value: 'disetujui', label: 'Disetujui (Aktif)' },
                { value: 'pending', label: 'Pending' }
              ]}
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Batal</Button>
              <Button 
                type="submit" 
                variant="primary" 
                loading={createMutation.isPending}
              >
                Simpan Kasbon
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PullToRefresh>
  );
}
