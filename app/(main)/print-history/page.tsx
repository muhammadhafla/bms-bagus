'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import {
  AmbientLayout,
  Button,
  ModernPagination,
  FilterButton,
} from '@/components/ui';
import {
  IconHistory,
  IconX,
  IconArrowDown,
  IconLoader2,
} from '@tabler/icons-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const PullToRefresh = dynamic(() => import('react-simple-pull-to-refresh'), { ssr: false });
import { fetchApi } from '@/lib/fetchApi';

import { PrintJob } from './types';
import { PrintHistoryTable } from './components/PrintHistoryTable';
import { PrintHistoryMobileList } from './components/PrintHistoryMobileList';
import { PrintFilterSidebar } from './components/PrintFilterSidebar';

function PrintHistoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // URL-based State
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 20;

  // Detail Modal & Actions
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [jobToRetry, setJobToRetry] = useState<PrintJob | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const updateFilter = (newFilters: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset page to 1 if filter (other than page itself) changes
    if (newFilters.page === undefined && (newFilters.startDate !== undefined || newFilters.endDate !== undefined || newFilters.status !== undefined)) {
       params.delete('page'); // Removing page means it defaults to 1
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchHistory = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);

      const res = await fetchApi(`/api/print/history?${params.toString()}`, { signal });

      if (!res.ok) throw new Error('Gagal memuat riwayat');

      const data = await res.json();

      if (data.history) {
        setJobs(data.history);
      }
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') return; // Abaikan error pembatalan request
        console.error('Failed to fetch print history', err);
        toast.error(err.message || 'Gagal memuat riwayat cetak');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [page, startDate, endDate, status]);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]);

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message || 'Terjadi kesalahan saat mencetak ulang');
      }
    } finally {
      setIsRetrying(false);
      setJobToRetry(null);
    }
  };

  const activeFilters = [];
  if (startDate || endDate) {
    activeFilters.push({
      id: 'date',
      label: `${startDate ? startDate : 'Awal'} - ${endDate ? endDate : 'Sekarang'}`,
      onRemove: () => updateFilter({ startDate: '', endDate: '' }),
    });
  }
  if (status) {
    activeFilters.push({
      id: 'status',
      label: `Status: ${status}`,
      onRemove: () => updateFilter({ status: '' }),
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
                  <p className="mt-0.5 hidden md:block text-xs font-medium text-neutral-500 lg:mt-2 lg:text-base dark:text-neutral-400">
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

        <PrintFilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          status={status}
          startDate={startDate}
          endDate={endDate}
          onFilterChange={updateFilter}
        />

        <div
          className="animate-fade-in-up flex flex-1 flex-col"
          style={{ animationDelay: '100ms' }}
        >
          <div className="shadow-elevated flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl dark:border-neutral-800/60 dark:bg-neutral-900/60">
            <PrintHistoryMobileList
              jobs={jobs}
              loading={loading}
              onOpenDetail={openDetail}
              onPromptRetry={promptRetry}
              onNavigatePrint={() => router.push('/print')}
            />
            
            <PrintHistoryTable
              jobs={jobs}
              loading={loading}
              onOpenDetail={openDetail}
              onPromptRetry={promptRetry}
              onNavigatePrint={() => router.push('/print')}
            />

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <ModernPagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => updateFilter({ page: p.toString() })}
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

export default function PrintHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><IconLoader2 className="animate-spin h-8 w-8 mx-auto text-brand-500" /></div>}>
      <PrintHistoryContent />
    </Suspense>
  );
}
