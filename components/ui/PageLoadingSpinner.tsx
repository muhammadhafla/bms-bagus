'use client';

import React from 'react';
import AmbientLayout from './AmbientLayout';

export interface SpinnerProps {
  /** Ukuran spinner: xs (16px), sm (20px), md (32px), lg (40px), xl (48px) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-10 w-10 border-4',
    xl: 'h-12 w-12 border-4',
  };

  return (
    <div
      aria-hidden="true"
      className={`animate-spin rounded-full border-brand-100 border-t-brand-500 dark:border-neutral-800 dark:border-t-brand-400 motion-reduce:animate-none ${sizeClasses[size]} ${className}`}
    />
  );
}

export interface PageLoadingSpinnerProps {
  /** Pesan pemuatan. Set `false` untuk menyembunyikan teks */
  message?: React.ReactNode | false;
  /** Ukuran spinner lingkaran */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Gunakan adaptif full-height (default true, min-h-[60vh] flex-1) atau padding biasa (py-12) */
  fullPage?: boolean;
  /** Bungkus dengan AmbientLayout */
  withLayout?: boolean;
  className?: string;
}

export function PageLoadingSpinner({
  message = 'Memuat halaman...',
  size = 'lg',
  fullPage = true,
  withLayout = false,
  className = '',
}: PageLoadingSpinnerProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`animate-in fade-in duration-200 flex flex-col items-center justify-center gap-4 ${
        fullPage ? 'min-h-[60vh] flex-1' : 'py-12'
      } w-full text-center ${className}`}
    >
      <Spinner size={size} />

      {message !== false ? (
        <p className="animate-pulse text-sm font-medium text-neutral-500 transition-colors dark:text-neutral-400 motion-reduce:animate-none">
          {message}
        </p>
      ) : (
        <span className="sr-only">Sedang memuat...</span>
      )}
    </div>
  );

  if (withLayout) {
    return <AmbientLayout>{content}</AmbientLayout>;
  }

  return content;
}
