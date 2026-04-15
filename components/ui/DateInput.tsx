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
  inputSize = 'md',
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
    <div>
      {label && (
        <label htmlFor={inputId} className={LABEL_STYLES.base}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          type="date"
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          className={[
            INPUT_STYLES.base,
            INPUT_SIZE[inputSize],
            error ? FORM_ERROR_STYLES.input : INPUT_STYLES.focus,
            showClearButton && value ? 'pr-10' : '',
            props.disabled && INPUT_STYLES.disabled,
            className,
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          required={required}
          {...props}
        />
        {showClearButton && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Clear date"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className={FORM_ERROR_STYLES.container}>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

DateInput.displayName = 'DateInput';

export default DateInput;