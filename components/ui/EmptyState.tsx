'use client';

import React from 'react';
import { IconPackage, IconPlus, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  illustration?: React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: 'compact' | 'centered' | 'featured';
}

export default function EmptyState({
  title = 'Belum ada data',
  description = 'Data akan muncul di sini setelah Anda menambahkan data.',
  illustration,
  action,
  secondaryAction,
  size = 'centered',
}: EmptyStateProps) {
  const sizeClasses = {
    compact: 'py-8',
    centered: 'py-16',
    featured: 'py-24',
  };

  const iconSize = {
    compact: 12,
    centered: 16,
    featured: 20,
  };

  return (
    <div
      className={`flex flex-col items-center justify-center ${sizeClasses[size]} px-4 text-center`}
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          <IconPackage
            className={`h-8 w-8 text-neutral-400 dark:text-neutral-500`}
            stroke={iconSize[size]}
          />
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>

      <p className="mb-6 max-w-sm text-neutral-500 dark:text-neutral-400">{description}</p>

      <div className="flex items-center gap-3">
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              className={`rounded-xl px-4 py-2.5 font-medium transition-all ${
                action.variant === 'secondary'
                  ? 'border-2 border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
                  : 'from-brand-500 to-brand-600 shadow-brand hover:shadow-brand-lg bg-gradient-to-r text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <IconPlus className="h-4 w-4" />
                {action.label}
              </span>
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className={`rounded-xl px-4 py-2.5 font-medium transition-all ${
                action.variant === 'secondary'
                  ? 'border-2 border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800'
                  : 'from-brand-500 to-brand-600 shadow-brand hover:shadow-brand-lg bg-gradient-to-r text-white'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <IconPlus className="h-4 w-4" />
                {action.label}
              </span>
            </button>
          ))}

        {secondaryAction &&
          (secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="rounded-xl border-2 border-neutral-200 px-4 py-2.5 font-medium transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="inline-flex items-center gap-2">
                <IconSearch className="h-4 w-4" />
                {secondaryAction.label}
              </span>
            </Link>
          ) : (
            <button
              onClick={secondaryAction.onClick}
              className="rounded-xl border-2 border-neutral-200 px-4 py-2.5 font-medium transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="inline-flex items-center gap-2">
                <IconSearch className="h-4 w-4" />
                {secondaryAction.label}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}
