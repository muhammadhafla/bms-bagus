'use client';

import React from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (currentPage > 3) {
      pages.push('...');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('...');
    }

    pages.push(totalPages);
  }

  return (
    <nav
      role="navigation"
      aria-label="Navigasi paginasi"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg p-2 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
        aria-label="Halaman sebelumnya"
      >
        <IconChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>

      {pages.map((page, idx) =>
        typeof page === 'number' ? (
          <button
            key={idx}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`h-9 min-w-[36px] rounded-lg px-3 text-sm font-medium transition-colors ${
              currentPage === page
                ? 'bg-brand-500 text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={idx} className="px-2 text-neutral-400">
            {page}
          </span>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg p-2 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-neutral-800"
        aria-label="Halaman berikutnya"
      >
        <IconChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </nav>
  );
}

export default Pagination;
