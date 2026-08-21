import { PrintJob } from '../types';
import { renderStatusBadge, renderItemInfo } from './PrintHistoryHelpers';
import { formatDateTimeWIB } from '@/lib/utils';
import { Button } from '@/components/ui';
import { IconPrinter, IconRefreshDot, IconCopy } from '@tabler/icons-react';
import { toast } from 'sonner';

interface Props {
  jobs: PrintJob[];
  loading: boolean;
  onOpenDetail: (job: PrintJob) => void;
  onPromptRetry: (job: PrintJob, e: React.MouseEvent) => void;
  onNavigatePrint: () => void;
}

export function PrintHistoryMobileList({ jobs, loading, onOpenDetail, onPromptRetry, onNavigatePrint }: Props) {
  if (loading) {
    return (
      <div className="block flex-1 space-y-4 p-4 md:hidden">
        {[...Array(5)].map((_, i) => (
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
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="block flex-1 space-y-4 p-4 md:hidden">
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
            onClick={onNavigatePrint}
            variant="primary"
            className="w-full max-w-xs shadow-md"
          >
            Cetak Label Sekarang
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="block flex-1 space-y-4 p-4 md:hidden">
      {jobs.map((job) => (
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

          {renderItemInfo(job, true, onOpenDetail)}

          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800/50">
            <div className="flex flex-col gap-0.5 font-mono text-[10px] text-neutral-400">
              <div className="flex items-center gap-1">
                ID: {job.id.substring(0, 8)}...
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(job.id);
                    toast.success('ID Job disalin');
                  }}
                  className="hover:text-neutral-600 dark:hover:text-neutral-200"
                  title="Salin ID"
                >
                  <IconCopy size={12} />
                </button>
              </div>
              {job.printed_at && (
                <div>Selesai: {formatDateTimeWIB(job.printed_at).split(' ')[1]}</div>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={(e) => onPromptRetry(job, e)}
            >
              <IconRefreshDot className="mr-1 h-3.5 w-3.5" /> Cetak Ulang
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
