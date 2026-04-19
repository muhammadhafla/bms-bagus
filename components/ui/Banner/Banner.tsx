'use client';

import React, { useEffect, useState } from 'react';
import { IconX, IconAlertCircle, IconCheck, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';

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

const variantConfig: Record<BannerVariant, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
  info: {
    bg: 'bg-accent-indigo-50 dark:bg-accent-indigo-950/40',
    border: 'border-accent-indigo-200 dark:border-accent-indigo-800',
    icon: <IconCircleCheck className="w-5 h-5" />,
    iconColor: 'text-accent-indigo-500 dark:text-accent-indigo-400',
  },
  success: {
    bg: 'bg-accent-teal-50 dark:bg-accent-teal-950/40',
    border: 'border-accent-teal-200 dark:border-accent-teal-800',
    icon: <IconCheck className="w-5 h-5" />,
    iconColor: 'text-accent-teal-500 dark:text-accent-teal-400',
  },
  warning: {
    bg: 'bg-accent-amber-50 dark:bg-accent-amber-950/40',
    border: 'border-accent-amber-200 dark:border-accent-amber-800',
    icon: <IconAlertTriangle className="w-5 h-5" />,
    iconColor: 'text-accent-amber-500 dark:text-accent-amber-400',
  },
  error: {
    bg: 'bg-accent-rose-50 dark:bg-accent-rose-950/40',
    border: 'border-accent-rose-200 dark:border-accent-rose-800',
    icon: <IconAlertCircle className="w-5 h-5" />,
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
        'flex items-start gap-3 p-4 rounded-xl border animate-fade-in',
        config.bg,
        config.border,
        className,
      ].join(' ')}
      role="alert"
    >
      <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </p>
        )}
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {children}
        </p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
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
          className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          aria-label="Dismiss"
        >
          <IconX className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        </button>
      )}
    </div>
  );
};

export default Banner;