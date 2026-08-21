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

export function PrintHistoryTable({ jobs, loading, onOpenDetail, onPromptRetry, onNavigatePrint }: Props) {
  return (
    <div className="hidden flex-1 overflow-x-auto md:block">
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead className="border-b border-neutral-200/50 bg-white/50 backdrop-blur-md dark:border-neutral-800/50 dark:bg-neutral-950/50">
          <tr>
            <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">ID Job</th>
            <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Item</th>
            <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Status</th>
            <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Waktu Buat</th>
            <th className="p-4 font-semibold text-neutral-600 dark:text-neutral-300">Waktu Selesai</th>
            <th className="w-24 p-4 font-semibold text-neutral-600 dark:text-neutral-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/50">
                <td className="p-4"><div className="h-4 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                </td>
                <td className="p-4"><div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" /></td>
                <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                <td className="p-4"><div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" /></td>
                <td className="p-4"><div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" /></td>
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
                    Anda belum pernah mencetak label apapun atau tidak ada data yang cocok dengan filter.
                  </p>
                  <Button onClick={onNavigatePrint} variant="primary" className="shadow-md">
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
                <td className="p-4">
                  <div className="group flex items-center gap-1.5 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {job.id.substring(0, 8)}...
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(job.id);
                        toast.success('ID Job disalin');
                      }}
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-800 dark:hover:text-neutral-200"
                      title="Salin ID penuh"
                    >
                      <IconCopy size={14} />
                    </button>
                  </div>
                </td>
                <td className="p-4">{renderItemInfo(job, true, onOpenDetail)}</td>
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
                    onClick={(e) => onPromptRetry(job, e)}
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
  );
}
