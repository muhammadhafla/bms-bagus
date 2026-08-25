'use client';

import React, { forwardRef, useId } from 'react';
import { IconX, IconCalendarEvent } from '@tabler/icons-react';

type InputSize = 'sm' | 'md' | 'lg';

export interface MonthInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange' | 'size'
> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: InputSize;
  showClearButton?: boolean;
}

export const MonthInput = forwardRef<HTMLInputElement, MonthInputProps>(
  (
    {
      value,
      onChange,
      label,
      error,
      helperText,
      inputSize = 'md',
      showClearButton = false,
      className = '',
      id,
      required,
      min,
      max,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const handleClear = () => {
      onChange('');
    };

    return (
      <div className="w-full space-y-1.5">
        <div className="group relative w-full">
          {/* Hidden native month input for interaction */}
          <input
            ref={ref}
            type="month"
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            max={max}
            className={`peer absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${props.disabled ? 'cursor-not-allowed' : ''}`}
            required={required}
            disabled={props.disabled}
            onClick={(e) => {
              try {
                if ('showPicker' in HTMLInputElement.prototype) {
                  e.currentTarget.showPicker();
                }
              } catch (err) {}
            }}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {/* Visible custom input mimicking the text field */}
          <div
            className={`flex w-full items-center pl-4 ${showClearButton && value ? 'pr-10' : 'pr-4'} ${label ? 'pt-6 pb-2' : 'py-3'} rounded-xl border-2 transition-all ${
              error
                ? 'border-accent-rose-400 peer-focus:border-accent-rose-500 bg-accent-rose-50/30 peer-focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]'
                : 'peer-focus:border-brand-500 border-neutral-200 bg-neutral-50 peer-focus:bg-white peer-focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-neutral-800 dark:bg-neutral-900 dark:peer-focus:bg-neutral-950'
            } ${props.disabled ? 'opacity-50' : ''} ${className}`}
          >
            <span
              className={`block truncate ${!value && !label ? 'text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'} min-h-[1.5rem]`}
            >
              {value
                ? (() => {
                    const parts = value.split('-');
                    if (parts.length === 2) {
                      // Formatting e.g. "2026-08" to "Agustus 2026"
                      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    }
                    return value;
                  })()
                : !label
                  ? 'Bulan & Tahun'
                  : ''}
            </span>
            <IconCalendarEvent className="ml-auto h-5 w-5 flex-shrink-0 text-neutral-400" />
          </div>

          {label && (
            <label
              htmlFor={inputId}
              className={`absolute top-2 left-4 z-10 text-[11px] font-semibold text-neutral-500 transition-all dark:text-neutral-400 ${!value ? 'top-1/2 -translate-y-1/2 text-base font-normal' : 'top-2 -translate-y-0 text-[11px] font-semibold'} peer-focus:text-brand-500 pointer-events-none max-w-[calc(100%-3rem)] truncate tracking-wide uppercase peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold`}
            >
              {label}
              {required && <span className="text-accent-rose-500 ml-1">*</span>}
            </label>
          )}

          {showClearButton && value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1/2 right-3 z-30 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              aria-label="Clear month"
            >
              <IconX className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            className="text-accent-rose-600 dark:text-accent-rose-400 animate-fade-in-up pl-1 text-sm"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="pl-1 text-sm text-neutral-500 dark:text-neutral-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

MonthInput.displayName = 'MonthInput';

export default MonthInput;
