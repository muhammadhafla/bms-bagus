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
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} px-4 text-center`}>
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <IconPackage className={`w-8 h-8 text-neutral-400 dark:text-neutral-500`} stroke={iconSize[size]} />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
        {description}
      </p>
      
      <div className="flex items-center gap-3">
        {action && (
          action.href ? (
            <Link
              href={action.href}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                action.variant === 'secondary'
                  ? 'border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand hover:shadow-brand-lg'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <IconPlus className="w-4 h-4" />
                {action.label}
              </span>
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                action.variant === 'secondary'
                  ? 'border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand hover:shadow-brand-lg'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <IconPlus className="w-4 h-4" />
                {action.label}
              </span>
            </button>
          )
        )}
        
        {secondaryAction && (
          secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="px-4 py-2.5 rounded-xl font-medium border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
            >
              <span className="inline-flex items-center gap-2">
                <IconSearch className="w-4 h-4" />
                {secondaryAction.label}
              </span>
            </Link>
          ) : (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 rounded-xl font-medium border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
            >
              <span className="inline-flex items-center gap-2">
                <IconSearch className="w-4 h-4" />
                {secondaryAction.label}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  );
}