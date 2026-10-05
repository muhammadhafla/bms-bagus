'use client';

import { useEffect, useRef } from 'react';

interface UseHardwareBarcodeScannerOptions {
  onScan: (scannedCode: string) => void;
  enabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number;
}

/**
 * Hook to listen for hardware barcode scanner (USB / Bluetooth keyboard wedge).
 * Hardware scanners type characters very quickly (< 50ms per key) and send an Enter key.
 */
export function useHardwareBarcodeScanner({
  onScan,
  enabled = true,
  minChars = 3,
  maxIntervalMs = 60,
}: UseHardwareBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional keys except Enter
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key marks end of barcode sequence
      if (e.key === 'Enter') {
        const candidate = bufferRef.current.trim();
        bufferRef.current = '';

        if (candidate.length >= minChars) {
          // Check debounce (prevent duplicate scan within 1500ms)
          if (
            candidate === lastScannedCodeRef.current &&
            now - lastScannedTimeRef.current < 1500
          ) {
            return;
          }

          lastScannedCodeRef.current = candidate;
          lastScannedTimeRef.current = now;

          // If target is inside an input, prevent form submission
          e.preventDefault();
          onScan(candidate);
        }
        return;
      }

      // Check if keystroke is a single printable character
      if (e.key.length === 1) {
        // If elapsed time between keystrokes is too long, reset buffer (it was human typing)
        if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }

        // Do not buffer if user is actively typing in a standard text/number input, UNLESS it's very fast
        const target = e.target as HTMLElement | null;
        const isInputField =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable);

        // If in input field and keystroke is slow (> 80ms), do not hijack
        if (isInputField && timeDiff > 80 && bufferRef.current.length === 0) {
          return;
        }

        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minChars, maxIntervalMs, onScan]);
}
