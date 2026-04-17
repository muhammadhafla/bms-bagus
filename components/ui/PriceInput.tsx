'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [parseInput, formatNumber, min, max, onChange]);

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
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete', 'Insert'].includes(e.key)) {
      return;
    }
    // Cegah input karakter yang tidak valid
    if (!/[0-9.,]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }, [value, formatNumber]);

  // Handle paste - bersihkan otomatis
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numericValue = parseInput(pastedText);
    onChange(numericValue);
    setDisplayValue(formatNumber(numericValue));
  }, [parseInput, formatNumber, onChange]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">
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
          placeholder={placeholder}
          id={id}
          name={name}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white dark:focus:bg-neutral-900
            placeholder:text-neutral-400 dark:placeholder:text-neutral-500
            ${prefix ? 'pl-10' : ''}
            ${suffix ? 'pr-10' : ''}
            ${!isValid || error ? 'border-accent-rose-500 focus:ring-accent-rose-200 dark:focus:ring-accent-rose-900' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            text-right font-mono
            ${className}
          `}
          style={{ 
            MozAppearance: 'textfield',
            appearance: 'textfield'
          }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-accent-rose-600 dark:text-accent-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};

// CSS untuk menghilangkan spinner di semua browser
const globalStyles = `
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
`;

// Inject style jika di browser
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('price-input-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'price-input-styles';
    style.textContent = globalStyles;
    document.head.appendChild(style);
  }
}

export default PriceInput;
