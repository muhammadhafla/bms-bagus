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

  const finalStringLength = `${prefix}${formatNumber(value)}${suffix}`.length;
  
  // Dynamic font and icon size to prevent layout breakage on small screens for large numbers
  let textSizeClass = 'text-lg sm:text-2xl lg:text-3xl';
  let iconContainerClass = 'p-2 sm:p-3';
  let iconSizeClass = '[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6';
  
  if (finalStringLength >= 14) {
    textSizeClass = 'text-sm sm:text-lg lg:text-xl';
    iconContainerClass = 'p-1.5 sm:p-2 lg:p-3';
    iconSizeClass = '[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 lg:[&>svg]:w-6 lg:[&>svg]:h-6';
  } else if (finalStringLength >= 10) {
    textSizeClass = 'text-base sm:text-xl lg:text-2xl';
    iconContainerClass = 'p-1.5 sm:p-2.5 lg:p-3';
    iconSizeClass = '[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 lg:[&>svg]:w-6 lg:[&>svg]:h-6';
  }

  const cardBgColors = {
    default: 'bg-white/70 dark:bg-neutral-900/60',
    success: 'bg-accent-teal-50/60 dark:bg-accent-teal-900/20',
    warning: 'bg-accent-amber-50/60 dark:bg-accent-amber-900/20',
    danger: 'bg-accent-rose-50/60 dark:bg-accent-rose-900/20',
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden group card-hover animate-fade-in-up`}>
      {/* Soft background glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${iconBgClasses[variant]}`} />
      
      <Card padding="none" variant="flat" className={`relative h-full ${cardBgColors[variant]} backdrop-blur-xl border ${borderColors[variant]} transition-all duration-300 p-3 sm:p-4 lg:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
          <div className="flex-1 order-2 sm:order-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">{title}</p>
            <p 
              className={`mt-0.5 sm:mt-1.5 ${textSizeClass} font-extrabold text-neutral-900 dark:text-white tracking-tight truncate`}
              title={`${prefix}${formatNumber(value)}${suffix}`}
            >
              {prefix}{formatNumber(animatedValue)}{suffix}
            </p>
          </div>
          <div className={`${iconContainerClass} rounded-lg sm:rounded-xl order-1 sm:order-2 flex-shrink-0 w-fit ${iconBgClasses[variant]} ${iconShadowClasses[variant]}`}>
            <div className={`text-white ${iconSizeClass}`}>
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
    <Card padding="none" variant="flat" className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur border border-white/20 dark:border-white/5 animate-pulse rounded-2xl p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
        <div className="w-full order-2 sm:order-1">
          <div className="h-3 sm:h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20 sm:w-28 mb-2 sm:mb-3" />
          <div className="h-6 sm:h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-24 sm:w-40" />
        </div>
        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-neutral-200 dark:bg-neutral-700 rounded-lg sm:rounded-xl order-1 sm:order-2" />
      </div>
    </Card>
  );
}

export function HeroStatCard({ title, value, icon, prefix = '', suffix = '', variant = 'success' }: StatCardProps) {
  const animatedValue = useCountUp(value);
  
  const bgClasses = {
    default: 'bg-gradient-to-br from-brand-500 to-brand-700',
    success: 'bg-gradient-to-br from-accent-teal-500 to-accent-teal-700',
    warning: 'bg-gradient-to-br from-accent-amber-500 to-accent-amber-700',
    danger: 'bg-gradient-to-br from-accent-rose-500 to-accent-rose-700',
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  return (
    <div className={`relative rounded-3xl overflow-hidden group animate-fade-in-up ${bgClasses[variant]} text-white shadow-lg`}>
      {/* Abstract background shapes */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/10 rounded-full blur-xl" />
      
      <div className="relative p-6 sm:p-8 flex flex-col justify-between h-full min-h-[140px] sm:min-h-[160px]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm sm:text-base font-medium text-white/90">{title}</p>
          <div className="p-2 sm:p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white">
            <div className="[&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8">
              {icon}
            </div>
          </div>
        </div>
        <div>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight truncate" title={`${prefix}${formatNumber(value)}${suffix}`}>
            {prefix}{formatNumber(animatedValue)}{suffix}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeroStatCardSkeleton() {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 animate-pulse h-[140px] sm:h-[160px] p-6 sm:p-8 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <div className="h-4 sm:h-5 bg-neutral-300 dark:bg-neutral-700 rounded w-32" />
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-neutral-300 dark:bg-neutral-700 rounded-xl" />
      </div>
      <div className="h-8 sm:h-10 lg:h-12 bg-neutral-300 dark:bg-neutral-700 rounded w-48 sm:w-64" />
    </div>
  );
}

export function CompactStatCard({ title, value, icon, prefix = '', suffix = '', variant = 'default' }: StatCardProps) {
  const animatedValue = useCountUp(value);
  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const iconColors = {
    default: 'text-brand-600 bg-white dark:bg-neutral-800 shadow-sm border border-brand-100 dark:border-brand-900/50',
    success: 'text-accent-teal-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-teal-100 dark:border-accent-teal-900/50',
    warning: 'text-accent-amber-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-amber-100 dark:border-accent-amber-900/50',
    danger: 'text-accent-rose-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-rose-100 dark:border-accent-rose-900/50',
  };

  const bgColors = {
    default: 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100/50 dark:border-brand-900/30',
    success: 'bg-accent-teal-50/50 dark:bg-accent-teal-900/10 border-accent-teal-100/50 dark:border-accent-teal-900/30',
    warning: 'bg-accent-amber-50/50 dark:bg-accent-amber-900/10 border-accent-amber-100/50 dark:border-accent-amber-900/30',
    danger: 'bg-accent-rose-50/50 dark:bg-accent-rose-900/10 border-accent-rose-100/50 dark:border-accent-rose-900/30',
  };

  const finalStringLength = `${prefix}${formatNumber(value)}${suffix}`.length;
  let textSizeClass = 'text-xl sm:text-2xl lg:text-3xl';
  if (finalStringLength >= 14) textSizeClass = 'text-base sm:text-lg lg:text-xl';
  else if (finalStringLength >= 10) textSizeClass = 'text-lg sm:text-xl lg:text-2xl';

  return (
    <Card padding="none" variant="flat" className={`relative rounded-2xl ${bgColors[variant]} border p-4 sm:p-5 card-hover animate-fade-in-up`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${iconColors[variant]}`}>
          <div className="[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6">
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">{title}</p>
          <p className={`mt-1 ${textSizeClass} font-bold text-neutral-900 dark:text-white tracking-tight truncate`} title={`${prefix}${formatNumber(value)}${suffix}`}>
            {prefix}{formatNumber(animatedValue)}{suffix}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function CompactStatCardSkeleton() {
  return (
    <Card padding="none" variant="flat" className="rounded-2xl bg-white/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 animate-pulse p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-neutral-200 dark:bg-neutral-700 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3 sm:h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20 sm:w-24 mb-2" />
          <div className="h-6 sm:h-7 bg-neutral-200 dark:bg-neutral-700 rounded w-full max-w-[120px]" />
        </div>
      </div>
    </Card>
  );
}

