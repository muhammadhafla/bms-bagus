'use client';

import React, { forwardRef, useId } from 'react';
import { IconCheck } from '@tabler/icons-react';

export interface CheckboxInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  labelClassName?: string;
}

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(
  (
    { checked, onChange, label, disabled = false, id, className = '', labelClassName = '' },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const handleClick = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <label
        htmlFor={inputId}
        className={[
          'flex cursor-pointer items-center gap-3',
          disabled ? 'cursor-not-allowed opacity-50' : '',
          labelClassName,
        ].join(' ')}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only"
          />
          <div
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="checkbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            className={[
              'flex h-5 w-5 items-center justify-center rounded border-2 transition-all duration-200',
              checked
                ? 'bg-brand-500 border-brand-500 dark:bg-brand-600 dark:border-brand-600'
                : 'hover:border-brand-400 dark:hover:border-brand-500 border-neutral-300 bg-transparent dark:border-neutral-600',
              className,
            ].join(' ')}
          >
            {checked && <IconCheck className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
          </div>
        </div>
        {label && (
          <span className="font-medium text-neutral-700 select-none dark:text-neutral-300">
            {label}
          </span>
        )}
      </label>
    );
  },
);

CheckboxInput.displayName = 'CheckboxInput';

export default CheckboxInput;
