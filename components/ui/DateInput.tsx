'use client';

import React, { forwardRef, useId } from 'react';
import { INPUT_STYLES, INPUT_SIZE, FORM_ERROR_STYLES, LABEL_STYLES } from '@/lib/constants/inputStyles';
import { IconX } from '@tabler/icons-react';

type InputSize = 'sm' | 'md' | 'lg';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: InputSize;
  showClearButton?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({
  value,
  onChange,
  label,
  error,
  helperText,
  inputSize = 'md', // Kept for compatibility
  showClearButton = false,
  className = '',
  id,
  required,
  min,
  max,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative group w-full">
        <input
          ref={ref}
          type="date"
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className={`peer w-full pl-4 ${showClearButton && value ? 'pr-10' : 'pr-4'} ${label ? 'pt-6 pb-2' : 'py-3'} rounded-xl border-2 outline-none transition-all ${
            error 
              ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)] bg-accent-rose-50/30' 
              : 'border-neutral-200 dark:border-neutral-800 focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950'
          } text-neutral-900 dark:text-neutral-100 ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          required={required}
          {...props}
        />
        
        {label && (
          <label 
            htmlFor={inputId} 
            className={`absolute left-4 top-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 transition-all ${!value ? 'top-1/2 -translate-y-1/2 text-base font-normal' : 'top-2 -translate-y-0 text-[11px] font-semibold'} peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-brand-500 pointer-events-none uppercase tracking-wide truncate max-w-[calc(100%-3rem)]`}
          >
            {label}
            {required && <span className="text-accent-rose-500 ml-1">*</span>}
          </label>
        )}

        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors z-10"
            aria-label="Clear date"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-accent-rose-600 dark:text-accent-rose-400 pl-1 animate-fade-in-up">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-sm text-neutral-500 dark:text-neutral-400 pl-1">
          {helperText}
        </p>
      )}
    </div>
  );
});

DateInput.displayName = 'DateInput';

export default DateInput;