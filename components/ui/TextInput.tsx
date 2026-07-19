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

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({
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
}, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  // We need a placeholder for the floating label trick to work via peer-placeholder-shown.
  // If a label is provided but no placeholder, use a space or the label itself.
  const actualPlaceholder = placeholder || label || ' ';

  return (
    <div className="space-y-1.5 w-full">
      <div className="relative group w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={`peer w-full ${icon ? 'pl-12' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} ${label ? 'pt-6 pb-2' : 'py-3'} rounded-xl border-2 outline-none transition-all ${
            error 
              ? 'border-accent-rose-400 focus:border-accent-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)] bg-accent-rose-50/30' 
              : 'border-neutral-200 dark:border-neutral-800 focus:border-brand-500 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950'
          } text-neutral-900 dark:text-neutral-100 ${label ? 'placeholder-transparent' : 'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
          placeholder={actualPlaceholder}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {label && (
          <label 
            htmlFor={inputId} 
            className={`absolute ${icon ? 'left-12' : 'left-4'} top-2 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-brand-500 pointer-events-none uppercase tracking-wide truncate max-w-[calc(100%-3rem)]`}
          >
            {label}
            {required && <span className="text-accent-rose-500 ml-1">*</span>}
          </label>
        )}

        {rightElement && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center z-10">
            {rightElement}
          </div>
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

TextInput.displayName = 'TextInput';

export default TextInput;