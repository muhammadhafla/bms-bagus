'use client';

import React, { useState, useRef, useEffect } from 'react';
import { IconCalendar, IconX } from '@tabler/icons-react';
import DateInput from './DateInput';
import { Button } from './Button';

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    { label: 'Tahun Ini', getDates: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
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

  const displayValue = startDate && endDate 
    ? `${startDate} s.d ${endDate}` 
    : startDate ? `Mulai: ${startDate}` 
    : endDate ? `Sampai: ${endDate}` 
    : 'Semua Waktu';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
          <div className="fixed sm:absolute inset-x-0 bottom-0 sm:inset-auto sm:top-full sm:left-0 sm:mt-2 z-50 bg-white dark:bg-neutral-900 sm:rounded-xl rounded-t-2xl shadow-xl sm:shadow-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 w-full sm:w-[340px] animate-slide-up sm:animate-fade-in-up">
            <div className="flex items-center justify-between sm:hidden mb-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Pilih Periode</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <DateInput
                  value={startDate}
                  onChange={(v) => onChange(v, endDate)}
                  label="Dari"
                  inputSize="sm"
                />
                <DateInput
                  value={endDate}
                  onChange={(v) => onChange(startDate, v)}
                  label="Sampai"
                  inputSize="sm"
                />
              </div>

              <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full" />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Preset Cepat</span>
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
