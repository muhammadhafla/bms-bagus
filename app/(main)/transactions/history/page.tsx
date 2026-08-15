'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  IconHistory,
  IconFilter,
  IconX,
  IconShoppingCart,
  IconPackage,
  IconArrowBackUp,
  IconArrowDown,
} from '@tabler/icons-react';
import {
  AmbientLayout,
  DateRangePicker,
  Tabs,
  Button,
  FilterButton,
  SelectInput,
} from '@/components/ui';
import { ResponsivePanel } from '@/components/ui/ResponsivePanel';
import { useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });

const RiwayatPenjualanTab = dynamic(
  () => import('@/components/transactions/RiwayatPenjualanTab').then((m) => m.RiwayatPenjualanTab),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
    ),
  },
);

const RiwayatPembelianTab = dynamic(
  () => import('@/components/transactions/RiwayatPembelianTab').then((m) => m.RiwayatPembelianTab),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
    ),
  },
);

const RiwayatReturPenjualanTab = dynamic(
  () =>
    import('@/components/transactions/RiwayatReturPenjualanTab').then(
      (m) => m.RiwayatReturPenjualanTab,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
    ),
  },
);

const RiwayatReturPembelianTab = dynamic(
  () =>
    import('@/components/transactions/RiwayatReturPembelianTab').then(
      (m) => m.RiwayatReturPembelianTab,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
    ),
  },
);
import { useAuthStore, useIsAdmin } from '@/lib/auth';

type HistoryType = 'penjualan' | 'pembelian' | 'retur_penjualan' | 'retur_pembelian';

export default function TransactionsHistoryPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-neutral-500">Memuat riwayat transaksi...</div>}
    >
      <TransactionsHistoryContent />
    </Suspense>
  );
}

function TransactionsHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const historyType = (searchParams.get('type') as HistoryType) || 'penjualan';
  const queryClient = useQueryClient();

  const setHistoryType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Temporary state for the filter SlideOver
  const [tempSearch, setTempSearch] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [tempSortBy, setTempSortBy] = useState('created_at');
  const [tempSortDir, setTempSortDir] = useState<'asc' | 'desc'>('desc');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isAdminUser = useIsAdmin();

  const tabItems = [
    { id: 'penjualan', label: 'Penjualan', icon: <IconShoppingCart className="h-4 w-4" /> },
    {
      id: 'retur_penjualan',
      label: 'Retur Penjualan',
      icon: <IconArrowBackUp className="h-4 w-4" />,
    },
    ...(isAdminUser
      ? [
          { id: 'pembelian', label: 'Pembelian', icon: <IconPackage className="h-4 w-4" /> },
          {
            id: 'retur_pembelian',
            label: 'Retur Pembelian',
            icon: <IconArrowBackUp className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  const handleOpenFilter = () => {
    setTempSearch(search);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempSortBy(sortBy);
    setTempSortDir(sortDir);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setSearch(tempSearch);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSortBy(tempSortBy);
    setSortDir(tempSortDir);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setTempSearch('');
    setTempStartDate('');
    setTempEndDate('');
    setTempSortBy('created_at');
    setTempSortDir('desc');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSortBy('created_at');
    setSortDir('desc');
  };

  const getActiveFilters = () => {
    const badges = [];
    if (search) {
      badges.push({ id: 'search', label: `Cari: ${search}`, onRemove: () => setSearch('') });
    }
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
    return badges;
  };

  const activeFilters = getActiveFilters();

  return (
    <PullToRefresh
      onRefresh={async () => {
        await queryClient.invalidateQueries();
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
      <AmbientLayout>
        <div className="flex min-h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-2rem)] lg:min-h-0">
          <div>
            <div className="animate-fade-in-up mb-5 flex flex-row items-start justify-between gap-3">
              <div className="flex items-start gap-3 lg:items-center lg:gap-4">
                <IconHistory
                  className="text-brand-500 mt-0.5 h-6 w-6 shrink-0 lg:mt-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl leading-tight font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Riwayat Transaksi
                  </h1>
                  <p className="mt-1 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Rekapitulasi aktivitas penjualan dan pembelian
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <FilterButton onClick={handleOpenFilter} activeCount={activeFilters.length} />
              </div>
            </div>

            <Tabs
              items={tabItems}
              activeId={historyType}
              onChange={setHistoryType}
              className="mb-3"
            />
          </div>

          <div className="no-scrollbar mb-2 flex w-full items-center gap-2 overflow-x-auto py-2 whitespace-nowrap">
            {activeFilters.length === 0 && (
              <span className="text-sm text-neutral-500 italic dark:text-neutral-400">
                Menampilkan semua data (100 transaksi terakhir)
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
            title="Filter Riwayat"
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
                  placeholder={
                    historyType === 'penjualan'
                      ? 'Cari ID Transaksi...'
                      : 'Cari No. Nota atau Supplier...'
                  }
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

              <div className="flex gap-4">
                <div className="flex-1">
                  <SelectInput
                    label="Urutkan Berdasarkan"
                    value={tempSortBy}
                    onChange={(val) => setTempSortBy(val)}
                    options={[
                      { label: 'Tanggal & Waktu', value: 'created_at' },
                      { label: 'Total Transaksi', value: 'total' },
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

          <div className="animate-fade-in-up flex min-h-0 flex-1 flex-col">
            {historyType === 'penjualan' ? (
              <RiwayatPenjualanTab
                search={search}
                startDate={startDate}
                endDate={endDate}
                sortBy={sortBy}
                sortDir={sortDir}
              />
            ) : historyType === 'pembelian' ? (
              <RiwayatPembelianTab
                search={search}
                startDate={startDate}
                endDate={endDate}
                sortBy={sortBy}
                sortDir={sortDir}
              />
            ) : historyType === 'retur_penjualan' ? (
              <RiwayatReturPenjualanTab
                search={search}
                startDate={startDate}
                endDate={endDate}
                sortBy={sortBy}
                sortDir={sortDir}
              />
            ) : historyType === 'retur_pembelian' ? (
              <RiwayatReturPembelianTab
                search={search}
                startDate={startDate}
                endDate={endDate}
                sortBy={sortBy}
                sortDir={sortDir}
              />
            ) : null}
          </div>
        </div>
      </AmbientLayout>
    </PullToRefresh>
  );
}
