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
  className = '' 
}: ModernPaginationProps) {
  if (totalPages <= 1) return null;

  const startIdx = total && total > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = total ? Math.min(page * limit, total) : 0;

  return (
    <div className={`flex-shrink-0 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 ${className}`}>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="p-2 sm:px-4 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
      >
        <IconChevronLeft className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-semibold">Sebelumnya</span>
      </button>
      
      <div className="text-center flex-1">
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm sm:text-base text-neutral-900 dark:text-white font-bold">
            Hal. {page} / {totalPages}
          </p>
          {total !== undefined && (
            <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 sm:mt-1 font-medium">
              {startIdx}-{endIdx} dari {total} data
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="p-2 sm:px-4 h-10 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
      >
        <span className="hidden sm:inline text-sm font-semibold">Berikutnya</span>
        <IconChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
