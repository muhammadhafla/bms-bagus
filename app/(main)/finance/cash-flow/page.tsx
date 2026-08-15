'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { kasApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import {
  DateRangePicker,
  Button,
  SelectInput,
  DataTable,
  Badge,
  FilterButton,
  AmbientLayout,
  ModernPagination,
} from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  IconReportMoney,
  IconArrowUpRight,
  IconArrowDownRight,
  IconWallet,
  IconChevronRight,
  IconFilter,
  IconX,
  IconArrowDown,
} from '@tabler/icons-react';
import { formatCurrency, formatDateTimeWIB, formatDateForInputWIB } from '@/lib/utils';
import { ManualKasModal } from './components/ManualKasModal';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function CashFlowPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const currentUserId = profile?.id;

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(formatDateForInputWIB(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDateForInputWIB(today));
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(formatDateForInputWIB(thirtyDaysAgo));
  const [tempEndDate, setTempEndDate] = useState(formatDateForInputWIB(today));
  const [tempTypeFilter, setTempTypeFilter] = useState('all');
  const [tempSortBy, setTempSortBy] = useState('created_at');
  const [tempSortDir, setTempSortDir] = useState<'asc' | 'desc'>('desc');

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'SETOR' | 'TARIK'>('SETOR');

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Pagination for main table
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, typeFilter, sortBy, sortDir]);

  // Fetch paginated log
  const { data: kasLogData, isLoading: isLoadingLog } = useQuery({
    queryKey: [
      'kas_log',
      page,
      isAdmin ? startDate : null,
      isAdmin ? endDate : null,
      typeFilter,
      isAdmin ? null : currentUserId,
      sortBy,
      sortDir,
    ],
    queryFn: () =>
      kasApi.getPaginated({
        page,
        limit: LIMIT,
        startDate: isAdmin ? startDate : undefined,
        endDate: isAdmin ? endDate : undefined,
        type: typeFilter,
        userId: isAdmin ? undefined : currentUserId,
        sortBy,
        sortDir,
      }),
    enabled: !!currentUserId,
  });

  // Fetch summary based on role
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: [
      'kas_summary',
      isAdmin ? startDate : null,
      isAdmin ? endDate : null,
      isAdmin ? null : currentUserId,
    ],
    queryFn: async () => {
      if (isAdmin) {
        return await kasApi.getSummary({ startDate, endDate });
      } else {
        return await kasApi.getCurrentShiftBalance(currentUserId!);
      }
    },
    enabled: !!currentUserId,
  });

  // Admin specific: Shift Summary Table
  const { data: shiftSummaryData, isLoading: isLoadingShiftSummary } = useQuery({
    queryKey: ['shift_summary', endDate], // Use end date as the target date for daily shift summary
    queryFn: () => kasApi.getShiftSummary(endDate),
    enabled: isAdmin && !!currentUserId,
  });

  const handleOpenManualKas = (type: 'SETOR' | 'TARIK') => {
    setManualType(type);
    setIsManualModalOpen(true);
  };

  const handleRowClick = (row: any) => {
    if (row.tipe === 'JUAL' && row.referensi_id) {
      setSelectedTransactionId(row.referensi_id);
      setIsTransactionModalOpen(true);
    }
  };

  const handleOpenFilter = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempTypeFilter(typeFilter);
    setTempSortBy(sortBy);
    setTempSortDir(sortDir);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setTypeFilter(tempTypeFilter);
    setSortBy(tempSortBy);
    setSortDir(tempSortDir);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    const defaultStart = formatDateForInputWIB(thirtyDaysAgo);
    const defaultEnd = formatDateForInputWIB(today);

    setTempStartDate(defaultStart);
    setTempEndDate(defaultEnd);
    setTempTypeFilter('all');
    setTempSortBy('created_at');
    setTempSortDir('desc');

    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setTypeFilter('all');
    setSortBy('created_at');
    setSortDir('desc');
  };

  const getActiveFilters = () => {
    const badges = [];
    if (startDate && endDate) {
      badges.push({
        id: 'date',
        label: `${startDate} - ${endDate}`,
        onRemove: () => {
          setStartDate('');
          setEndDate('');
        },
      });
    }
    if (typeFilter !== 'all') {
      badges.push({
        id: 'type',
        label: `Tipe: ${typeFilter}`,
        onRemove: () => setTypeFilter('all'),
      });
    }
    return badges;
  };

  const activeFilters = getActiveFilters();

  const getTypeBadge = (tipe: string, className?: string) => {
    switch (tipe) {
      case 'JUAL':
      case 'SETOR':
        return (
          <Badge variant="success" className={className}>
            Pemasukan ({tipe})
          </Badge>
        );
      case 'TARIK':
      case 'RETURN':
        return (
          <Badge variant="danger" className={className}>
            Pengeluaran ({tipe})
          </Badge>
        );
      case 'TUTUP_SHIFT':
        return (
          <Badge variant="default" className={className}>
            TUTUP SHIFT
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className={className}>
            {tipe}
          </Badge>
        );
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  return (
    <ErrorBoundary>
      <AmbientLayout>
        <PullToRefresh
          onRefresh={handleRefresh}
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
          <div className="mb-4 lg:mb-6">
            <div className="mb-4 flex flex-row items-start justify-between gap-4 lg:mb-5 lg:items-center">
              <div className="animate-fade-in-up flex items-center gap-3 lg:gap-4">
                <IconWallet
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    {isAdmin ? 'Arus Kas' : 'Kas Shift Anda'}
                  </h1>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    {isAdmin
                      ? 'Pantau pergerakan kas dari semua pengguna.'
                      : 'Pantau penerimaan dan pengeluaran kas.'}
                  </p>
                </div>
              </div>
              <div className="animate-fade-in-up flex items-center gap-2 sm:gap-3">
                <Button
                  onClick={() => handleOpenManualKas('SETOR')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border-transparent bg-green-600 !p-0 text-white shadow-sm transition-shadow hover:bg-green-700 hover:shadow-md sm:h-auto sm:w-auto sm:!px-4 sm:!py-2"
                  title="Setor Kas"
                >
                  <IconArrowDownRight size={20} className="shrink-0" />
                  <span className="hidden font-medium sm:inline">Setor Kas</span>
                </Button>
                <Button
                  onClick={() => handleOpenManualKas('TARIK')}
                  variant="danger"
                  className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl !p-0 shadow-sm transition-shadow hover:shadow-md sm:h-auto sm:w-auto sm:!px-4 sm:!py-2"
                  title="Tarik Kas"
                >
                  <IconArrowUpRight size={20} className="shrink-0" />
                  <span className="hidden font-medium sm:inline">Tarik Kas</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-3 md:gap-4">
            <div
              className="shadow-elevated animate-fade-in-up flex flex-col gap-1 rounded-3xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-neutral-900/60"
              style={{ animationDelay: '50ms' }}
            >
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Pemasukan
              </p>
              <div className="flex items-center justify-between gap-2">
                {isLoadingSummary ? (
                  <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                ) : (
                  <p className="truncate text-lg font-bold text-green-600 xl:text-2xl dark:text-green-400">
                    {formatCurrency(summaryData?.pemasukan || 0)}
                  </p>
                )}
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 sm:flex dark:bg-green-900/30 dark:text-green-400">
                  <IconArrowDownRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div
              className="shadow-elevated animate-fade-in-up flex flex-col gap-1 rounded-3xl border border-white/40 bg-white/70 p-4 backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-neutral-900/60"
              style={{ animationDelay: '100ms' }}
            >
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Pengeluaran
              </p>
              <div className="flex items-center justify-between gap-2">
                {isLoadingSummary ? (
                  <div className="h-8 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                ) : (
                  <p className="truncate text-lg font-bold text-red-600 xl:text-2xl dark:text-red-400">
                    {formatCurrency(summaryData?.pengeluaran || 0)}
                  </p>
                )}
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 sm:flex dark:bg-red-900/30 dark:text-red-400">
                  <IconArrowUpRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div
              className="from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-800 shadow-elevated animate-fade-in-up relative col-span-2 flex flex-col gap-1 overflow-hidden rounded-3xl bg-gradient-to-br p-4 text-white sm:p-6 md:col-span-1"
              style={{ animationDelay: '150ms' }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <IconWallet className="h-24 w-24" />
              </div>
              <p className="text-brand-100 relative z-10 text-sm font-medium">Saldo Kas Akhir</p>
              <div className="relative z-10 mt-1 flex items-center justify-between">
                {isLoadingSummary ? (
                  <div className="h-8 w-1/2 animate-pulse rounded bg-white/20" />
                ) : (
                  <p className="text-3xl font-bold">{formatCurrency(summaryData?.saldo || 0)}</p>
                )}
              </div>
            </div>
          </div>

          <div
            className="animate-fade-in-up flex flex-col-reverse gap-6 xl:flex-row"
            style={{ animationDelay: '200ms' }}
          >
            {/* Main Log Table */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="mb-2 flex flex-row items-center justify-between gap-3 sm:mb-0">
                <h2 className="flex-1 text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  Riwayat Transaksi Kas
                </h2>
                <div className="shrink-0">
                  <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} />
                </div>
              </div>

              <div className="no-scrollbar mb-1 flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap">
                {activeFilters.length === 0 && (
                  <span className="text-sm text-neutral-500 italic dark:text-neutral-400">
                    Menampilkan data default
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
                title="Filter Riwayat Kas"
              >
                <div className="space-y-6">
                  {isAdmin && (
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
                  )}

                  <div>
                    <SelectInput
                      label="Tipe Transaksi"
                      value={tempTypeFilter}
                      onChange={(val) => setTempTypeFilter(val)}
                      options={[
                        { label: 'Semua Tipe', value: 'all' },
                        { label: 'Penjualan (JUAL)', value: 'JUAL' },
                        { label: 'Setor Kas (SETOR)', value: 'SETOR' },
                        { label: 'Tarik Kas (TARIK)', value: 'TARIK' },
                        { label: 'Retur (RETURN)', value: 'RETURN' },
                        { label: 'Tutup Shift', value: 'TUTUP_SHIFT' },
                      ]}
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <SelectInput
                        label="Urutkan Berdasarkan"
                        value={tempSortBy}
                        onChange={(val) => setTempSortBy(val)}
                        options={[
                          { label: 'Tanggal & Waktu', value: 'created_at' },
                          { label: 'Nominal', value: 'jumlah' },
                        ]}
                      />
                    </div>
                    <div className="w-1/3">
                      <SelectInput
                        label="Arah Urutan"
                        value={tempSortDir}
                        onChange={(val) => setTempSortDir(val as 'asc' | 'desc')}
                        options={[
                          { label: 'Turun', value: 'desc' },
                          { label: 'Naik', value: 'asc' },
                        ]}
                      />
                    </div>
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

              <div className="hidden min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm md:flex dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                      <tr>
                        <th className="w-40 px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                          Tanggal
                        </th>
                        {isAdmin && (
                          <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                            Kasir
                          </th>
                        )}
                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                          Tipe
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                          Keterangan
                        </th>
                        <th className="w-32 px-5 py-3 text-right text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                          Metode
                        </th>
                        <th className="w-40 px-5 py-3 text-right text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                          Nominal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {isLoadingLog ? (
                        [...Array(5)].map((_, i) => (
                          <tr
                            key={i}
                            className="border-t border-neutral-100 dark:border-neutral-800"
                          >
                            <td className="px-5 py-3">
                              <div className="h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-3">
                                <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                              </td>
                            )}
                            <td className="px-5 py-3">
                              <div className="h-5 w-24 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                            </td>
                            <td className="px-5 py-3">
                              <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
                            </td>
                          </tr>
                        ))
                      ) : kasLogData?.data.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isAdmin ? 6 : 5}
                            className="px-5 py-12 text-center text-neutral-500 dark:text-neutral-400"
                          >
                            Belum ada riwayat arus kas
                          </td>
                        </tr>
                      ) : (
                        kasLogData?.data.map((item: any) => (
                          <tr
                            key={item.id}
                            onClick={() => handleRowClick(item)}
                            className={`transition-colors ${item.tipe === 'JUAL' && item.referensi_id ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''}`}
                          >
                            <td className="px-5 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                              {formatDateTimeWIB(item.created_at)}
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {item.profiles?.nama || 'Unknown'}
                              </td>
                            )}
                            <td className="px-5 py-3 text-sm">{getTypeBadge(item.tipe)}</td>
                            <td className="max-w-xs truncate px-5 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                              {item.catatan ||
                                (item.tipe === 'JUAL'
                                  ? `Ref: ${item.referensi_id?.slice(0, 8) || '-'}`
                                  : '-')}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-neutral-500 dark:text-neutral-400">
                              <Badge
                                variant="default"
                                className="inline-flex bg-neutral-100 dark:bg-neutral-800"
                              >
                                {item.payment_method}
                              </Badge>
                            </td>
                            <td
                              className={`px-5 py-3 text-right text-sm font-semibold ${
                                item.tipe === 'JUAL' || item.tipe === 'SETOR'
                                  ? 'text-green-600 dark:text-green-400'
                                  : item.tipe === 'TARIK' || item.tipe === 'RETURN'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-neutral-500 dark:text-neutral-400'
                              }`}
                            >
                              {item.jumlah === 0
                                ? '-'
                                : `${item.tipe === 'TARIK' || item.tipe === 'RETURN' ? '-' : '+'}${formatCurrency(item.jumlah)}`}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Desktop Pagination Controls */}
                {kasLogData && kasLogData.total > LIMIT && (
                  <ModernPagination
                    page={page}
                    totalPages={Math.ceil(kasLogData.total / LIMIT)}
                    onPageChange={setPage}
                    className="rounded-none border-x-0 border-b-0 bg-neutral-50 dark:bg-neutral-900"
                  />
                )}
              </div>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {isLoadingLog ? (
                  [...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="mb-3 flex justify-between">
                        <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                        <div className="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
                      </div>
                      <div className="mb-2 h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                        <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
                        <div className="h-5 w-24 rounded bg-neutral-200 dark:bg-neutral-700"></div>
                      </div>
                    </div>
                  ))
                ) : kasLogData?.data.length === 0 ? (
                  <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Belum ada riwayat arus kas
                    </p>
                  </div>
                ) : (
                  kasLogData?.data.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className={`flex flex-col gap-2 rounded-2xl border border-neutral-200/60 p-3 shadow-sm transition-all duration-200 sm:p-4 dark:border-neutral-800/60 ${item.tipe === 'JUAL' && item.referensi_id ? 'cursor-pointer hover:bg-neutral-50/90 active:scale-[0.98] dark:hover:bg-neutral-800/80' : 'bg-white/70 dark:bg-neutral-900/60'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-500">
                              {formatDateTimeWIB(item.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTypeBadge(item.tipe, 'text-[10px] px-2 py-0.5')}
                            {isAdmin && (
                              <span className="line-clamp-1 text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                {item.profiles?.nama || 'Unknown'}
                              </span>
                            )}
                          </div>
                        </div>
                        {item.tipe === 'JUAL' && item.referensi_id && (
                          <div className="-mr-2 flex items-center justify-center rounded-lg p-1 text-neutral-400">
                            <IconChevronRight size={18} stroke={2.5} />
                          </div>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                        {item.catatan ||
                          (item.tipe === 'JUAL'
                            ? `Ref: ${item.referensi_id?.slice(0, 8) || '-'}`
                            : '-')}
                      </p>

                      <div className="mt-2 flex items-end justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800/60">
                        <Badge
                          variant="default"
                          className="inline-flex bg-neutral-100 px-2 py-0.5 text-[10px] dark:bg-neutral-800"
                        >
                          {item.payment_method}
                        </Badge>
                        <span
                          className={`text-sm font-bold ${
                            item.tipe === 'JUAL' || item.tipe === 'SETOR'
                              ? 'text-green-600 dark:text-green-400'
                              : item.tipe === 'TARIK' || item.tipe === 'RETURN'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {item.jumlah === 0
                            ? '-'
                            : `${item.tipe === 'TARIK' || item.tipe === 'RETURN' ? '-' : '+'}${formatCurrency(item.jumlah)}`}
                        </span>
                      </div>
                    </div>
                  ))
                )}

                {/* Mobile Pagination */}
                {kasLogData && kasLogData.total > LIMIT && (
                  <ModernPagination
                    page={page}
                    totalPages={Math.ceil(kasLogData.total / LIMIT)}
                    onPageChange={setPage}
                    className="sticky bottom-0 z-20 -mx-4 mt-2 rounded-none border-x-0 border-b-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
                  />
                )}
              </div>
            </div>

            {/* Admin: Shift Summary Table */}
            {isAdmin && (
              <div className="flex w-full flex-col gap-4 xl:w-[400px]">
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  Ringkasan Per Shift ({formatDateTimeWIB(endDate).split(' ')[0]})
                </h2>
                <div className="flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  {isLoadingShiftSummary ? (
                    <div className="flex justify-center py-8">
                      <div className="border-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
                    </div>
                  ) : shiftSummaryData?.data?.length === 0 ? (
                    <p className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                      Tidak ada shift aktif pada tanggal ini.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {shiftSummaryData?.data?.map((shift: any) => (
                        <div
                          key={shift.userId}
                          className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-700/50 dark:bg-neutral-800/50"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-white">
                                {shift.userName}
                              </p>
                              <p className="text-xs text-neutral-500">
                                Aktifitas Trakhir:{' '}
                                {formatDateTimeWIB(shift.lastActivity).split(' ')[1]}
                              </p>
                            </div>
                            {shift.shiftClosed ? (
                              <Badge variant="default">Shift Ditutup</Badge>
                            ) : (
                              <Badge variant="warning">Shift Aktif</Badge>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-neutral-500 dark:text-neutral-400">
                                Pemasukan
                              </span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(shift.pemasukan)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500 dark:text-neutral-400">
                                Pengeluaran
                              </span>
                              <span className="font-medium text-red-600 dark:text-red-400">
                                {formatCurrency(shift.pengeluaran)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold dark:border-neutral-700">
                              <span className="text-neutral-900 dark:text-white">Saldo</span>
                              <span className="text-brand-600 dark:text-brand-400">
                                {formatCurrency(shift.saldo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <ManualKasModal
            isOpen={isManualModalOpen}
            onClose={() => setIsManualModalOpen(false)}
            defaultType={manualType}
          />

          <TransactionModal
            isOpen={isTransactionModalOpen}
            onClose={() => setIsTransactionModalOpen(false)}
            transactionId={selectedTransactionId}
            transactionType="penjualan"
          />
        </PullToRefresh>
      </AmbientLayout>
    </ErrorBoundary>
  );
}
