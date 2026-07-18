'use client';

import React from 'react';
import { IconChevronUp, IconChevronDown, IconSortAscending, IconSortDescending } from '@tabler/icons-react';

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
      <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {/* Skeleton header */}
        <div className="h-12 border-b border-neutral-200 dark:border-neutral-800 px-4 flex items-center gap-4">
          {[40, 25, 20, 15].map((w, i) => (
            <div key={i} className={`h-3 rounded-full skeleton-shimmer`} style={{ width: `${w}%` }} />
          ))}
        </div>
        {/* Skeleton rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 border-b border-neutral-100 dark:border-neutral-800 px-4 flex items-center gap-4">
            <div className="h-3 rounded-full skeleton-shimmer" style={{ width: `${30 + (i * 7) % 40}%` }} />
            <div className="h-3 rounded-full skeleton-shimmer" style={{ width: `${15 + (i * 11) % 25}%` }} />
            <div className="h-3 rounded-full skeleton-shimmer ml-auto" style={{ width: '12%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {emptyState}
      </div>
    );
  }

  return (
    <div className={`flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ${className}`}>
      {/* Mobile View */}
      {mobileRender && data.length > 0 && (
        <div role="list" className="block lg:hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {data.map((item) => (
            <div 
              key={String(item[keyField])}
              role={onRowClick ? "button" : "listitem"}
              tabIndex={onRowClick ? 0 : undefined}
              className={`${onRowClick ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800 focus:ring-2 focus:ring-inset focus:ring-brand-500 rounded-xl' : ''}`}
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
      <div className={`overflow-x-auto rounded-xl ${mobileRender && data.length > 0 ? 'hidden lg:block' : ''}`}>
        <table className="w-full min-w-[600px]">
        <thead className="bg-neutral-50 dark:bg-neutral-950 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-semibold text-neutral-600 dark:text-neutral-400"
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
                    className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDirection === 'asc' ? (
                        <IconChevronUp className="w-4 h-4" />
                      ) : (
                        <IconChevronDown className="w-4 h-4" />
                      )
                    ) : (
                      <IconSortAscending className="w-4 h-4 opacity-30" />
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
                  ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800 focus:ring-2 focus:ring-inset focus:ring-brand-500' 
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
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
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