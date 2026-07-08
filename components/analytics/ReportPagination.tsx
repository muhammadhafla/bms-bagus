import React from 'react';
import { Button } from '@/components/ui';

interface ReportPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  actions?: React.ReactNode;
}

export function ReportPagination({ page, totalPages, onPageChange, actions }: ReportPaginationProps) {
  if (totalPages <= 1 && !actions) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-md border-t border-neutral-200/50 dark:border-neutral-800/50 gap-4 mt-4 rounded-3xl shadow-elevated">
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
        {totalPages > 1 && (
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Halaman <span className="font-bold text-neutral-900 dark:text-white">{page}</span> dari <span className="font-bold text-neutral-900 dark:text-white">{totalPages}</span>
          </p>
        )}
        {actions && <div className="hidden sm:block">{actions}</div>}
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {totalPages > 1 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1 sm:flex-none justify-center" 
              onClick={() => onPageChange(page - 1)} 
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1 sm:flex-none justify-center" 
              onClick={() => onPageChange(page + 1)} 
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        )}
        {actions && <div className="block sm:hidden w-full mt-2">{actions}</div>}
      </div>
    </div>
  );
}
