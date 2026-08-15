'use client';

import React, { useEffect, useState } from 'react';
import {
  IconX,
  IconAlertCircle,
  IconCheck,
  IconAlertTriangle,
  IconCircleCheck,
} from '@tabler/icons-react';

type BannerVariant = 'info' | 'success' | 'warning' | 'error';

interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface BannerProps {
  variant?: BannerVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  action?: BannerAction;
  duration?: number;
  className?: string;
}

const variantConfig: Record<
  BannerVariant,
  { bg: string; border: string; icon: React.ReactNode; iconColor: string }
> = {
  info: {
    bg: 'bg-accent-indigo-50 dark:bg-accent-indigo-950/40',
    border: 'border-accent-indigo-200 dark:border-accent-indigo-800',
    icon: <IconCircleCheck className="h-5 w-5" />,
    iconColor: 'text-accent-indigo-500 dark:text-accent-indigo-400',
  },
  success: {
    bg: 'bg-accent-teal-50 dark:bg-accent-teal-950/40',
    border: 'border-accent-teal-200 dark:border-accent-teal-800',
    icon: <IconCheck className="h-5 w-5" />,
    iconColor: 'text-accent-teal-500 dark:text-accent-teal-400',
  },
  warning: {
    bg: 'bg-accent-amber-50 dark:bg-accent-amber-950/40',
    border: 'border-accent-amber-200 dark:border-accent-amber-800',
    icon: <IconAlertTriangle className="h-5 w-5" />,
    iconColor: 'text-accent-amber-500 dark:text-accent-amber-400',
  },
  error: {
    bg: 'bg-accent-rose-50 dark:bg-accent-rose-950/40',
    border: 'border-accent-rose-200 dark:border-accent-rose-800',
    icon: <IconAlertCircle className="h-5 w-5" />,
    iconColor: 'text-accent-rose-500 dark:text-accent-rose-400',
  },
};

export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  action,
  duration,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  const config = variantConfig[variant];

  return (
    <div
      className={[
        'animate-fade-in flex items-start gap-3 rounded-xl border p-4',
        config.bg,
        config.border,
        className,
      ].join(' ')}
      role="alert"
    >
      <div className={`mt-0.5 flex-shrink-0 ${config.iconColor}`}>{config.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>}
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{children}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="focus:ring-brand-500 mt-2 rounded text-sm font-medium hover:underline focus:ring-2 focus:outline-none"
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            onDismiss();
          }}
          className="focus:ring-brand-500 flex-shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 focus:ring-2 focus:outline-none dark:hover:bg-white/5"
          aria-label="Dismiss"
        >
          <IconX className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        </button>
      )}
    </div>
  );
};

export default Banner;
