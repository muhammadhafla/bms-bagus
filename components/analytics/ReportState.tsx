import React from 'react';
import { IconAlertCircle } from '@tabler/icons-react';

interface ReportStateProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
}

export function ReportState({
  loading,
  error,
  isEmpty,
  emptyIcon,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Coba sesuaikan filter rentang tanggal atau kategori Anda.',
  children,
}: ReportStateProps) {
  if (error) {
    return (
      <div className="bg-danger-50 text-danger-600 border-danger-100 mt-3 flex items-center gap-2 rounded-xl border p-4 text-sm">
        <IconAlertCircle className="h-5 w-5 shrink-0" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-neutral-400 dark:text-neutral-500">
        <div className="border-t-brand-600 mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 dark:border-neutral-700"></div>
        <p>Memuat data...</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex h-64 flex-col items-center justify-center px-4 text-center text-neutral-400 dark:text-neutral-500">
        {emptyIcon && (
          <div className="mb-4 text-neutral-300 dark:text-neutral-600">{emptyIcon}</div>
        )}
        <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-sm">{emptyDescription}</p>
      </div>
    );
  }

  return <>{children}</>;
}