export function ListStatCard({ title, value, icon, prefix = '', suffix = '', variant = 'default' }: StatCardProps) {
  const animatedValue = useCountUp(value);
  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const iconColors = {
    default: 'text-brand-600 bg-white dark:bg-neutral-800 shadow-sm border border-brand-100 dark:border-brand-900/50',
    success: 'text-accent-teal-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-teal-100 dark:border-accent-teal-900/50',
    warning: 'text-accent-amber-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-amber-100 dark:border-accent-amber-900/50',
    danger: 'text-accent-rose-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-rose-100 dark:border-accent-rose-900/50',
  };

  const bgColors = {
    default: 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100/50 dark:border-brand-900/30 hover:bg-brand-50 dark:hover:bg-brand-900/20',
    success: 'bg-accent-teal-50/50 dark:bg-accent-teal-900/10 border-accent-teal-100/50 dark:border-accent-teal-900/30 hover:bg-accent-teal-50 dark:hover:bg-accent-teal-900/20',
    warning: 'bg-accent-amber-50/50 dark:bg-accent-amber-900/10 border-accent-amber-100/50 dark:border-accent-amber-900/30 hover:bg-accent-amber-50 dark:hover:bg-accent-amber-900/20',
    danger: 'bg-accent-rose-50/50 dark:bg-accent-rose-900/10 border-accent-rose-100/50 dark:border-accent-rose-900/30 hover:bg-accent-rose-50 dark:hover:bg-accent-rose-900/20',
  };

  return (
    <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-colors animate-fade-in-up ${bgColors[variant]}`}>
      <div className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${iconColors[variant]}`}>
         <div className="[&>svg]:w-5 [&>svg]:h-5">
            {icon}
         </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-medium text-neutral-600 dark:text-neutral-300 truncate">{title}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white truncate" title={`${prefix}${formatNumber(value)}${suffix}`}>
          {prefix}{formatNumber(animatedValue)}{suffix}
        </p>
      </div>
    </div>
  );
}

export function ListStatCardSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-white/50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800 animate-pulse">
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-neutral-200 dark:bg-neutral-700 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 sm:h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-24 sm:w-32" />
      </div>
      <div className="flex-shrink-0">
        <div className="h-5 sm:h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-16 sm:w-20" />
      </div>
    </div>
  );
}