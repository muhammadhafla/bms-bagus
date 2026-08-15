'use client';

import React, { forwardRef, useId } from 'react';
import {
  INPUT_STYLES,
  INPUT_SIZE,
  FORM_ERROR_STYLES,
  LABEL_STYLES,
} from '@/lib/constants/inputStyles';
import { IconChevronDown } from '@tabler/icons-react';

export interface SelectOption {
  value: string;
  label: string;
}

type InputSize = 'sm' | 'md' | 'lg';

export interface SelectInputProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'onChange' | 'value'
> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  inputSize?: InputSize;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      value,
      onChange,
      options,
      label,
      error,
      helperText,
      placeholder = 'Pilih...',
      inputSize = 'md', // Kept for interface compatibility
      className = '',
      id,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        <div className="group relative w-full">
          <select
            ref={ref}
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`peer w-full pr-10 pl-4 ${label ? 'pt-6 pb-2' : 'py-3'} cursor-pointer appearance-none rounded-xl border-2 text-ellipsis transition-all outline-none ${
              error
                ? 'border-accent-rose-400 focus:border-accent-rose-500 bg-accent-rose-50/30 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]'
                : 'focus:border-brand-500 border-neutral-200 bg-neutral-50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-neutral-950'
            } text-neutral-900 dark:text-neutral-100 ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            required={required}
            {...props}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {label && (
            <label
              htmlFor={inputId}
              className={`absolute top-2 left-4 text-[11px] font-semibold text-neutral-500 transition-all dark:text-neutral-400 ${!value ? 'top-1/2 -translate-y-1/2 text-base font-normal' : 'top-2 -translate-y-0 text-[11px] font-semibold'} peer-focus:text-brand-500 pointer-events-none max-w-[calc(100%-3rem)] truncate tracking-wide uppercase peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold`}
            >
              {label}
              {required && <span className="text-accent-rose-500 ml-1">*</span>}
            </label>
          )}

          <IconChevronDown className="group-focus-within:text-brand-500 pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-neutral-400 transition-colors" />
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

SelectInput.displayName = 'SelectInput';

export default SelectInput;
