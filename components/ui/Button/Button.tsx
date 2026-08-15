'use client';

import React from 'react';
import { IconLoader2 } from '@tabler/icons-react';

import { useHaptic } from '@/hooks/useHaptic';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-accent-orange-500 to-accent-orange-600 text-white shadow-orange hover:shadow-orange-lg hover:from-accent-orange-600 hover:to-accent-orange-700',
  secondary:
    'bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800',
  ghost:
    'bg-transparent text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800',
  danger: 'bg-accent-rose-500 text-white hover:bg-accent-rose-600 shadow-rose',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      className = '',
      onClick,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const haptic = useHaptic();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;

      // Berikan efek haptic berdasarkan varian tombol
      if (variant === 'danger') {
        haptic.heavy();
      } else if (variant === 'primary') {
        haptic.medium();
      } else {
        haptic.light();
      }

      if (onClick) {
        onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        className={[
          'btn-press focus-visible:ring-brand-500 inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'cursor-not-allowed opacity-50',
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? <IconLoader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
