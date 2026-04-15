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
    // Cegah input karakter yang tidak valid
    if (!/[0-9.,\b\t\n\x7F\x03\x16\x18]/.test(e.key) && !e.ctrlKey && !e.metaKey) {
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
        text-right font-mono
        ${!isValid ? 'border-red-500 bg-red-50 dark:bg-red-950' : ''}
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
      style={{ 
        MozAppearance: 'textfield',
        appearance: 'textfield'
      }}
    />
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
