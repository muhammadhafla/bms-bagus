'use client';

import React, { forwardRef, useId } from 'react';
import { INPUT_STYLES, INPUT_SIZE, FORM_ERROR_STYLES, LABEL_STYLES } from '@/lib/constants/inputStyles';

type InputSize = 'sm' | 'md' | 'lg';

export interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: InputSize;
}

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(({
  label,
  error,
  helperText,
  inputSize = 'md',
  className = '',
  id,
  required,
  rows = 3,
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={[
          INPUT_STYLES.base,
          INPUT_SIZE[inputSize],
          error ? FORM_ERROR_STYLES.input : INPUT_STYLES.focus,
          INPUT_STYLES.placeholder,
          props.disabled && INPUT_STYLES.disabled,
          'resize-none',
          className,
        ].join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        required={required}
        {...props}
      />
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

TextareaInput.displayName = 'TextareaInput';

export default TextareaInput;