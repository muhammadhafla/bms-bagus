'use client';

import React, { forwardRef, useId } from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg'; // Kept for backwards compatibility
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      rightElement,
      inputSize = 'md', // Not strictly used in floating label, but kept for interface compatibility
      className = '',
      id,
      required,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    // We need a placeholder for the floating label trick to work via peer-placeholder-shown.
    // If a label is provided but no placeholder, use a space or the label itself.
    const actualPlaceholder = placeholder || label || ' ';

    return (
      <div className="w-full space-y-1.5">
        <div className="group relative w-full">
          {icon && (
            <div className="group-focus-within:text-brand-500 pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-neutral-400 transition-colors">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`peer w-full ${icon ? 'pl-12' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} ${label ? 'pt-6 pb-2' : 'py-3'} rounded-xl border-2 transition-all outline-none ${
              error
                ? 'border-accent-rose-400 focus:border-accent-rose-500 bg-accent-rose-50/30 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]'
                : 'focus:border-brand-500 border-neutral-200 bg-neutral-50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-neutral-950'
            } text-neutral-900 dark:text-neutral-100 ${label ? 'placeholder-transparent' : 'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'} ${props.disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
            placeholder={actualPlaceholder}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {label && (
            <label
              htmlFor={inputId}
              className={`absolute ${icon ? 'left-12' : 'left-4'} peer-focus:text-brand-500 pointer-events-none top-2 max-w-[calc(100%-3rem)] truncate text-[11px] font-semibold tracking-wide text-neutral-500 uppercase transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold dark:text-neutral-400`}
            >
              {label}
              {required && <span className="text-accent-rose-500 ml-1">*</span>}
            </label>
          )}

          {rightElement && (
            <div className="absolute top-1/2 right-0 z-10 flex -translate-y-1/2 items-center justify-center">
              {rightElement}
            </div>
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

TextInput.displayName = 'TextInput';

export default TextInput;
