'use client';

import React, { forwardRef, useId } from 'react';
import { INPUT_STYLES, INPUT_SIZE, FORM_ERROR_STYLES, LABEL_STYLES } from '@/lib/constants/inputStyles';
import { IconChevronDown } from '@tabler/icons-react';

export interface SelectOption {
  value: string;
  label: string;
}

type InputSize = 'sm' | 'md' | 'lg';

export interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  inputSize?: InputSize;
}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(({
  value,
  onChange,
  options,
  label,
  error,
  helperText,
  placeholder = 'Pilih...',
  inputSize = 'md',
  className = '',
  id,
  required,
  disabled,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className={LABEL_STYLES.base}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={[
            INPUT_STYLES.base,
            INPUT_SIZE[inputSize],
            error ? FORM_ERROR_STYLES.input : INPUT_STYLES.focus,
            disabled && INPUT_STYLES.disabled,
            'appearance-none cursor-pointer pr-10',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
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
        <IconChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
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

SelectInput.displayName = 'SelectInput';

export default SelectInput;