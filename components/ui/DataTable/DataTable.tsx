'use client';

import React from 'react';
import {
  IconChevronUp,
  IconChevronDown,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  mobileRender?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  sortKey,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  loading,
  emptyState,
  className = '',
  mobileRender,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Skeleton header */}
        <div className="flex h-12 items-center gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
          {[40, 25, 20, 15].map((w, i) => (
            <div
              key={i}
              className={`skeleton-shimmer h-3 rounded-full`}
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        {/* Skeleton rows */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex h-14 items-center gap-4 border-b border-neutral-100 px-4 dark:border-neutral-800"
          >
            <div
              className="skeleton-shimmer h-3 rounded-full"
              style={{ width: `${30 + ((i * 7) % 40)}%` }}
            />
            <div
              className="skeleton-shimmer h-3 rounded-full"
              style={{ width: `${15 + ((i * 11) % 25)}%` }}
            />
            <div className="skeleton-shimmer ml-auto h-3 rounded-full" style={{ width: '12%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {emptyState}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {/* Mobile View */}
      {mobileRender && data.length > 0 && (
        <div
          role="list"
          className="block divide-y divide-neutral-100 lg:hidden dark:divide-neutral-800"
        >
          {data.map((item) => (
            <div
              key={String(item[keyField])}
              role={onRowClick ? 'button' : 'listitem'}
              tabIndex={onRowClick ? 0 : undefined}
              className={`${onRowClick ? 'focus:ring-brand-500 cursor-pointer rounded-xl transition-colors hover:bg-neutral-50 focus:bg-neutral-50 focus:ring-2 focus:outline-none focus:ring-inset dark:hover:bg-neutral-800 dark:focus:bg-neutral-800' : ''}`}
              onClick={() => onRowClick?.(item)}
              onKeyDown={(e) => {
                if (!onRowClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(item);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
                }
              }}
            >
              {mobileRender(item)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop/Default View */}
      <div
        className={`overflow-x-auto rounded-xl ${mobileRender && data.length > 0 ? 'hidden lg:block' : ''}`}
      >
        <table className="w-full min-w-[600px]">
          <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-950">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-sm font-semibold text-neutral-600 dark:text-neutral-400 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  }`}
                  style={{ width: col.width }}
                  aria-sort={
                    col.sortable
                      ? sortKey === col.key
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      {col.header}
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? (
                          <IconChevronUp className="h-4 w-4" />
                        ) : (
                          <IconChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <IconSortAscending className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {data.map((item) => (
              <tr
                key={String(item[keyField])}
                tabIndex={onRowClick ? 0 : undefined}
                className={`transition-colors ${
                  onRowClick
                    ? 'focus:ring-brand-500 cursor-pointer hover:bg-neutral-50 focus:bg-neutral-50 focus:ring-2 focus:outline-none focus:ring-inset dark:hover:bg-neutral-800 dark:focus:bg-neutral-800'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (!onRowClick) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(item);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    (e.currentTarget.nextElementSibling as HTMLElement)?.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    (e.currentTarget.previousElementSibling as HTMLElement)?.focus();
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
