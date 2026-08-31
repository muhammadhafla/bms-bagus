'use client';
import { format, subDays } from 'date-fns';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { kasApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Button, FilterButton, AmbientLayout } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconWallet,
  IconX,
  IconArrowDown,
} from '@tabler/icons-react';
import { formatDateForInputWIB } from '@/lib/utils';
import { ManualKasModal } from './components/ManualKasModal';
import { TransactionModal } from '@/components/dashboard/TransactionModal';
import dynamic from 'next/dynamic';

import { CashFlowSummaryCards } from './components/CashFlowSummaryCards';
import { CashFlowFilterPanel } from './components/CashFlowFilterPanel';
import { CashFlowDesktopTable } from './components/CashFlowDesktopTable';
import { CashFlowMobileList } from './components/CashFlowMobileList';
import { ShiftSummaryAdminPanel } from './components/ShiftSummaryAdminPanel';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

export default function CashFlowPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const currentUserId = profile?.id;

  const [defaultFilters] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    return {
      startDate: formatDateForInputWIB(thirtyDaysAgo),
      endDate: formatDateForInputWIB(today),
      typeFilter: 'all',
      sortBy: 'created_at',
      sortDir: 'desc' as 'asc' | 'desc',
    };
  });

  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'SETOR' | 'TARIK'>('SETOR');

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const { data: kasLogData, isLoading: isLoadingLog } = useQuery({
    queryKey: [
      'kas_log',
      page,
      isAdmin ? filters.startDate : null,
      isAdmin ? filters.endDate : null,
      filters.typeFilter,
      isAdmin ? null : currentUserId,
      filters.sortBy,
      filters.sortDir,
    ],
    queryFn: () =>
      kasApi.getPaginated({
        page,
        limit: LIMIT,
        startDate: isAdmin ? filters.startDate : undefined,
        endDate: isAdmin ? filters.endDate : undefined,
        type: filters.typeFilter,
        userId: isAdmin ? undefined : currentUserId,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      }),
    enabled: !!currentUserId,
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: [
      'kas_summary',
      isAdmin ? filters.startDate : null,
      isAdmin ? filters.endDate : null,
      isAdmin ? null : currentUserId,
    ],
    queryFn: async () => {
      if (isAdmin) {
        return await kasApi.getSummary({ startDate: filters.startDate, endDate: filters.endDate });
      } else {
        return await kasApi.getCurrentShiftBalance(currentUserId!);
      }
    },
    enabled: !!currentUserId,
  });

  const { data: shiftSummaryData, isLoading: isLoadingShiftSummary } = useQuery({
    queryKey: ['shift_summary', filters.endDate],
    queryFn: () => kasApi.getShiftSummary(filters.endDate),
    enabled: isAdmin && !!currentUserId,
  });

  const handleOpenManualKas = useCallback((type: 'SETOR' | 'TARIK') => {
    setManualType(type);
    setIsManualModalOpen(true);
  }, []);

  const handleRowClick = useCallback((row: any) => {
    if (row.tipe === 'JUAL' && row.referensi_id) {
      setSelectedTransactionId(row.referensi_id);
      setIsTransactionModalOpen(true);
    }
  }, []);

  const handleOpenFilter = useCallback(() => {
    setTempFilters(filters);
    setIsFilterOpen(true);
  }, [filters]);

  const handleApplyFilter = useCallback(() => {
    setFilters(tempFilters);
    setIsFilterOpen(false);
  }, [tempFilters]);

  const handleResetFilter = useCallback(() => {
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
  }, [defaultFilters]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const activeFilters = useMemo(() => {
    const badges = [];
    if (filters.startDate && filters.endDate) {
      badges.push({
        id: 'date',
        label: `${filters.startDate} - ${filters.endDate}`,
        onRemove: () =>
          setFilters((prev) => ({
            ...prev,
            startDate: defaultFilters.startDate,
            endDate: defaultFilters.endDate,
          })),
      });
    }
    if (filters.typeFilter !== 'all') {
      badges.push({
        id: 'type',
        label: `Tipe: ${filters.typeFilter}`,
        onRemove: () => setFilters((prev) => ({ ...prev, typeFilter: 'all' })),
      });
    }
    return badges;
  }, [filters, defaultFilters]);

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
                <IconWallet className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8" stroke={1.5} />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    {isAdmin ? 'Arus Kas' : 'Kas Shift Anda'}
                  </h1>
                  <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
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

          <CashFlowSummaryCards summaryData={summaryData} isLoading={isLoadingSummary} />

          <div
            className="animate-fade-in-up flex flex-col-reverse gap-6 xl:flex-row"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex flex-1 flex-col gap-3 sm:gap-4">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start sm:gap-3">
                  <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                    Riwayat Transaksi Kas
                  </h2>

                  {/* Filter button on mobile (aligned right of title) */}
                  <div className="sm:hidden">
                    <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} />
                  </div>

                  {/* Active filter badges on desktop (inline next to title) */}
                  {activeFilters.length > 0 && (
                    <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                      {activeFilters.map((badge) => (
                        <div
                          key={badge.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/50 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300"
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
                  )}
                </div>

                {/* Filter button on desktop */}
                <div className="hidden sm:block shrink-0">
                  <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} />
                </div>

                {/* Active filter badges on mobile (compact row below title) */}
                {activeFilters.length > 0 && (
                  <div className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto py-0.5 whitespace-nowrap sm:hidden">
                    {activeFilters.map((badge) => (
                      <div
                        key={badge.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/50 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 shadow-sm dark:border-neutral-700/50 dark:bg-neutral-800 dark:text-neutral-300"
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
                )}
              </div>

              <CashFlowFilterPanel
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                isAdmin={isAdmin}
                tempFilters={tempFilters}
                setTempFilters={setTempFilters}
                onApply={handleApplyFilter}
                onReset={handleResetFilter}
              />

              <CashFlowDesktopTable
                data={kasLogData?.data || []}
                isLoading={isLoadingLog}
                isAdmin={isAdmin}
                onRowClick={handleRowClick}
                page={page}
                setPage={setPage}
                total={kasLogData?.total || 0}
                limit={LIMIT}
              />

              <CashFlowMobileList
                data={kasLogData?.data || []}
                isLoading={isLoadingLog}
                isAdmin={isAdmin}
                onRowClick={handleRowClick}
                page={page}
                setPage={setPage}
                total={kasLogData?.total || 0}
                limit={LIMIT}
              />
            </div>

            {isAdmin && (
              <ShiftSummaryAdminPanel
                shiftSummaryData={shiftSummaryData}
                isLoading={isLoadingShiftSummary}
                targetDate={filters.endDate}
              />
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

