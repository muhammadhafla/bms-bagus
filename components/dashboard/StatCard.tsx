import { ReactNode } from 'react';
import { Card } from '@/components/ui';

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, icon, prefix = '', suffix = '', variant = 'default' }: StatCardProps) {
  const borderColors = {
    default: 'border-neutral-200 dark:border-neutral-800',
    success: 'border-accent-teal-200 dark:border-accent-teal-800',
    warning: 'border-accent-amber-200 dark:border-accent-amber-800',
    danger: 'border-accent-rose-200 dark:border-accent-rose-800',
  };

  const iconBgClasses = {
    default: 'bg-gradient-to-br from-brand-400 to-brand-500',
    success: 'bg-gradient-to-br from-accent-teal-400 to-accent-teal-500',
    warning: 'bg-gradient-to-br from-accent-amber-400 to-accent-amber-500',
    danger: 'bg-gradient-to-br from-accent-rose-400 to-accent-rose-500',
  };

  const iconShadowClasses = {
    default: 'shadow-brand',
    success: 'shadow-teal',
    warning: 'shadow-amber',
    danger: 'shadow-rose',
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <Card hover padding="lg" className={`border ${borderColors[variant]} card-hover animate-fade-in-up`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-neutral-900 dark:text-white">
            {prefix}{formatNumber(value)}{suffix}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses[variant]} ${iconShadowClasses[variant]}`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card padding="lg" className="border border-neutral-200 dark:border-neutral-800 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-full">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-28 mb-3" />
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-40" />
        </div>
        <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
      </div>
    </Card>
  );
}