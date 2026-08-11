'use client';

import { useState, useEffect, useCallback } from 'react';
import { AmbientLayout, Button, SlideOver, ModernPagination, FilterButton, DateRangePicker } from '@/components/ui';
import { IconHistory, IconRefresh, IconPrinter, IconChevronLeft, IconChevronRight, IconFilter, IconX, IconArrowDown, IconCheck, IconAlertTriangle, IconLoader2, IconRefreshDot, IconFileDescription } from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

const PullToRefresh = dynamic(
  () => import('react-simple-pull-to-refresh'),
  { ssr: false }
);
import { formatDateTimeWIB } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/fetchApi';

interface PayloadItem {
  name: string;
  qty?: number;
  price?: string | number;
  [key: string]: any;
}

interface PrintJob {
  id: string;
  status: string;
  created_at: string;
  printed_at: string | null;
  template_id: string;
  payload_json: PayloadItem | PayloadItem[];
  label_templates: {
    name: string;
  };
}

export default function PrintHistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Detail Modal & Actions
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [jobToRetry, setJobToRetry] = useState<PrintJob | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  
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
      if (status) params.append('status', status);

      const res = await fetchApi(`/api/print/history?${params.toString()}`);
      
      if (!res.ok) throw new Error('Gagal memuat riwayat');
      
      const data = await res.json();
      
      if (data.history) {
        setJobs(data.history);
      }
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Failed to fetch print history', err);
      toast.error(err.message || 'Gagal memuat riwayat cetak');
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, status]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = () => {
    setPage(1); // Reset page on filter change
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'Pending': 
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50',
          icon: <IconLoader2 className="w-3 h-3 animate-spin mr-1" />
        };
      case 'Printing': 
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
          icon: <IconLoader2 className="w-3 h-3 animate-spin mr-1" />
        };
      case 'Done': 
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
          icon: <IconCheck className="w-3 h-3 mr-1" />
        };
      case 'Failed': 
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
          icon: <IconAlertTriangle className="w-3 h-3 mr-1" />
        };
      default: 
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
          icon: null
        };
    }
  };

  const handleRefresh = async () => {
    await fetchHistory();
  };

  const openDetail = (job: PrintJob) => {
    setSelectedJob(job);
    setIsDetailOpen(true);
  };
  
  const promptRetry = (job: PrintJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobToRetry(job);
    setIsConfirmOpen(true);
  };
  
  const executeRetry = async () => {
    if (!jobToRetry) return;
    setIsRetrying(true);
    
    try {
      const res = await fetchApi('/api/print', {
        method: 'POST',
        body: JSON.stringify({
          template_id: jobToRetry.template_id,
          payload_json: jobToRetry.payload_json
        })
      });
      
      if (!res.ok) throw new Error('Gagal mencetak ulang');
      
      toast.success('Perintah cetak ulang berhasil dikirim');
      setIsConfirmOpen(false);
      handleRefresh(); // reload list
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mencetak ulang');
    } finally {
      setIsRetrying(false);
      setJobToRetry(null);
    }
  };

  // UI Helpers
  const renderItemInfo = (job: PrintJob, clickable: boolean = false) => {
    const isArrayPayload = Array.isArray(job.payload_json);
    const itemName = isArrayPayload ? `${job.payload_json.length} Item` : ((job.payload_json as PayloadItem)?.name || '-');
    const itemQty = isArrayPayload ? '-' : ((job.payload_json as PayloadItem)?.qty || 1);
    const itemPrice = isArrayPayload ? '' : ((job.payload_json as PayloadItem)?.price || '');

    return (
      <div 
        className={`space-y-1 ${clickable && isArrayPayload ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 p-1.5 -ml-1.5 rounded-lg transition-colors' : ''}`}
        onClick={() => {
           if (clickable && isArrayPayload) openDetail(job);
        }}
      >
        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1.5">
          Template: {job.label_templates?.name || '-'}
          {isArrayPayload && clickable && (
             <span className="inline-flex items-center gap-0.5 text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 px-1.5 py-0.5 rounded-full font-medium">
               <IconFileDescription className="w-3 h-3" /> Detail
             </span>
          )}
        </div>
        <div className="font-semibold text-neutral-900 dark:text-white text-base leading-tight">
          {itemName}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
           Qty: {itemQty} {itemPrice ? ` | ${itemPrice}` : ''}
        </div>
      </div>
    );
  };

  const renderStatusBadge = (statusStr: string) => {
    const badge = getStatusBadge(statusStr);
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${badge.color}`}>
        {badge.icon}
        {statusStr}
      </span>
    );
  };

  const activeFilters = [];
  if (startDate || endDate) {
    activeFilters.push({ 
      id: 'date', 
      label: `${startDate ? startDate : 'Awal'} - ${endDate ? endDate : 'Sekarang'}`, 
      onRemove: () => { setStartDate(''); setEndDate(''); handleFilterChange(); } 
    });
  }
  if (status) {
    activeFilters.push({ 
      id: 'status', 
      label: `Status: ${status}`, 
      onRemove: () => { setStatus(''); handleFilterChange(); } 
    });
  }

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
        <div className="flex flex-col gap-3">
          <div className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-4 animate-fade-in-up">
              <IconHistory className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
              <div>
                <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Riwayat Cetak</h1>
                <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Lihat riwayat pencetakan label massal Anda.</p>
              </div>
            </div>
            
            <div className="animate-fade-in-up shrink-0 pt-1 lg:pt-0" style={{ animationDelay: '50ms' }}>
              <FilterButton 
                onClick={() => setIsFilterOpen(true)}
                activeCount={activeFilters.length}
                className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
          </div>
          
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
      </div>

      <SlideOver isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filter Riwayat">
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status:</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                handleFilterChange();
              }}
              className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Printing">Printing</option>
              <option value="Done">Done</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Periode Tanggal:</label>
            <div className="flex items-center gap-2">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  handleFilterChange();
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
                setStatus('');
                handleFilterChange();
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
               <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 py-12 px-4 text-center">
                 <IconPrinter className="w-16 h-16 mb-4 text-neutral-300 dark:text-neutral-700" />
                 <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Belum Ada Riwayat</h3>
                 <p className="text-sm mb-6 max-w-[250px]">Anda belum pernah mencetak label apapun atau tidak ada data yang cocok dengan filter.</p>
                 <Button onClick={() => router.push('/print')} variant="primary" className="w-full max-w-xs shadow-md">
                    Cetak Label Sekarang
                 </Button>
               </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-3 shadow-sm border border-neutral-100 dark:border-neutral-800/50 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                      {formatDateTimeWIB(job.created_at)}
                    </span>
                    {renderStatusBadge(job.status)}
                  </div>
                  
                  {renderItemInfo(job, true)}

                  <div className="mt-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/50 flex justify-between items-center">
                    <div className="text-[10px] text-neutral-400 font-mono">
                      ID: {job.id.substring(0, 8)}...<br/>
                      {job.printed_at && `Selesai: ${formatDateTimeWIB(job.printed_at).split(' ')[1]}`}
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="text-xs h-8 px-3 rounded-lg"
                      onClick={(e) => promptRetry(job, e)}
                    >
                      <IconRefreshDot className="w-3.5 h-3.5 mr-1" /> Cetak Ulang
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-b border-neutral-200/50 dark:border-neutral-800/50">
                <tr>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">ID Job</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Item</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Waktu Buat</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Waktu Selesai</th>
                  <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/50">
                      <td className="p-4"><div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                          <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="p-4"><div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" /></td>
                      <td className="p-4"><div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" /></td>
                    </tr>
                  ))
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                       <div className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 py-16 px-4">
                         <IconPrinter className="w-16 h-16 mb-4 text-neutral-300 dark:text-neutral-700" />
                         <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Belum Ada Riwayat</h3>
                         <p className="text-sm mb-6">Anda belum pernah mencetak label apapun atau tidak ada data yang cocok dengan filter.</p>
                         <Button onClick={() => router.push('/print')} variant="primary" className="shadow-md">
                            Cetak Label Sekarang
                         </Button>
                       </div>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white/50 dark:hover:bg-neutral-800/30 transition-colors text-sm">
                      <td className="p-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">{job.id.substring(0, 8)}...</td>
                      <td className="p-4">{renderItemInfo(job, true)}</td>
                      <td className="p-4">{renderStatusBadge(job.status)}</td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{formatDateTimeWIB(job.created_at)}</td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{job.printed_at ? formatDateTimeWIB(job.printed_at) : '-'}</td>
                      <td className="p-4">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="text-xs h-8 px-3 rounded-lg w-full justify-center whitespace-nowrap"
                          onClick={(e) => promptRetry(job, e)}
                        >
                          <IconRefreshDot className="w-3.5 h-3.5 mr-1" /> Ulang
                        </Button>
                      </td>
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

      {/* Rincian Item Massal Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Rincian Item"
        isBottomSheetOnMobile={true}
      >
        {selectedJob && Array.isArray(selectedJob.payload_json) ? (
          <div className="space-y-3">
             <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl mb-4 text-sm font-medium border border-neutral-100 dark:border-neutral-800 flex justify-between">
               <span>Total Item:</span>
               <span className="text-brand-600 dark:text-brand-400">{selectedJob.payload_json.length} Item</span>
             </div>
             <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
               {selectedJob.payload_json.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">{item.name || '-'}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Qty: {item.qty || 1} {item.price ? ` | ${item.price}` : ''}</div>
                    </div>
                  </div>
               ))}
             </div>
          </div>
        ) : (
          <p className="text-center text-neutral-500 py-8">Rincian tidak tersedia</p>
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => !isRetrying && setIsConfirmOpen(false)}
        title="Konfirmasi Cetak Ulang"
        size="sm"
      >
        <div className="space-y-5">
           <p className="text-sm text-neutral-600 dark:text-neutral-400">
             Apakah Anda yakin ingin mencetak ulang item ini? Perintah ini akan mengirimkan data ke antrean cetak (background).
           </p>
           
           <div className="flex gap-3 pt-2">
             <Button variant="secondary" className="flex-1" onClick={() => setIsConfirmOpen(false)} disabled={isRetrying}>Batal</Button>
             <Button variant="primary" className="flex-1" onClick={executeRetry} disabled={isRetrying}>
               {isRetrying ? <IconLoader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Ya, Cetak'}
             </Button>
           </div>
        </div>
      </Modal>

    </AmbientLayout>
  );
}
