import { ReactNode, useEffect, useState } from 'react';
import { Card } from '@/components/ui';

// Hook untuk animasi Count Up
function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuart animation curve
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * end));
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, icon, prefix = '', suffix = '', variant = 'default' }: StatCardProps) {
  const animatedValue = useCountUp(value);

  const borderColors = {
    default: 'border-white/40 dark:border-white/10',
    success: 'border-accent-teal-200/50 dark:border-accent-teal-500/20',
    warning: 'border-accent-amber-200/50 dark:border-accent-amber-500/20',
    danger: 'border-accent-rose-200/50 dark:border-accent-rose-500/20',
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
    <div className={`relative rounded-2xl overflow-hidden group card-hover animate-fade-in-up`}>
      {/* Soft background glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${iconBgClasses[variant]}`} />
      
      <Card padding="none" variant="flat" className={`relative h-full bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border ${borderColors[variant]} transition-all duration-300 p-4 lg:p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
            <p className="mt-1.5 text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {prefix}{formatNumber(animatedValue)}{suffix}
            </p>
        </div>
        <div className={`p-3 rounded-xl ${iconBgClasses[variant]} ${iconShadowClasses[variant]}`}>
          <div className="text-white">
            {icon}
          </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card padding="none" variant="flat" className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur border border-white/20 dark:border-white/5 animate-pulse rounded-2xl p-4 lg:p-6">
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