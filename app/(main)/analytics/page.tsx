'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { analyticsApi, kategoriApi } from '@/lib/api';
import { IconDashboard, IconPackage, IconShoppingCart, IconTrendingUp, IconChartBar, IconFilter, IconX, IconLock, IconRotateClockwise2, IconArrowDown } from '@tabler/icons-react';
import { DateRangePicker, Tabs, SelectInput, SlideOver, Button, FilterButton } from '@/components/ui';
import { AdminOnly } from '@/components/role';
import { formatDateForInputWIB } from '@/lib/utils';

const PullToRefresh = dynamic(
  () => import('react-simple-pull-to-refresh'),
  { ssr: false }
);

const BusiestTimeChart = dynamic(
  () => import('@/components/analytics/BusiestTimeChart').then((mod) => mod.BusiestTimeChart),
  {
    ssr: false,
    loading: () => <div className="h-72 md:h-[420px] rounded-3xl bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10 animate-pulse" />,
  }
);

const CategoryPieChart = dynamic(
  () => import('@/components/analytics/CategoryPieChart').then((mod) => mod.CategoryPieChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] md:h-[360px] rounded-3xl bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10 animate-pulse" />,
  }
);

const PaymentMethodChart = dynamic(
  () => import('@/components/analytics/PaymentMethodChart').then((mod) => mod.PaymentMethodChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] md:h-[360px] rounded-3xl bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10 animate-pulse" />,
  }
);

const StockVelocityTable = dynamic(
  () => import('@/components/analytics/StockVelocityTable').then((mod) => mod.StockVelocityTable),
  {
    ssr: false,
    loading: () => <div className="h-[300px] rounded-3xl bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10 animate-pulse" />,
  }
);

const ProfitabilityAndAtvCards = dynamic(
  () => import('@/components/analytics/ProfitabilityAndAtvCards').then((mod) => mod.ProfitabilityAndAtvCards),
  {
    ssr: false,
    loading: () => <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      <div className="h-40 rounded-3xl bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10" />
      <div className="h-40 rounded-3xl bg-white/70 dark:bg-neutral-900/60 border border-white/40 dark:border-white/10" />
    </div>,
  }
);

const StockReportTab = dynamic(
  () => import('./tabs/StockReportTab').then((mod) => mod.StockReportTab),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-neutral-500">Memuat laporan stock...</div>,
  }
);

const SalesReportTab = dynamic(
  () => import('./tabs/SalesReportTab').then((mod) => mod.SalesReportTab),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-neutral-500">Memuat laporan penjualan...</div>,
  }
);

const ProfitReportTab = dynamic(
  () => import('./tabs/ProfitReportTab').then((mod) => mod.ProfitReportTab),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-neutral-500">Memuat laporan profit...</div>,
  }
);

const TopItemsReportTab = dynamic(
  () => import('./tabs/TopItemsReportTab').then((mod) => mod.TopItemsReportTab),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-neutral-500">Memuat laporan top items...</div>,
  }
);

const ValueReportTab = dynamic(
  () => import('./tabs/ValueReportTab').then((mod) => mod.ValueReportTab),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-neutral-500">Memuat laporan nilai...</div>,
  }
);

const ReturnsReportTab = dynamic(
  () => import('./tabs/ReturnsReportTab').then((mod) => mod.ReturnsReportTab),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-neutral-500">Memuat laporan retur...</div>,
  }
);

type ReportType = 'overview' | 'stock' | 'sales' | 'profit' | 'top_items' | 'value' | 'returns';

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat analisis...</div>}>
      <AdminOnly fallback={
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh] animate-fade-in-up">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
            <IconLock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Akses Ditolak</h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
            Halaman analisis dan laporan ini hanya dapat diakses oleh Administrator.
          </p>
        </div>
      }>
        <AnalyticsContent />
      </AdminOnly>
    </Suspense>
  );
}

function AnalyticsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get('type') as ReportType) || 'overview';

  const setActiveTab = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Unified Date State
  const [startDate, setStartDate] = useState<string>(formatDateForInputWIB(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string>(formatDateForInputWIB(today));

  // Overview Queries
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['analytics', 'categories', startDate, endDate],
    queryFn: () => analyticsApi.getCategoryPerformance(startDate, endDate).then(res => res.data),
    enabled: activeTab === 'overview'
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['analytics', 'payments', startDate, endDate],
    queryFn: () => analyticsApi.getPaymentMethods(startDate, endDate).then(res => res.data),
    enabled: activeTab === 'overview'
  });

  const { data: stockVelocity, isLoading: isLoadingVelocity } = useQuery({
    queryKey: ['analytics', 'velocity', startDate, endDate],
    queryFn: () => analyticsApi.getStockVelocity(startDate, endDate).then(res => res.data),
    enabled: activeTab === 'overview'
  });

  const { data: profitability, isLoading: isLoadingProfitability } = useQuery({
    queryKey: ['analytics', 'profitability', startDate, endDate],
    queryFn: () => analyticsApi.getProfitability(startDate, endDate).then(res => res.data),
    enabled: activeTab === 'overview'
  });

  const { data: atv, isLoading: isLoadingAtv } = useQuery({
    queryKey: ['analytics', 'atv', startDate, endDate],
    queryFn: () => analyticsApi.getAtv(startDate, endDate).then(res => res.data),
    enabled: activeTab === 'overview'
  });

  // Report Filter State
  const [categoryId, setCategoryId] = useState('');
  const [categoriesList, setCategoriesList] = useState<{id: string, nama: string}[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [topItemsSort, setTopItemsSort] = useState<'qty'|'profit'>('qty');

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await kategoriApi.getAll();
      if (!res.error && res.data) {
        setCategoriesList(res.data);
      }
    };
    fetchCategories();
  }, []);

  const tabItems = [
    { id: 'overview', label: 'Dasbor Visual', icon: <IconDashboard className="w-4 h-4" /> },
    { id: 'stock', label: 'Mutasi Stock', icon: <IconPackage className="w-4 h-4" /> },
    { id: 'sales', label: 'Penjualan', icon: <IconShoppingCart className="w-4 h-4" /> },
    { id: 'profit', label: 'Profit', icon: <IconTrendingUp className="w-4 h-4" /> },
    { id: 'top_items', label: 'Top Items', icon: <IconChartBar className="w-4 h-4" /> },
    { id: 'value', label: 'Nilai Inventaris', icon: <IconPackage className="w-4 h-4" /> },
    { id: 'returns', label: 'Retur', icon: <IconRotateClockwise2 className="w-4 h-4" /> },
  ];

  const getActiveFilters = () => {
    const badges = [];
    if (['sales', 'profit', 'top_items'].includes(activeTab) && categoryId) {
      const cat = categoriesList.find(c => c.id === categoryId);
      if (cat) {
        badges.push({ id: 'category', label: `Kategori: ${cat.nama}`, onRemove: () => setCategoryId('') });
      }
    }
    if (activeTab === 'top_items') {
      badges.push({ id: 'sort', label: `Urutan: ${topItemsSort === 'qty' ? 'Kuantitas' : 'Profit'}`, onRemove: null });
    }
    return badges;
  };

  const activeFilters = getActiveFilters();
  const showFilterButton = ['sales', 'profit', 'top_items'].includes(activeTab);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex items-center justify-center py-4 text-neutral-400">
          <IconArrowDown className="w-5 h-5 animate-bounce" />
        </div>
      }
      refreshingContent={
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <div className="flex flex-col h-full w-full max-w-7xl mx-auto pb-8">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Analisis & Laporan
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-sm lg:text-base font-medium">
            Wawasan mendalam mengenai performa penjualan dan produk.
          </p>
        </div>
        
        <div className="w-full sm:w-auto">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            label="Rentang Waktu Laporan"
            className="w-full sm:w-[320px]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 animate-fade-in-up [animation-delay:50ms]">
        <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />
      </div>

      {/* Global Filter Bar (Only for non-overview if they have specific filters) */}
      {showFilterButton && (
        <div className="mb-4 md:mb-6 animate-fade-in-up [animation-delay:75ms] flex items-center justify-between w-full gap-2">
          <FilterButton onClick={() => setIsFilterOpen(true)} activeCount={activeFilters.length} />

          <div className="flex-1 min-w-0 flex overflow-x-auto whitespace-nowrap gap-1.5 md:gap-2 items-center py-1 no-scrollbar">
            {activeFilters.length === 0 ? (
              <span className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 italic">Tanpa filter tambahan</span>
            ) : (
              <>
                {activeFilters.map(badge => (
                  <div key={badge.id} className="inline-flex items-center gap-1 md:gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {badge.label}
                    {badge.onRemove && (
                      <button onClick={badge.onRemove} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                        <IconX className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setCategoryId('');
                    setTopItemsSort('qty');
                  }}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline px-2"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* SlideOver for advanced filters */}
      <SlideOver isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Tambahan">
        <div className="space-y-6">
          {['sales', 'profit', 'top_items'].includes(activeTab) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Kategori:</label>
              <SelectInput
                value={categoryId}
                onChange={setCategoryId}
                options={[{ value: '', label: 'Semua Kategori' }, ...categoriesList.map(c => ({ value: c.id, label: c.nama }))]}
                placeholder="Semua Kategori"
                className="w-full"
              />
            </div>
          )}

          {activeTab === 'top_items' && (
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Urutkan berdasarkan:</label>
              <div className="flex flex-col gap-2">
                <Button 
                  variant={topItemsSort === 'qty' ? 'primary' : 'secondary'} 
                  onClick={() => setTopItemsSort('qty')}
                  className="w-full justify-start"
                >
                  Qty Terjual
                </Button>
                <Button 
                  variant={topItemsSort === 'profit' ? 'primary' : 'secondary'} 
                  onClick={() => setTopItemsSort('profit')}
                  className="w-full justify-start"
                >
                  Total Profit
                </Button>
              </div>
            </div>
          )}
          
          <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
            <Button 
              variant="secondary" 
              className="w-1/2" 
              onClick={() => {
                setCategoryId('');
                setTopItemsSort('qty');
              }}
            >
              Reset Filter
            </Button>
            <Button variant="primary" className="w-1/2" onClick={() => setIsFilterOpen(false)}>
              Terapkan
            </Button>
          </div>
        </div>
      </SlideOver>

      {/* Content based on Tab */}
      <div className="animate-fade-in-up [animation-delay:100ms] flex-1">
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <ProfitabilityAndAtvCards 
              profitabilityData={profitability || []} 
              atvData={atv || null} 
              isLoading={isLoadingProfitability || isLoadingAtv} 
            />
            <BusiestTimeChart startDate={startDate} endDate={endDate} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CategoryPieChart data={categoriesData || []} isLoading={isLoadingCategories} />
              <PaymentMethodChart data={payments || null} isLoading={isLoadingPayments} />
            </div>
            <StockVelocityTable data={stockVelocity || []} isLoading={isLoadingVelocity} />
          </div>
        )}

        {activeTab === 'stock' && <StockReportTab startDate={startDate} endDate={endDate} />}
        { activeTab === 'sales' && <SalesReportTab startDate={startDate} endDate={endDate} categoryId={categoryId} /> }
        { activeTab === 'profit' && <ProfitReportTab startDate={startDate} endDate={endDate} categoryId={categoryId} /> }
        { activeTab === 'top_items' && <TopItemsReportTab startDate={startDate} endDate={endDate} categoryId={categoryId} topItemsSort={topItemsSort} /> }
        { activeTab === 'value' && <ValueReportTab /> }
        { activeTab === 'returns' && <ReturnsReportTab startDate={startDate} endDate={endDate} /> }
      </div>
      </div>
    </PullToRefresh>
  );
}
