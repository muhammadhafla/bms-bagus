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
export const parsePrice = (input: string | number): number => {
  if (typeof input === 'number') return Math.max(0, input);
  
  // Handle Indonesian format: 1.500.000,50 or 1,500,000.50
  let normalized = input.replace(/\s/g, '');
  
  // Find decimal separator (last non-digit character)
  const lastNonDigit = normalized.match(/[^\d](?=\d*$)/);
  
  if (lastNonDigit) {
    const decimalPos = normalized.lastIndexOf(lastNonDigit[0]);
    const integerPart = normalized.slice(0, decimalPos).replace(/[^\d]/g, '');
    const decimalPart = normalized.slice(decimalPos + 1).replace(/[^\d]/g, '');
    normalized = `${integerPart}.${decimalPart}`;
  } else {
    normalized = normalized.replace(/[^\d]/g, '');
  }
  
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
};

/**
 * Debounce function for input handling
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
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
  return input.trim().replace(/[\n\r\t]/g, '').toUpperCase();
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
  onSubmit: (barcode: string) => void
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
  delay: number
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
          matrix[i - 1][j] + 1
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
  
  return Math.round(((maxLength - distance) / maxLength) * 100);
};

/**
 * Generate auto barcode with format AUTO-XXXXXX
 */
export const generateAutoBarcode = (): string => {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `AUTO-${random}`;
};
