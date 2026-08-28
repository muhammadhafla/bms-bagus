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
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  prefix = '',
  suffix = '',
  variant = 'default',
  onClick,
}: StatCardProps) {
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
    iconSizeClass =
      '[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 lg:[&>svg]:w-6 lg:[&>svg]:h-6';
  } else if (finalStringLength >= 10) {
    textSizeClass = 'text-base sm:text-xl lg:text-2xl';
    iconContainerClass = 'p-1.5 sm:p-2.5 lg:p-3';
    iconSizeClass =
      '[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 lg:[&>svg]:w-6 lg:[&>svg]:h-6';
  }

  const cardBgColors = {
    default: 'bg-white/70 dark:bg-neutral-900/60',
    success: 'bg-accent-teal-50/60 dark:bg-accent-teal-900/20',
    warning: 'bg-accent-amber-50/60 dark:bg-accent-amber-900/20',
    danger: 'bg-accent-rose-50/60 dark:bg-accent-rose-900/20',
  };

  return (
    <div 
      className={`group card-hover animate-fade-in-up relative overflow-hidden rounded-2xl ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      {/* Soft background glow */}
      <div
        className={`absolute -top-4 -right-4 h-24 w-24 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40 ${iconBgClasses[variant]}`}
      />

      <Card
        padding="none"
        variant="flat"
        className={`relative h-full ${cardBgColors[variant]} border backdrop-blur-xl ${borderColors[variant]} p-3 transition-all duration-300 sm:p-4 lg:p-6`}
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start sm:gap-0">
          <div className="order-2 min-w-0 flex-1 sm:order-1">
            <p className="truncate text-xs font-medium text-neutral-500 sm:text-sm dark:text-neutral-400">
              {title}
            </p>
            <p
              className={`mt-0.5 sm:mt-1.5 ${textSizeClass} truncate font-extrabold tracking-tight text-neutral-900 dark:text-white`}
              title={`${prefix}${formatNumber(value)}${suffix}`}
            >
              {prefix}
              {formatNumber(animatedValue)}
              {suffix}
            </p>
          </div>
          <div
            className={`${iconContainerClass} order-1 w-fit flex-shrink-0 rounded-lg sm:order-2 sm:rounded-xl ${iconBgClasses[variant]} ${iconShadowClasses[variant]}`}
          >
            <div className={`text-white ${iconSizeClass}`}>{icon}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card
      padding="none"
      variant="flat"
      className="animate-pulse rounded-2xl border border-white/20 bg-white/50 p-3 backdrop-blur sm:p-4 lg:p-6 dark:border-white/5 dark:bg-neutral-900/40"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start sm:gap-0">
        <div className="order-2 w-full sm:order-1">
          <div className="mb-2 h-3 w-20 rounded bg-neutral-200 sm:mb-3 sm:h-4 sm:w-28 dark:bg-neutral-700" />
          <div className="h-6 w-24 rounded bg-neutral-200 sm:h-8 sm:w-40 dark:bg-neutral-700" />
        </div>
        <div className="order-1 h-9 w-9 rounded-lg bg-neutral-200 sm:order-2 sm:h-12 sm:w-12 sm:rounded-xl dark:bg-neutral-700" />
      </div>
    </Card>
  );
}

export function HeroStatCard({
  title,
  value,
  icon,
  prefix = '',
  suffix = '',
  variant = 'success',
}: StatCardProps) {
  const animatedValue = useCountUp(value);

  const bgClasses = {
    default: 'bg-gradient-to-br from-brand-500 to-brand-700',
    success: 'bg-gradient-to-br from-accent-teal-500 to-accent-teal-700',
    warning: 'bg-gradient-to-br from-accent-amber-500 to-accent-amber-700',
    danger: 'bg-gradient-to-br from-accent-rose-500 to-accent-rose-700',
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  return (
    <div
      className={`group animate-fade-in-up relative overflow-hidden rounded-2xl ${bgClasses[variant]} text-white`}
    >
      <div className="relative flex items-center justify-between p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-white/90 uppercase">{title}</p>
          <p
            className="mt-1 truncate text-2xl font-black tracking-tighter sm:text-3xl"
            title={`${prefix}${formatNumber(value)}${suffix}`}
          >
            {prefix}
            {formatNumber(animatedValue)}
            {suffix}
          </p>
        </div>
        <div className="rounded-xl bg-white/20 p-2.5 text-white backdrop-blur-sm sm:p-3">
          <div className="[&>svg]:h-6 [&>svg]:w-6 sm:[&>svg]:h-7 sm:[&>svg]:w-7">{icon}</div>
        </div>
      </div>
    </div>
  );
}

export function HeroStatCardSkeleton() {
  return (
    <div className="relative flex h-[88px] animate-pulse items-center justify-between overflow-hidden rounded-2xl bg-neutral-200 p-5 sm:h-[104px] sm:p-6 dark:bg-neutral-800">
      <div>
        <div className="mb-2 h-3 w-32 rounded bg-neutral-300 dark:bg-neutral-700" />
        <div className="h-8 w-48 rounded bg-neutral-300 sm:h-10 dark:bg-neutral-700" />
      </div>
      <div className="h-11 w-11 rounded-xl bg-neutral-300 sm:h-12 sm:w-12 dark:bg-neutral-700" />
    </div>
  );
}

export function CompactStatCard({
  title,
  value,
  icon,
  prefix = '',
  suffix = '',
  variant = 'default',
  onClick,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const iconColors = {
    default:
      'text-brand-600 bg-white dark:bg-neutral-800 shadow-sm border border-brand-100 dark:border-brand-900/50',
    success:
      'text-accent-teal-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-teal-100 dark:border-accent-teal-900/50',
    warning:
      'text-accent-amber-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-amber-100 dark:border-accent-amber-900/50',
    danger:
      'text-accent-rose-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-rose-100 dark:border-accent-rose-900/50',
  };

  const bgColors = {
    default: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
    success: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
    warning: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
    danger: 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800',
  };

  const finalStringLength = `${prefix}${formatNumber(value)}${suffix}`.length;
  let textSizeClass = 'text-xl sm:text-2xl lg:text-3xl';
  if (finalStringLength >= 14) textSizeClass = 'text-base sm:text-lg lg:text-xl';
  else if (finalStringLength >= 10) textSizeClass = 'text-lg sm:text-xl lg:text-2xl';

  return (
    <div onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
      <Card
        padding="none"
        variant="flat"
        className={`relative rounded-2xl ${bgColors[variant]} card-hover animate-fade-in-up border p-4 sm:p-5 ${onClick ? 'hover:shadow-md transition-shadow' : ''}`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`flex-shrink-0 rounded-xl p-2 sm:p-2.5 ${iconColors[variant]}`}>
            <div className="[&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">{icon}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-neutral-500 sm:text-sm dark:text-neutral-400">
              {title}
            </p>
            <p
              className={`mt-1 ${textSizeClass} truncate font-bold tracking-tight text-neutral-900 dark:text-white`}
              title={`${prefix}${formatNumber(value)}${suffix}`}
            >
              {prefix}
              {formatNumber(animatedValue)}
              {suffix}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function CompactStatCardSkeleton() {
  return (
    <Card
      padding="none"
      variant="flat"
      className="animate-pulse rounded-2xl border border-neutral-100 bg-white/50 p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-neutral-200 sm:h-11 sm:w-11 dark:bg-neutral-700" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 h-3 w-20 rounded bg-neutral-200 sm:h-4 sm:w-24 dark:bg-neutral-700" />
          <div className="h-6 w-full max-w-[120px] rounded bg-neutral-200 sm:h-7 dark:bg-neutral-700" />
        </div>
      </div>
    </Card>
  );
}

export function ListStatCard({
  title,
  value,
  icon,
  prefix = '',
  suffix = '',
  variant = 'default',
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const formatNumber = (num: number) => new Intl.NumberFormat('id-ID').format(num);

  const iconColors = {
    default:
      'text-brand-600 bg-white dark:bg-neutral-800 shadow-sm border border-brand-100 dark:border-brand-900/50',
    success:
      'text-accent-teal-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-teal-100 dark:border-accent-teal-900/50',
    warning:
      'text-accent-amber-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-amber-100 dark:border-accent-amber-900/50',
    danger:
      'text-accent-rose-600 bg-white dark:bg-neutral-800 shadow-sm border border-accent-rose-100 dark:border-accent-rose-900/50',
  };

  const bgColors = {
    default:
      'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100/50 dark:border-brand-900/30 hover:bg-brand-50 dark:hover:bg-brand-900/20',
    success:
      'bg-accent-teal-50/50 dark:bg-accent-teal-900/10 border-accent-teal-100/50 dark:border-accent-teal-900/30 hover:bg-accent-teal-50 dark:hover:bg-accent-teal-900/20',
    warning:
      'bg-accent-amber-50/50 dark:bg-accent-amber-900/10 border-accent-amber-100/50 dark:border-accent-amber-900/30 hover:bg-accent-amber-50 dark:hover:bg-accent-amber-900/20',
    danger:
      'bg-accent-rose-50/50 dark:bg-accent-rose-900/10 border-accent-rose-100/50 dark:border-accent-rose-900/30 hover:bg-accent-rose-50 dark:hover:bg-accent-rose-900/20',
  };

  return (
    <div
      className={`animate-fade-in-up flex items-center gap-3 rounded-xl border p-3 transition-colors sm:gap-4 sm:p-4 ${bgColors[variant]}`}
    >
      <div className={`flex-shrink-0 rounded-lg p-2 sm:p-2.5 ${iconColors[variant]}`}>
        <div className="[&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-neutral-600 sm:text-sm uppercase tracking-wide dark:text-neutral-400">
          {title}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p
          className="truncate text-lg font-black tracking-tight text-neutral-900 sm:text-xl dark:text-white"
          title={`${prefix}${formatNumber(value)}${suffix}`}
        >
          {prefix}
          {formatNumber(animatedValue)}
          {suffix}
        </p>
      </div>
    </div>
  );
}

export function ListStatCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-2xl border border-neutral-100 bg-white/50 p-3 sm:gap-4 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="h-9 w-9 flex-shrink-0 rounded-xl bg-neutral-200 sm:h-10 sm:w-10 dark:bg-neutral-700" />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-24 rounded bg-neutral-200 sm:h-5 sm:w-32 dark:bg-neutral-700" />
      </div>
      <div className="flex-shrink-0">
        <div className="h-5 w-16 rounded bg-neutral-200 sm:h-6 sm:w-20 dark:bg-neutral-700" />
      </div>
    </div>
  );
}
