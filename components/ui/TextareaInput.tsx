'use client';

import React, { forwardRef, useId } from 'react';

export interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(({
  label,
  error,
  helperText,
  inputSize = 'md',
  className = '',
  id,
  required,
  placeholder,
  rows = 3,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  // We need a placeholder for the floating label trick to work via peer-placeholder-shown.
  const actualPlaceholder = placeholder || label || ' ';

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative group w-full">
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`peer w-full pl-4 pr-4 ${label ? 'pt-6 pb-2' : 'py-3'} rounded-xl border-2 outline-none transition-all ${
            error 
              ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)] bg-accent-rose-50/30' 
              : 'border-neutral-200 dark:border-neutral-800 focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950'
          } text-neutral-900 dark:text-neutral-100 ${label ? 'placeholder-transparent' : 'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} resize-none ${className}`}
          placeholder={actualPlaceholder}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {label && (
          <label 
            htmlFor={inputId} 
            className="absolute left-4 top-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-brand-500 pointer-events-none uppercase tracking-wide truncate max-w-[calc(100%-2rem)]"
          >
            {label}
            {required && <span className="text-accent-rose-500 ml-1">*</span>}
          </label>
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

TextareaInput.displayName = 'TextareaInput';

export default TextareaInput;