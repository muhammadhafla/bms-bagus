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

export const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = '',
  labelClassName = '',
}, ref) => {
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
        'flex items-center gap-3 cursor-pointer',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
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
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200',
            checked
              ? 'bg-brand-500 border-brand-500 dark:bg-brand-600 dark:border-brand-600'
              : 'bg-transparent border-neutral-300 dark:border-neutral-600 hover:border-brand-400 dark:hover:border-brand-500',
            className,
          ].join(' ')}
        >
          {checked && (
            <IconCheck className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
      {label && (
        <span className="text-neutral-700 dark:text-neutral-300 font-medium select-none">
          {label}
        </span>
      )}
    </label>
  );
});

CheckboxInput.displayName = 'CheckboxInput';

export default CheckboxInput;