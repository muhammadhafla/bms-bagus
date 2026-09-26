'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { IconCalendarEvent, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { parse, format, getYear } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'popover' | 'inline';
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const FULL_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function MonthPicker({
  value,
  onChange,
  label,
  className = '',
  disabled = false,
  variant = 'popover',
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const focusTrapRef = useFocusTrap(isOpen);

  // Parse current value
  const initialDate = value ? parse(value, 'yyyy-MM', new Date()) : new Date();
  const initialYear = getYear(initialDate);

  const [viewYear, setViewYear] = useState(initialYear);
  const lastParsedYearRef = useRef<number | null>(initialYear);

  // Sync view year if value changed externally
  useEffect(() => {
    if (value) {
      try {
        const y = getYear(parse(value, 'yyyy-MM', new Date()));
        if (lastParsedYearRef.current !== y) {
          lastParsedYearRef.current = y;
          setViewYear(y);
        }
      } catch {}
    }
  }, [value]);

  useEffect(() => {
    if (variant === 'inline') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, variant]);

  const handleSelectMonth = (monthIndex: number) => {
    const yearStr = viewYear.toString();
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    lastParsedYearRef.current = viewYear;
    onChange(`${yearStr}-${monthStr}`);
    if (variant === 'popover') {
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (!value) return 'Pilih Bulan';
    try {
      const d = parse(value, 'yyyy-MM', new Date());
      return format(d, 'MMMM yyyy', { locale: idLocale });
    } catch {
      return value;
    }
  };

  // Inline Variant (Embedded directly in dialogs, drawers, or pages)
  if (variant === 'inline') {
    return (
      <div
        className={`w-full rounded-2xl border border-neutral-200/90 bg-white p-3.5 sm:p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
        role="group"
        aria-label="Pilih Periode Bulan"
      >
        {/* Header with Year Selector */}
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Tahun Sebelumnya"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <IconChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center">
            <span className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-white tracking-tight">
              {viewYear}
            </span>
            {value && (
              <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 capitalize">
                {getDisplayValue()}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Tahun Berikutnya"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <IconChevronRight size={20} />
          </button>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTH_NAMES.map((mName, i) => {
            const monthCode = (i + 1).toString().padStart(2, '0');
            const isSelected = value === `${viewYear}-${monthCode}`;
            const now = new Date();
            const isCurrentMonthYear = getYear(now) === viewYear && now.getMonth() === i;

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectMonth(i)}
                aria-pressed={isSelected}
                aria-label={`${FULL_MONTH_NAMES[i]} ${viewYear}`}
                className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative flex flex-col items-center justify-center min-h-[44px]
                  focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none active:scale-[0.98]
                  ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-xs font-bold ring-2 ring-brand-500/30 dark:bg-brand-500'
                      : isCurrentMonthYear
                      ? 'border border-brand-400/60 bg-brand-50/50 text-brand-700 dark:border-brand-600/60 dark:bg-brand-950/30 dark:text-brand-300 hover:bg-brand-100/60'
                      : 'border border-neutral-200/80 bg-neutral-50/50 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }
                `}
              >
                <span>{mName}</span>
                {isCurrentMonthYear && !isSelected && (
                  <span className="text-[9px] font-normal opacity-75 leading-none mt-0.5">Kini</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Popover Variant (Dropdown Button)
  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? popoverId : undefined}
        className={`flex w-full items-center justify-between pl-4 pr-4 ${label ? 'pt-6 pb-2' : 'py-3'} min-h-[46px] rounded-xl border-2 transition-all text-left
          ${isOpen 
            ? 'border-brand-500 bg-white shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-brand-500 dark:bg-neutral-950' 
            : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/80'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`block truncate ${!value && !label ? 'text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
          {getDisplayValue()}
        </span>
        <IconCalendarEvent className={`h-5 w-5 flex-shrink-0 transition-colors ${isOpen ? 'text-brand-500' : 'text-neutral-400'}`} />
        
        {label && (
          <span className={`absolute left-4 z-10 transition-all pointer-events-none max-w-[calc(100%-3rem)] truncate uppercase tracking-wide
            ${!value && !isOpen ? 'top-1/2 -translate-y-1/2 text-base font-normal text-neutral-400' : 'top-2 -translate-y-0 text-[11px] font-semibold'}
            ${isOpen ? 'text-brand-500' : 'text-neutral-500 dark:text-neutral-400'}
          `}>
            {label}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Pilih Bulan"
          ref={focusTrapRef}
          className="absolute z-50 mt-2 w-full min-w-[280px] origin-top rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 sm:w-auto left-0"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              aria-label="Tahun Sebelumnya"
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              <IconChevronLeft size={20} />
            </button>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              aria-label="Tahun Berikutnya"
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              <IconChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((mName, i) => {
              const monthCode = (i + 1).toString().padStart(2, '0');
              const isSelected = value === `${viewYear}-${monthCode}`;
              const now = new Date();
              const isCurrentMonthYear = getYear(now) === viewYear && now.getMonth() === i;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectMonth(i)}
                  aria-pressed={isSelected}
                  aria-label={`${FULL_MONTH_NAMES[i]} ${viewYear}`}
                  className={`py-2 px-1 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none active:scale-[0.98]
                    ${isSelected 
                      ? 'bg-brand-600 text-white shadow-xs font-semibold' 
                      : isCurrentMonthYear
                      ? 'border border-brand-400/60 bg-brand-50/50 text-brand-700 dark:border-brand-600/60 dark:bg-brand-950/30 dark:text-brand-300 hover:bg-brand-100/60'
                      : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}
                  `}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
