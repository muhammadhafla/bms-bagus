import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, icon, prefix = '', suffix = '', variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const iconVariantClasses = {
    default: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    success: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    warning: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    danger: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
            {prefix}{formatNumber(value)}{suffix}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${iconVariantClasses[variant]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 p-4 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-full">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24 mb-2" />
          <div className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
        </div>
      </div>
    </div>
  );
}
