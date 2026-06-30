'use client';

import { useState, useEffect, useCallback } from 'react';
import { AmbientLayout, Button } from '@/components/ui';
import DateInput from '@/components/ui/DateInput';
import { IconHistory, IconRefresh, IconPrinter, IconChevronLeft, IconChevronRight, IconFilter } from '@tabler/icons-react';

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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

      const res = await fetch(`/api/print/history?${params.toString()}`);
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

  return (
    <AmbientLayout>
      <div className="mb-4 lg:mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
          <div className="flex items-center gap-4 animate-fade-in-up pl-12 lg:pl-0">
            <IconHistory className="w-6 h-6 lg:w-8 lg:h-8 text-brand-500 shrink-0" stroke={1.5} />
            <div>
              <h1 className="text-xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Riwayat Cetak</h1>
              <p className="text-xs lg:text-base text-neutral-500 dark:text-neutral-400 mt-0.5 lg:mt-2 font-medium">Lihat riwayat pencetakan label massal Anda.</p>
            </div>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="flex items-center gap-2 sm:gap-4 animate-fade-in-up w-full" style={{ animationDelay: '50ms' }}>
          <Button
            variant="secondary"
            onClick={() => fetchHistory()}
            className="flex-shrink-0 flex items-center justify-center gap-2 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 h-[52px] w-[52px] sm:h-auto sm:w-auto sm:px-4 sm:py-3"
          >
            <IconRefresh size={20} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline font-medium">Refresh</span>
          </Button>

          <div className="flex flex-1 items-center gap-2 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 p-2 sm:p-3 rounded-2xl shadow-sm overflow-x-auto">
            <div className="px-1 sm:px-2 text-neutral-500 dark:text-neutral-400 flex items-center gap-2 sm:border-r border-neutral-200 dark:border-neutral-800 sm:mr-2 shrink-0">
              <IconFilter size={20} />
              <span className="text-sm font-medium hidden sm:inline">Filter:</span>
            </div>
            <DateInput
              value={startDate}
              onChange={(val) => { setStartDate(val); handleDateChange(); }}
              placeholder="Dari"
              className="min-w-[130px] text-sm shrink-0"
              showClearButton
            />
            <span className="text-neutral-400 shrink-0">-</span>
            <DateInput
              value={endDate}
              onChange={(val) => { setEndDate(val); handleDateChange(); }}
              placeholder="Sampai"
              className="min-w-[130px] text-sm shrink-0"
              showClearButton
            />
          </div>
        </div>
      </div>

      <div className="flex-1 animate-fade-in-up flex flex-col" style={{ animationDelay: '100ms' }}>
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/40 dark:border-neutral-800/60 rounded-3xl shadow-elevated overflow-hidden min-h-[400px] flex flex-col flex-1">
          <div className="overflow-x-auto flex-1">
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
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{job.payload_json?.name || '-'}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Qty: {job.payload_json?.qty || 1} | {job.payload_json?.price || ''}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{new Date(job.created_at).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-neutral-600 dark:text-neutral-400">{job.printed_at ? new Date(job.printed_at).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-neutral-200/50 dark:border-neutral-800/50 bg-white/50 dark:bg-neutral-950/30 backdrop-blur-md">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Halaman {page} dari {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="!px-2"
                >
                  <IconChevronLeft size={20} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="!px-2"
                >
                  <IconChevronRight size={20} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AmbientLayout>
  );
}
