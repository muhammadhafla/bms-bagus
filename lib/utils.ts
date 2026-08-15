/**
 * Format number to Indonesian Rupiah currency
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with thousand separators only (without Rp prefix)
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

/**
 * Parse price input string to clean number
 * Handles Indonesian format: dot as thousand separator, comma as decimal
 */
export function parsePrice(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : Math.max(0, input);
  if (!input || (typeof input === 'string' && input.trim() === '')) return 0;

  // Hapus simbol mata uang dan spasi
  let normalized = input
    .toString()
    .replace(/[Rp\s]/gi, '')
    .trim();

  // Format Indonesia: titik = ribuan separator, koma = desimal
  // Contoh: "1.500.000" → 1500000 | "1.500,50" → 1500.50
  if (normalized.includes(',')) {
    // Ada koma → koma adalah desimal, titik adalah ribuan
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    // Hanya titik dengan pola ribuan (misal: 1.500, 1.500.000)
    normalized = normalized.replace(/\./g, '');
  }
  // else: angka biasa tanpa separator (atau titik tunggal = desimal Inggris)

  const result = parseFloat(normalized);
  return isNaN(result) ? 0 : Math.max(0, result);
}

/**
 * Debounce function for input handling
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeout: NodeJS.Timeout;
  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debouncedFn.cancel = () => clearTimeout(timeout);
  return debouncedFn;
};

/**
 * Normalize barcode input - trim whitespace, newlines, and convert to uppercase
 */
export const normalizeBarcode = (input: string): string => {
  return input
    .trim()
    .replace(/[\n\r\t]/g, '')
    .toUpperCase();
};

/**
 * Generate UUID v4 idempotency key
 */
export const generateIdempotencyKey = (): string => {
  return crypto.randomUUID();
};

/**
 * Handle barcode scanner input - automatically submits on enter
 */
export const handleBarcodeInput = (
  e: React.KeyboardEvent<HTMLInputElement>,
  onSubmit: (barcode: string) => void,
): void => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const barcode = normalizeBarcode(e.currentTarget.value);
    if (barcode) {
      onSubmit(barcode);
      e.currentTarget.value = '';
    }
  }
};

/**
 * Create debounced handler that tracks if operation is in progress
 */
export const createDebouncedHandler = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  const handler = (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, delay - timeSinceLastCall);
    }
  };

  handler.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return handler;
};

/**
 * Levenshtein distance algorithm to calculate string similarity
 * Returns number of edits needed to turn a into b
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calculate similarity percentage between two strings (0-100)
 */
export const stringSimilarity = (a: string, b: string): number => {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 100;

  const distance = levenshteinDistance(aLower, bLower);
  const maxLength = Math.max(aLower.length, bLower.length);
  if (maxLength === 0) return 100;

  return Math.round(((maxLength - distance) / maxLength) * 100);
};

/**
 * Generate auto barcode with format AUTO-XXXXXX
 */
export const generateAutoBarcode = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AUTO-${timestamp}-${random}`;
};

/**
 * Safely parse a date string from Supabase (which might lack 'Z') as UTC
 * and return a Date object.
 */
export const parseUTCDate = (dateString: string | Date | null | undefined): Date => {
  if (!dateString) return new Date();
  if (dateString instanceof Date) return dateString;

  // If the date string doesn't end with Z and doesn't contain a timezone offset, append Z
  if (
    typeof dateString === 'string' &&
    !dateString.endsWith('Z') &&
    !dateString.match(/[+-]\d{2}:\d{2}$/)
  ) {
    // Check if it's just a YYYY-MM-DD date without time, in that case we might not want to append Z
    // but for timestamps like 2026-07-02T02:57:36.465398 it's needed
    if (dateString.includes('T')) {
      return new Date(dateString + 'Z');
    }
  }
  return new Date(dateString);
};

/**
 * Format a date to UTC+7 (Asia/Jakarta) locale string
 */
export const formatDateWIB = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!date) return '-';
  const d = parseUTCDate(date);
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options,
  });
};

/**
 * Format a time to UTC+7 (Asia/Jakarta) locale string
 */
export const formatTimeWIB = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!date) return '-';
  const d = parseUTCDate(date);
  return d.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options,
  });
};

/**
 * Format a date and time to UTC+7 (Asia/Jakarta) locale string
 */
export const formatDateTimeWIB = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!date) return '-';
  const d = parseUTCDate(date);
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options,
  });
};

/**
 * Format a date for input type="date" (YYYY-MM-DD) in UTC+7
 */
export const formatDateForInputWIB = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = parseUTCDate(date);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
};

/**
 * Export data array to CSV file and trigger download
 */
export const exportToCSV = (data: (string | number)[][], headers: string[], filename: string) => {
  const arrayToCsv = (h: string[], rows: (string | number)[][]) => {
    return [
      h.join(','),
      ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
  };

  const csvData = arrayToCsv(headers, data);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
