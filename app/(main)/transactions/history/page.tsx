'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { IconHistory, IconFilter, IconX, IconShoppingCart, IconPackage, IconArrowBackUp } from '@tabler/icons-react';
import { AmbientLayout, DateRangePicker, Tabs, SlideOver, Button, FilterButton } from '@/components/ui';

import { RiwayatPenjualanTab } from '@/components/transactions/RiwayatPenjualanTab';
import { RiwayatPembelianTab } from '@/components/transactions/RiwayatPembelianTab';
import { RiwayatReturPenjualanTab } from '@/components/transactions/RiwayatReturPenjualanTab';
import { RiwayatReturPembelianTab } from '@/components/transactions/RiwayatReturPembelianTab';
import { useAuthStore, useIsAdmin } from '@/lib/auth';

type HistoryType = 'penjualan' | 'pembelian' | 'retur_penjualan' | 'retur_pembelian';

export default function TransactionsHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500">Memuat riwayat transaksi...</div>}>
      <TransactionsHistoryContent />
    </Suspense>
  );
}

function TransactionsHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const historyType = (searchParams.get('type') as HistoryType) || 'penjualan';

  const setHistoryType = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Temporary state for the filter SlideOver
  const [tempSearch, setTempSearch] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isAdminUser = useIsAdmin();

  const tabItems = [
    { id: 'penjualan', label: 'Penjualan', icon: <IconShoppingCart className="w-4 h-4" /> },
    { id: 'retur_penjualan', label: 'Retur Penjualan', icon: <IconArrowBackUp className="w-4 h-4" /> },
    ...(isAdminUser ? [
      { id: 'pembelian', label: 'Pembelian', icon: <IconPackage className="w-4 h-4" /> },
      { id: 'retur_pembelian', label: 'Retur Pembelian', icon: <IconArrowBackUp className="w-4 h-4" /> }
    ] : []),
  ];

  const handleOpenFilter = () => {
    setTempSearch(search);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setSearch(tempSearch);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setTempSearch('');
    setTempStartDate('');
    setTempEndDate('');
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const getActiveFilters = () => {
    const badges = [];
    if (search) {
      badges.push({ id: 'search', label: `Cari: ${search}`, onRemove: () => setSearch('') });
    }
    if (startDate && endDate) {
      badges.push({ id: 'date', label: `${startDate} - ${endDate}`, onRemove: () => { setStartDate(''); setEndDate(''); } });
    }
    return badges;
  };

  const activeFilters = getActiveFilters();

  return (
    <AmbientLayout>
      <div className="flex flex-col min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div>
          <div className="flex flex-row items-start justify-between gap-3 mb-5 animate-fade-in-up">
            <div className="flex items-start lg:items-center gap-3 lg:gap-4">
              <IconHistory className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0 mt-0.5 lg:mt-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-tight">Riwayat Transaksi</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1 lg:mt-2 text-xs lg:text-base font-medium">Rekapitulasi aktivitas penjualan dan pembelian</p>
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

        <div className="flex overflow-x-auto whitespace-nowrap gap-2 items-center py-2 mb-2 w-full no-scrollbar">
          {activeFilters.length === 0 && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400 italic">Menampilkan semua data (100 transaksi terakhir)</span>
          )}
          {activeFilters.map(badge => (
            <div key={badge.id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 shadow-sm border border-neutral-200/50 dark:border-neutral-700/50">
              {badge.label}
              {badge.onRemove && (
                <button onClick={badge.onRemove} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
                  <IconX size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <SlideOver isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Riwayat">
          <div className="space-y-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Pencarian</label>
              <input
                type="text"
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                placeholder={historyType === 'penjualan' ? "Cari ID Transaksi..." : "Cari No. Nota atau Supplier..."}
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/20 focus:border-brand-500 transition-all text-neutral-900 dark:text-white"
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
            
            <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
              <Button 
                variant="secondary" 
                className="w-1/2" 
                onClick={handleResetFilter}
              >
                Reset
              </Button>
              <Button variant="primary" className="w-1/2" onClick={handleApplyFilter}>
                Terapkan
              </Button>
            </div>
          </div>
        </SlideOver>

        <div className="flex-1 min-h-0 flex flex-col animate-fade-in-up">
          {historyType === 'penjualan' ? (
            <RiwayatPenjualanTab search={search} startDate={startDate} endDate={endDate} />
          ) : historyType === 'pembelian' ? (
            <RiwayatPembelianTab search={search} startDate={startDate} endDate={endDate} />
          ) : historyType === 'retur_penjualan' ? (
            <RiwayatReturPenjualanTab search={search} startDate={startDate} endDate={endDate} />
          ) : historyType === 'retur_pembelian' ? (
            <RiwayatReturPembelianTab search={search} startDate={startDate} endDate={endDate} />
          ) : null}
        </div>
      </div>
    </AmbientLayout>
  );
}
