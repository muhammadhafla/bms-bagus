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
  children
}: ReportStateProps) {
  if (error) {
    return (
      <div className="mt-3 p-4 bg-danger-50 text-danger-600 rounded-xl text-sm border border-danger-100 flex items-center gap-2">
        <IconAlertCircle className="w-5 h-5 shrink-0" />
        <span className="font-medium">{error}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500">
        <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-700 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <p>Memuat data...</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 dark:text-neutral-500 text-center px-4">
        {emptyIcon && <div className="mb-4 text-neutral-300 dark:text-neutral-600">{emptyIcon}</div>}
        <p className="text-lg font-medium text-neutral-700 dark:text-neutral-300">{emptyTitle}</p>
        <p className="text-sm mt-1 max-w-sm">{emptyDescription}</p>
      </div>
    );
  }

  return <>{children}</>;
}
