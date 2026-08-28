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
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export function MonthPicker({
  value,
  onChange,
  label,
  className = '',
  disabled = false,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const focusTrapRef = useFocusTrap(isOpen);

  // Parse current value
  const initialDate = value ? parse(value, 'yyyy-MM', new Date()) : new Date();
  const initialYear = getYear(initialDate);

  const [viewYear, setViewYear] = useState(initialYear);

  // Sync view year when opening if value changed externally
  useEffect(() => {
    if (isOpen && value) {
      setViewYear(getYear(parse(value, 'yyyy-MM', new Date())));
    }
  }, [isOpen, value]);

  useEffect(() => {
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
  }, [isOpen]);

  const handleSelectMonth = (monthIndex: number) => {
    const yearStr = viewYear.toString();
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    onChange(`${yearStr}-${monthStr}`);
    setIsOpen(false);
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
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            >
              <IconChevronLeft size={20} />
            </button>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            >
              <IconChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((mName, i) => {
              const isSelected = value === `${viewYear}-${(i + 1).toString().padStart(2, '0')}`;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectMonth(i)}
                  className={`py-2 px-1 rounded-xl text-sm font-medium transition-colors
                    ${isSelected 
                      ? 'bg-brand-500 text-white shadow-sm' 
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
