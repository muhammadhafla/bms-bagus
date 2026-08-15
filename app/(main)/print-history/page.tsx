'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AmbientLayout,
  Button,
  SlideOver,
  ModernPagination,
  FilterButton,
  DateRangePicker,
} from '@/components/ui';
import {
  IconHistory,
  IconRefresh,
  IconPrinter,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconX,
  IconArrowDown,
  IconCheck,
  IconAlertTriangle,
  IconLoader2,
  IconRefreshDot,
  IconFileDescription,
} from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
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
          color:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50',
          icon: <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />,
        };
      case 'Printing':
        return {
          color:
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
          icon: <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />,
        };
      case 'Done':
        return {
          color:
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
          icon: <IconCheck className="mr-1 h-3 w-3" />,
        };
      case 'Failed':
        return {
          color:
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
          icon: <IconAlertTriangle className="mr-1 h-3 w-3" />,
        };
      default:
        return {
          color:
            'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
          icon: null,
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
          payload_json: jobToRetry.payload_json,
        }),
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
    const itemName = isArrayPayload
      ? `${job.payload_json.length} Item`
      : (job.payload_json as PayloadItem)?.name || '-';
    const itemQty = isArrayPayload ? '-' : (job.payload_json as PayloadItem)?.qty || 1;
    const itemPrice = isArrayPayload ? '' : (job.payload_json as PayloadItem)?.price || '';

    return (
      <div
        className={`space-y-1 ${clickable && isArrayPayload ? '-ml-1.5 cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : ''}`}
        onClick={() => {
          if (clickable && isArrayPayload) openDetail(job);
        }}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Template: {job.label_templates?.name || '-'}
          {isArrayPayload && clickable && (
            <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
              <IconFileDescription className="h-3 w-3" /> Detail
            </span>
          )}
        </div>
        <div className="text-base leading-tight font-semibold text-neutral-900 dark:text-white">
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
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase shadow-sm ${badge.color}`}
      >
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
      onRemove: () => {
        setStartDate('');
        setEndDate('');
        handleFilterChange();
      },
    });
  }
  if (status) {
    activeFilters.push({
      id: 'status',
      label: `Status: ${status}`,
      onRemove: () => {
        setStatus('');
        handleFilterChange();
      },
    });
  }

  return (
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-row items-start justify-between gap-4">
              <div className="animate-fade-in-up flex items-center gap-4">
                <IconHistory
                  className="text-brand-500 h-6 w-6 shrink-0 lg:h-8 lg:w-8"
                  stroke={1.5}
                />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 lg:text-3xl dark:text-white">
                    Riwayat Cetak
                  </h1>
                  <p className="mt-0.5 text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
                    Lihat riwayat pencetakan label massal Anda.
                  </p>
                </div>
              </div>

              <div
                className="animate-fade-in-up shrink-0 pt-1 lg:pt-0"
                style={{ animationDelay: '50ms' }}
              >
                <FilterButton
                  onClick={() => setIsFilterOpen(true)}
                  activeCount={activeFilters.length}
                  className="border border-white/40 bg-white/70 shadow-sm backdrop-blur-xl transition-shadow hover:shadow-md dark:border-neutral-800/60 dark:bg-neutral-900/60"
                />
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div
                className="no-scrollbar animate-fade-in-up flex w-full items-center gap-2 overflow-x-auto py-1 whitespace-nowrap"
                style={{ animationDelay: '100ms' }}
              >
                <span className="mr-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Filter aktif:
                </span>
                {activeFilters.map((badge) => (
                  <div
                    key={badge.id}
                    className="bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800/30 text-brand-700 dark:text-brand-300 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm"
                  >
                    {badge.label}
                    <button
                      onClick={badge.onRemove}
                      className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 transition-colors"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <SlideOver
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filter Riwayat"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Status:
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  handleFilterChange();
                }}
                className="focus:border-brand-500 focus:ring-brand-500 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:ring-1 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Printing">Printing</option>
                <option value="Done">Done</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Periode Tanggal:
              </label>
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

            <div className="mt-6 flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
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

        <div
          className="animate-fade-in-up flex flex-1 flex-col"
          style={{ animationDelay: '100ms' }}
        >
          <div className="shadow-elevated flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-900/60">
            {/* Mobile Card List View */}
            <div className="block flex-1 space-y-4 p-4 md:hidden">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse space-y-3 rounded-2xl border border-neutral-100 bg-white/50 p-3 dark:border-neutral-800/50 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                    <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="mt-2 h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                ))
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-neutral-500 dark:text-neutral-400">
                  <IconPrinter className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-700" />
                  <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                    Belum Ada Riwayat
                  </h3>
                  <p className="mb-6 max-w-[250px] text-sm">
                    Anda belum pernah mencetak label apapun atau tidak ada data yang cocok dengan
                    filter.
                  </p>
                  <Button
                    onClick={() => router.push('/print')}
                    variant="primary"
                    className="w-full max-w-xs shadow-md"
                  >
                    Cetak Label Sekarang
                  </Button>
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-100 bg-white/50 p-3 shadow-sm backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatDateTimeWIB(job.created_at)}
                      </span>
                      {renderStatusBadge(job.status)}
                    </div>

                    {renderItemInfo(job, true)}

                    <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800/50">
                      <div className="font-mono text-[10px] text-neutral-400">
                        ID: {job.id.substring(0, 8)}...
                        <br />
                        {job.printed_at &&
                          `Selesai: ${formatDateTimeWIB(job.printed_at).split(' ')[1]}`}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg px-3 text-xs"
                        onClick={(e) => promptRetry(job, e)}
                      >
                        <IconRefreshDot className="mr-1 h-3.5 w-3.5" /> Cetak Ulang
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden flex-1 overflow-x-auto md:block">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
                  <tr>
                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                      ID Job
                    </th>
                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                      Item
                    </th>
                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                      Status
                    </th>
                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                      Waktu Buat
                    </th>
                    <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                      Waktu Selesai
                    </th>
                    <th className="w-24 p-4 font-semibold text-neutral-600 dark:text-neutral-300">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr
                        key={i}
                        className="border-b border-neutral-100 dark:border-neutral-800/50"
                      >
                        <td className="p-4">
                          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                            <div className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        </td>
                        <td className="p-4">
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                        </td>
                        <td className="p-4">
                          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                        </td>
                        <td className="p-4">
                          <div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                        </td>
                      </tr>
                    ))
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <div className="flex flex-col items-center justify-center px-4 py-16 text-neutral-500 dark:text-neutral-400">
                          <IconPrinter className="mb-4 h-16 w-16 text-neutral-300 dark:text-neutral-700" />
                          <h3 className="mb-2 text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                            Belum Ada Riwayat
                          </h3>
                          <p className="mb-6 text-sm">
                            Anda belum pernah mencetak label apapun atau tidak ada data yang cocok
                            dengan filter.
                          </p>
                          <Button
                            onClick={() => router.push('/print')}
                            variant="primary"
                            className="shadow-md"
                          >
                            Cetak Label Sekarang
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-neutral-100 text-sm transition-colors hover:bg-white/50 dark:border-neutral-800/50 dark:hover:bg-neutral-800/30"
                      >
                        <td className="p-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                          {job.id.substring(0, 8)}...
                        </td>
                        <td className="p-4">{renderItemInfo(job, true)}</td>
                        <td className="p-4">{renderStatusBadge(job.status)}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400">
                          {formatDateTimeWIB(job.created_at)}
                        </td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400">
                          {job.printed_at ? formatDateTimeWIB(job.printed_at) : '-'}
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-full justify-center rounded-lg px-3 text-xs whitespace-nowrap"
                            onClick={(e) => promptRetry(job, e)}
                          >
                            <IconRefreshDot className="mr-1 h-3.5 w-3.5" /> Ulang
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
            <div className="mb-4 flex justify-between rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">
              <span>Total Item:</span>
              <span className="text-brand-600 dark:text-brand-400">
                {selectedJob.payload_json.length} Item
              </span>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {selectedJob.payload_json.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50"
                >
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {item.name || '-'}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      Qty: {item.qty || 1} {item.price ? ` | ${item.price}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-neutral-500">Rincian tidak tersedia</p>
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
            Apakah Anda yakin ingin mencetak ulang item ini? Perintah ini akan mengirimkan data ke
            antrean cetak (background).
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isRetrying}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={executeRetry}
              disabled={isRetrying}
            >
              {isRetrying ? <IconLoader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Ya, Cetak'}
            </Button>
          </div>
        </div>
      </Modal>
    </AmbientLayout>
  );
}
