'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  label?: string;
  error?: string;
}

/**
 * Komponen Input Harga dengan UX yang optimal untuk Rupiah
 *
 * Fitur:
 * - Formatting realtime dengan separator ribuan saat mengetik
 * - Mendukung input dengan titik, koma, atau angka mentah
 * - Validasi realtime dengan feedback visual
 * - Perilaku fokus dan seleksi yang natural
 * - Tanpa spinner default browser
 * - Shortcut keyboard: Enter untuk save, Escape untuk batalkan
 * - Auto select seluruh nilai saat fokus
 * - Menangani posisi kursor dengan benar saat formatting
 * - Prefix/suffix untuk mata uang
 */
export const PriceInput = ({
  value,
  onChange,
  onBlur,
  placeholder = '0',
  className = '',
  min = 0,
  max = 999999999,
  autoFocus = false,
  id,
  name,
  disabled = false,
  prefix = 'Rp',
  suffix,
  label,
  error,
}: PriceInputProps) => {
  const defaultId = useId();
  const inputId = id || defaultId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const lastCaretPosition = useRef<number>(0);

  // Format angka ke string dengan separator ribuan
  const formatNumber = useCallback((num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  }, []);

  // Parse string input menjadi angka bersih
  const parseInput = useCallback((input: string): number => {
    const cleaned = input.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }, []);

  // Inisialisasi nilai awal
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? formatNumber(value) : '');
    }
  }, [value, formatNumber, isFocused]);

  // Auto focus jika diperlukan
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [autoFocus]);

  // Handle perubahan input dengan menjaga posisi kursor
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const caretPos = e.target.selectionStart || 0;

      // Hitung jumlah digit sebelum posisi kursor
      const digitsBeforeCaret = input.slice(0, caretPos).replace(/[^0-9]/g, '').length;

      const numericValue = parseInput(input);

      // Validasi realtime
      const valid = numericValue >= min && numericValue <= max;
      setIsValid(valid);

      // Format ulang nilai
      const formatted = numericValue > 0 ? formatNumber(numericValue) : '';
      setDisplayValue(formatted);

      // Kembalikan nilai numerik ke parent
      if (valid) {
        onChange(numericValue);
      }

      // Perbaiki posisi kursor setelah formatting
      requestAnimationFrame(() => {
        if (inputRef.current) {
          let newCaretPos = 0;
          let digitCount = 0;

          for (let i = 0; i < formatted.length; i++) {
            if (/[0-9]/.test(formatted[i])) {
              digitCount++;
            }
            newCaretPos++;
            if (digitCount >= digitsBeforeCaret) {
              break;
            }
          }

          inputRef.current.setSelectionRange(newCaretPos, newCaretPos);
        }
      });
    },
    [parseInput, formatNumber, min, max, onChange],
  );

  // Handle fokus - select seluruh teks
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  }, []);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setDisplayValue(value > 0 ? formatNumber(value) : '');
    setIsValid(true);
    onBlur?.();
  }, [value, formatNumber, onBlur]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDisplayValue(value > 0 ? formatNumber(value) : '');
        inputRef.current?.blur();
      }
      if (e.key === 'Tab') {
        return;
      }
      // Allow navigation keys
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Home',
          'End',
          'Backspace',
          'Delete',
          'Insert',
        ].includes(e.key)
      ) {
        return;
      }
      // Cegah input karakter yang tidak valid
      if (!/[0-9.,]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    },
    [value, formatNumber],
  );

  // Handle paste - bersihkan otomatis
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData('text');
      const numericValue = parseInput(pastedText);
      onChange(numericValue);
      setDisplayValue(formatNumber(numericValue));
    },
    [parseInput, formatNumber, onChange],
  );

  const actualPlaceholder = placeholder || label || ' ';

  return (
    <div className="w-full space-y-1.5">
      <div className="group relative w-full">
        {prefix && (
          <span className="group-focus-within:text-brand-500 pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 text-sm font-medium text-neutral-500 transition-colors dark:text-neutral-400">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={actualPlaceholder}
          id={inputId}
          name={name}
          disabled={disabled}
          className={`peer w-full ${prefix ? 'pl-10' : 'pl-4'} ${suffix ? 'pr-10' : 'pr-4'} ${label ? 'pt-6 pb-2' : 'py-3'} rounded-xl border-2 transition-all outline-none ${
            !isValid || error
              ? 'border-accent-rose-400 focus:border-accent-rose-500 bg-accent-rose-50/30 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]'
              : 'focus:border-brand-500 border-neutral-200 bg-neutral-50 focus:bg-white focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-neutral-950'
          } text-neutral-900 dark:text-neutral-100 ${label ? 'placeholder-transparent' : 'placeholder:text-neutral-400 dark:placeholder:text-neutral-500'} ${disabled ? 'cursor-not-allowed opacity-50' : ''} text-right font-mono ${className}`}
          style={{
            MozAppearance: 'textfield',
            appearance: 'textfield',
          }}
        />
        {label && (
          <label
            htmlFor={inputId}
            className={`absolute ${prefix ? 'left-10' : 'left-4'} peer-focus:text-brand-500 pointer-events-none top-2 max-w-[calc(100%-4rem)] truncate text-[11px] font-semibold tracking-wide text-neutral-500 uppercase transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold dark:text-neutral-400`}
          >
            {label}
          </label>
        )}
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-4 z-10 -translate-y-1/2 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-accent-rose-600 dark:text-accent-rose-400 animate-fade-in-up pl-1 text-sm">
          {error}
        </p>
      )}
    </div>
  );
};

export default PriceInput;
