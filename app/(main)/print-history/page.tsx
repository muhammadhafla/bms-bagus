'use client';

import { useState, useEffect, useCallback } from 'react';
import { AmbientLayout, Button, SlideOver, ModernPagination, FilterButton, DateRangePicker } from '@/components/ui';
import DateInput from '@/components/ui/DateInput';
import { IconHistory, IconRefresh, IconPrinter, IconChevronLeft, IconChevronRight, IconFilter, IconX, IconArrowDown } from '@tabler/icons-react';
import dynamic from 'next/dynamic';

const PullToRefresh = dynamic(
  () => import('react-simple-pull-to-refresh'),
  { ssr: false }
);
import { formatDateTimeWIB } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/fetchApi';

interface PrintJob {
  id: string;
  status: string;
  created_at: string;
  printed_at: string | null;
  payload_json: any;
  label_templates: {
    name: string;
  };
}

export default function PrintHistoryPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const limit = 20;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetchApi(`/api/print/history?${params.toString()}`);
      const data = await res.json();
      
      if (data.history) {
        setJobs(data.history);
      }
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch print history', err);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDateChange = () => {
    setPage(1); // Reset page on filter change
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50';
      case 'Printing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50';
      case 'Done': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50';
      case 'Failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50';
      default: return 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700';
    }
  };

  const handleRefresh = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetchApi(`/api/print/history?${params.toString()}`);
      const data = await res.json();
      
      if (data.history) {
        setJobs(data.history);
      }
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to refresh print history', err);
    }
  };

  return (
    <AmbientLayout>
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
      <div className="mb-4 lg:mb-6">
        {(() => {
          const activeFilters = [];
          if (startDate || endDate) {
            const label = `${startDate ? startDate : 'Awal'} - ${endDate ? endDate : 'Sekarang'}`;
            activeFilters.push({ 
              id: 'date', 
              label, 
              onRemove: () => { 
                setStartDate(''); 
                setEndDate(''); 
                handleDateChange(); 
              } 
            });
          }

          return (
            <div className="flex flex-col gap-3">
              <div className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4 animate-fade-in-up">
                  <IconHistory className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
                  <div>
                    <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Riwayat Cetak</h1>
                    <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Lihat riwayat pencetakan label massal Anda.</p>
                  </div>
                </div>
                
                {/* Compact Filter Button Top Right */}
                <div className="animate-fade-in-up shrink-0 pt-1 lg:pt-0" style={{ animationDelay: '50ms' }}>
                  <FilterButton 
                    onClick={() => setIsFilterOpen(true)}
                    activeCount={activeFilters.length}
                    className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>
              </div>
              
              {/* Active Filters Display */}
              {activeFilters.length > 0 && (
                <div className="flex overflow-x-auto whitespace-nowrap gap-2 items-center py-1 w-full no-scrollbar animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mr-1">Filter aktif:</span>
                  {activeFilters.map(badge => (
                    <div key={badge.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/30 px-3 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300 shadow-sm">
                      {badge.label}
                      <button onClick={badge.onRemove} className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors">
                        <IconX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <SlideOver isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Riwayat">
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Periode Tanggal:</label>
            <div className="flex items-center gap-2">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  handleDateChange();
                }}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-neutral-200 dark:border-neutral-800 flex gap-3">
            <Button 
              variant="secondary" 
              className="w-1/2" 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                handleDateChange();
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

      <div className="flex-1 animate-fade-in-up flex flex-col" style={{ animationDelay: '100ms' }}>
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 rounded-3xl shadow-elevated overflow-hidden min-h-[400px] flex flex-col flex-1">
          {/* Mobile Card List View */}
          <div className="block md:hidden flex-1 p-4 space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="bg-white/50 dark:bg-neutral-800/50 rounded-2xl p-3 space-y-3 animate-pulse border border-neutral-100 dark:border-neutral-800/50">
                   <div className="flex justify-between items-center">
                     <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                     <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                   </div>
                   <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded" />
                   <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
                   <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded mt-2" />
                </div>
              ))
            ) : jobs.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 py-10">
                 <IconPrinter className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-700" />
                 <p>Belum ada riwayat cetak</p>
               </div>
            ) : (
              jobs.map((job) => {
                const isArrayPayload = Array.isArray(job.payload_json);
                const itemName = isArrayPayload ? `${job.payload_json.length} Item` : (job.payload_json?.name || '-');
                const itemQty = isArrayPayload ? '-' : (job.payload_json?.qty || 1);
                const itemPrice = isArrayPayload ? '' : (job.payload_json?.price || '');

                return (
                  <div key={job.id} className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-3 shadow-sm border border-neutral-100 dark:border-neutral-800/50 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                        {formatDateTimeWIB(job.created_at)}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Template: {job.label_templates?.name || '-'}</div>
                      <div className="font-semibold text-neutral-900 dark:text-white text-base leading-tight">
                        {itemName}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                         Qty: {itemQty} {itemPrice ? ` | ${itemPrice}` : ''}
                      </div>
                    </div>

                    <div className="mt-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/50 flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                      <span>ID: {job.id.substring(0, 8)}...</span>
                      {job.printed_at && <span>Selesai: {formatDateTimeWIB(job.printed_at).split(' ')[1]}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">ID Job</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Template</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Item</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Waktu Buat</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/50">
                      <td className="p-4"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                          <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="p-4"><div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 py-10">
                        <IconPrinter className="w-12 h-12 mb-3 text-neutral-300 dark:text-neutral-700" />
                        <p>Belum ada riwayat cetak</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white/50 dark:hover:bg-neutral-800/30 transition-colors text-sm">
                      <td className="p-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">{job.id.substring(0, 8)}...</td>
                      <td className="p-4 font-medium text-neutral-800 dark:text-neutral-200">{job.label_templates?.name || '-'}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const isArrayPayload = Array.isArray(job.payload_json);
                            const itemName = isArrayPayload ? `${job.payload_json.length} Item` : (job.payload_json?.name || '-');
                            const itemQty = isArrayPayload ? '-' : (job.payload_json?.qty || 1);
                            const itemPrice = isArrayPayload ? '' : (job.payload_json?.price || '');
                            return (
                              <>
                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{itemName}</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  Qty: {itemQty} {itemPrice ? ` | ${itemPrice}` : ''}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{formatDateTimeWIB(job.created_at)}</td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{job.printed_at ? formatDateTimeWIB(job.printed_at) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <ModernPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="rounded-b-3xl"
            />
          )}
        </div>
      </div>
      </PullToRefresh>
    </AmbientLayout>
  );
}
