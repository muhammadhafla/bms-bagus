import React from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface ModernPaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ModernPagination({
  page,
  totalPages,
  total,
  limit = 20,
  onPageChange,
  className = '',
}: ModernPaginationProps) {
  if (totalPages <= 1) return null;

  const startIdx = total && total > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = total ? Math.min(page * limit, total) : 0;

  return (
    <nav
      role="navigation"
      aria-label="Navigasi paginasi"
      className={`flex flex-shrink-0 items-center justify-between gap-3 border-t border-neutral-200/50 bg-white/50 p-3 backdrop-blur-md sm:gap-4 sm:p-4 dark:border-neutral-800/50 dark:bg-neutral-950/50 ${className}`}
    >
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <IconChevronLeft className="h-5 w-5" aria-hidden="true" />
        <span className="hidden text-sm font-semibold sm:inline">Sebelumnya</span>
      </button>

      <div className="flex-1 text-center">
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-neutral-900 sm:text-base dark:text-white">
            Hal. {page} / {totalPages}
          </p>
          {total !== undefined && (
            <p className="mt-0.5 text-[10px] font-medium text-neutral-500 sm:mt-1 sm:text-xs dark:text-neutral-400">
              {startIdx}-{endIdx} dari {total} data
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
        className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <span className="hidden text-sm font-semibold sm:inline">Berikutnya</span>
        <IconChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </nav>
  );
}
