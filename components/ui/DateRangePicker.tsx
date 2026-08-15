'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { IconCalendar, IconX } from '@tabler/icons-react';
import { Button } from './Button';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { id as idLocale } from 'date-fns/locale';

export interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
  label?: string;
  className?: string;
  variant?: 'default' | 'floating';
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label,
  className = '',
  variant = 'default',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const focusTrapRef = useFocusTrap(isOpen);

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

  const presets = [
    {
      label: 'Hari Ini',
      getDates: () => {
        const d = new Date().toISOString().split('T')[0];
        return [d, d];
      },
    },
    {
      label: '7 Hari Terakhir',
      getDates: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        const formatLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return [formatLocal(start), formatLocal(end)];
      },
    },
    {
      label: 'Bulan Ini',
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const formatLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return [formatLocal(start), formatLocal(end)];
      },
    },
    {
      label: 'Bulan Lalu',
      getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        const formatLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return [formatLocal(start), formatLocal(end)];
      },
    },
    { label: 'Semua Waktu', getDates: () => ['', ''] },
  ];

  const handlePresetClick = (preset: (typeof presets)[0]) => {
    const [s, e] = preset.getDates();
    onChange(s, e);
    setIsOpen(false);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];
      const currentYear = new Date().getFullYear();
      const yearStr = date.getFullYear() !== currentYear ? ` ${date.getFullYear()}` : '';
      return `${date.getDate()} ${months[date.getMonth()]}${yearStr}`;
    } catch {
      return dateStr;
    }
  };

  const displayValue =
    startDate && endDate
      ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
      : startDate
        ? `Mulai: ${formatShortDate(startDate)}`
        : endDate
          ? `Sampai: ${formatShortDate(endDate)}`
          : 'Semua Waktu';

  const isFloating = variant === 'floating';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && !isFloating && (
        <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        className={
          isFloating
            ? `peer flex w-full items-center gap-3 pr-4 pl-4 ${label ? 'pt-6 pb-2' : 'py-3'} focus:border-brand-500 rounded-xl border-2 border-neutral-200 bg-neutral-50 text-left transition-all outline-none focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-neutral-950`
            : `focus:ring-brand-500/50 flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:ring-2 focus:outline-none sm:w-auto dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800`
        }
      >
        <div
          className={`flex items-center gap-2 ${isFloating ? 'w-full text-neutral-900 dark:text-neutral-100' : ''}`}
        >
          <IconCalendar
            className={`h-5 w-5 flex-shrink-0 ${isFloating ? 'text-neutral-400' : 'h-4 w-4 text-neutral-500'}`}
          />
          <span className={isFloating ? 'block min-h-[1.5rem] truncate' : ''}>{displayValue}</span>
        </div>
      </button>

      {label && isFloating && (
        <label
          className={`pointer-events-none absolute top-2 left-4 z-10 max-w-[calc(100%-3rem)] truncate text-[11px] font-semibold tracking-wide text-neutral-500 uppercase transition-all dark:text-neutral-400`}
        >
          {label}
        </label>
      )}

      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div
            className="animate-fade-in fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover / Bottom Sheet */}
          <div
            ref={focusTrapRef}
            id={popoverId}
            role="dialog"
            aria-label={label || 'Pilih rentang tanggal'}
            className="animate-slide-up sm:animate-fade-in-up fixed inset-x-0 bottom-0 z-50 w-full rounded-t-2xl border border-neutral-200 bg-white p-4 shadow-xl sm:absolute sm:inset-auto sm:top-full sm:left-0 sm:mt-2 sm:w-[340px] sm:rounded-xl sm:p-5 sm:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pilih Periode</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Tutup dialog pilihan tanggal"
                className="rounded-full bg-neutral-100 p-1 text-neutral-500 hover:text-neutral-700 dark:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div
                className="flex justify-center overflow-x-auto"
                role="group"
                aria-label="Pilih rentang kalender"
              >
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                  .rdp-root {
                    --rdp-accent-color: #6366f1;
                    --rdp-accent-background-color: #eef2ff;
                    --rdp-day-height: 36px;
                    --rdp-day-width: 36px;
                    margin: 0;
                  }
                  .dark .rdp-root {
                    --rdp-accent-background-color: rgba(99, 102, 241, 0.2);
                    --rdp-background-color: #262626;
                  }
                  .rdp-root * {
                    color: inherit;
                  }
                `,
                  }}
                />
                <DayPicker
                  mode="range"
                  selected={{
                    from: startDate ? new Date(startDate) : undefined,
                    to: endDate ? new Date(endDate) : undefined,
                  }}
                  onSelect={(range) => {
                    const formatLocal = (d: Date | undefined) => {
                      if (!d) return '';
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    };
                    onChange(formatLocal(range?.from), formatLocal(range?.to));
                  }}
                  locale={idLocale}
                />
              </div>

              <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800" />

              <div
                className="flex flex-col gap-2"
                role="group"
                aria-labelledby={`${popoverId}-presets-label`}
              >
                <span
                  id={`${popoverId}-presets-label`}
                  className="text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400"
                >
                  Preset Cepat
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className="rounded-lg bg-neutral-100 px-3 py-2 text-center text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2 sm:hidden">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => setIsOpen(false)}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangePicker;
