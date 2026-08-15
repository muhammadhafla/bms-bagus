import React from 'react';
import { Button } from '@/components/ui';

interface ReportPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  actions?: React.ReactNode;
}

export function ReportPagination({
  page,
  totalPages,
  onPageChange,
  actions,
}: ReportPaginationProps) {
  if (totalPages <= 1 && !actions) return null;

  return (
    <div className="shadow-elevated mt-4 flex flex-col items-center justify-between gap-4 rounded-3xl border-t border-neutral-200/50 bg-white/50 px-6 py-4 backdrop-blur-md sm:flex-row dark:border-neutral-800/50 dark:bg-neutral-950/50">
      <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
        {totalPages > 1 && (
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
          </p>
        )}
        {actions && <div className="hidden sm:block">{actions}</div>}
      </div>

      <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
        {totalPages > 1 && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center sm:flex-none"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center sm:flex-none"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        )}
        {actions && <div className="mt-2 block w-full sm:hidden">{actions}</div>}
      </div>
    </div>
  );
}
