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
}

export function DateRangePicker({ startDate, endDate, onChange, label, className = '' }: DateRangePickerProps) {
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
    { label: 'Hari Ini', getDates: () => { const d = new Date().toISOString().split('T')[0]; return [d, d]; } },
    { label: '7 Hari Terakhir', getDates: () => { 
        const end = new Date(); 
        const start = new Date(); start.setDate(start.getDate() - 6); 
        const formatLocal = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return [formatLocal(start), formatLocal(end)]; 
    }},
    { label: 'Bulan Ini', getDates: () => {
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
    }},
    { label: 'Bulan Lalu', getDates: () => {
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
    }},
    { label: 'Semua Waktu', getDates: () => ['', ''] }
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    const [s, e] = preset.getDates();
    onChange(s, e);
    setIsOpen(false);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const currentYear = new Date().getFullYear();
      const yearStr = date.getFullYear() !== currentYear ? ` ${date.getFullYear()}` : '';
      return `${date.getDate()} ${months[date.getMonth()]}${yearStr}`;
    } catch {
      return dateStr;
    }
  };

  const displayValue = startDate && endDate 
    ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}` 
    : startDate ? `Mulai: ${formatShortDate(startDate)}` 
    : endDate ? `Sampai: ${formatShortDate(endDate)}` 
    : 'Semua Waktu';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        className="w-full sm:w-auto flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
      >
        <div className="flex items-center gap-2">
          <IconCalendar className="w-4 h-4 text-neutral-500" />
          <span>{displayValue}</span>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div className="fixed inset-0 bg-black/40 z-40 sm:hidden animate-fade-in" onClick={() => setIsOpen(false)} />
          
          {/* Popover / Bottom Sheet */}
          <div 
            ref={focusTrapRef}
            id={popoverId}
            role="dialog"
            aria-label={label || 'Pilih rentang tanggal'}
            className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:top-full sm:left-0 sm:mt-2 z-50 bg-white dark:bg-neutral-900 sm:rounded-xl rounded-t-2xl shadow-xl sm:shadow-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 w-full sm:w-[340px] animate-slide-up sm:animate-fade-in-up"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pilih Periode</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                aria-label="Tutup dialog pilihan tanggal"
                className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-center overflow-x-auto" role="group" aria-label="Pilih rentang kalender">
                <style dangerouslySetInnerHTML={{__html: `
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
                `}} />
                <DayPicker
                  mode="range"
                  selected={{
                    from: startDate ? new Date(startDate) : undefined,
                    to: endDate ? new Date(endDate) : undefined
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

              <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full" />

              <div className="flex flex-col gap-2" role="group" aria-labelledby={`${popoverId}-presets-label`}>
                <span id={`${popoverId}-presets-label`} className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Preset Cepat</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className="px-3 py-2 text-xs font-medium text-center text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-2 sm:hidden">
                <Button variant="primary" className="w-full justify-center" onClick={() => setIsOpen(false)}>
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
