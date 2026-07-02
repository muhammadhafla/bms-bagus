'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { kategoriApi } from '@/lib/api';
import { IconReport, IconPackage, IconShoppingCart, IconTrendingUp, IconChartBar, IconFilter, IconX } from '@tabler/icons-react';
import { AmbientLayout, DateRangePicker, Tabs, SelectInput, SlideOver, Button } from '@/components/ui';

import { StockReportTab } from './tabs/StockReportTab';
import { SalesReportTab } from './tabs/SalesReportTab';
import { ProfitReportTab } from './tabs/ProfitReportTab';
import { TopItemsReportTab } from './tabs/TopItemsReportTab';

type ReportType = 'stock' | 'sales' | 'profit' | 'top_items';

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat laporan...</div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reportType = (searchParams.get('type') as ReportType) || 'stock';

  const setReportType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{id: string, nama: string}[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [topItemsSort, setTopItemsSort] = useState<'qty'|'profit'>('qty');

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await kategoriApi.getAll();
      if (!res.error && res.data) {
        setCategories(res.data);
      }
    };
    fetchCategories();
  }, []);

  const tabItems = [
    { id: 'stock', label: 'Mutasi Stock', icon: <IconPackage className="w-4 h-4" /> },
    { id: 'sales', label: 'Penjualan', icon: <IconShoppingCart className="w-4 h-4" /> },
    { id: 'profit', label: 'Profit', icon: <IconTrendingUp className="w-4 h-4" /> },
    { id: 'top_items', label: 'Top Items', icon: <IconChartBar className="w-4 h-4" /> },
  ];

  return (
    <AmbientLayout>
      <div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5 animate-fade-in-up pl-12 lg:pl-0">
          <div className="flex items-center gap-4">
            <IconReport className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Laporan</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 text-xs lg:text-base font-medium">Monitoring & analytics</p>
            </div>
          </div>
        </div>

        <Tabs 
          items={tabItems} 
          activeId={reportType} 
          onChange={setReportType} 
          className="mb-3"
        />
      </div>

      {(() => {
        // Build active filter badges
        const getActiveFilters = () => {
          const badges = [];
          if (startDate && endDate) {
            badges.push({ id: 'date', label: `${startDate} - ${endDate}`, onRemove: () => { setStartDate(''); setEndDate(''); } });
          }
          if (['sales', 'profit', 'top_items'].includes(reportType) && categoryId) {
            const cat = categories.find(c => c.id === categoryId);
            if (cat) {
              badges.push({ id: 'category', label: `Kategori: ${cat.nama}`, onRemove: () => setCategoryId('') });
            }
          }
          if (reportType === 'top_items') {
            badges.push({ id: 'sort', label: `Urutan: ${topItemsSort === 'qty' ? 'Kuantitas' : 'Profit'}`, onRemove: null });
          }
          return badges;
        };

        const activeFilters = getActiveFilters();

        const filterButton = (
          <Button variant="secondary" size="sm" onClick={() => setIsFilterOpen(true)} className="shrink-0 h-[40px]">
            <IconFilter size={18} />
            <span className="hidden sm:inline">Filter</span>
            {activeFilters.length > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                {activeFilters.length}
              </span>
            )}
          </Button>
        );

        const filterBadges = (
          <div className="flex overflow-x-auto whitespace-nowrap gap-2 items-center py-1 w-full no-scrollbar">
            {activeFilters.length === 0 && (
              <span className="text-sm text-neutral-500 dark:text-neutral-400 italic">Semua data</span>
            )}
            {activeFilters.map(badge => (
              <div key={badge.id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {badge.label}
                {badge.onRemove && (
                  <button onClick={badge.onRemove} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                    <IconX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        );

        return (
          <>
            <SlideOver isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Laporan">
              <div className="space-y-6">
                <div>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                    label="Periode Tanggal"
                    className="w-full"
                  />
                </div>
                
                {['sales', 'profit', 'top_items'].includes(reportType) && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Kategori:</label>
                    <SelectInput
                      value={categoryId}
                      onChange={setCategoryId}
                      options={[{ value: '', label: 'Semua Kategori' }, ...categories.map(c => ({ value: c.id, label: c.nama }))]}
                      placeholder="Semua Kategori"
                      className="w-full"
                    />
                  </div>
                )}

                {reportType === 'top_items' && (
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
                      setStartDate('');
                      setEndDate('');
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

            <div className="flex-1 animate-fade-in-up">
              {reportType === 'stock' ? (
                <StockReportTab startDate={startDate} endDate={endDate} filterButton={filterButton} filterBadges={filterBadges} />
              ) : reportType === 'sales' ? (
                <SalesReportTab startDate={startDate} endDate={endDate} categoryId={categoryId} filterButton={filterButton} filterBadges={filterBadges} />
              ) : reportType === 'profit' ? (
                <ProfitReportTab startDate={startDate} endDate={endDate} categoryId={categoryId} filterButton={filterButton} filterBadges={filterBadges} />
              ) : reportType === 'top_items' ? (
                <TopItemsReportTab startDate={startDate} endDate={endDate} categoryId={categoryId} filterButton={filterButton} filterBadges={filterBadges} topItemsSort={topItemsSort} />
              ) : null}
            </div>
          </>
        );
      })()}
    </AmbientLayout>
  );
}