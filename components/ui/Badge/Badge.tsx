'use client';

import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dot?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300',
  success: 'bg-accent-teal-100 dark:bg-accent-teal-950/40 text-accent-teal-700 dark:text-accent-teal-300',
  warning: 'bg-accent-amber-100 dark:bg-accent-amber-950/40 text-accent-amber-700 dark:text-accent-amber-300',
  danger: 'bg-accent-rose-100 dark:bg-accent-rose-950/40 text-accent-rose-700 dark:text-accent-rose-300',
  info: 'bg-accent-indigo-100 dark:bg-accent-indigo-950/40 text-accent-indigo-700 dark:text-accent-indigo-300',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-500',
  success: 'bg-accent-teal-500',
  warning: 'bg-amber-500',
  danger: 'bg-accent-rose-500',
  info: 'bg-accent-indigo-500',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      {...props}
    >
      {dot && (
        <span className={`w-2 h-2 rounded-full ${dotStyles[variant]} animate-pulse`} />
      )}
      {icon}
      {children}
    </span>
  );
};

export default Badge;