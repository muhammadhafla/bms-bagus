import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  parsePrice,
  debounce,
  normalizeBarcode,
  generateIdempotencyKey,
  handleBarcodeInput,
  createDebouncedHandler,
  levenshteinDistance,
  stringSimilarity,
  generateAutoBarcode,
} from './utils';

describe('formatCurrency', () => {
  it('should format number as Indonesian Rupiah', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.000.000');
    expect(result).toContain('Rp');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('Rp');
  });

  it('should format large numbers with thousand separators', () => {
    const result = formatCurrency(10000000);
    expect(result).toContain('10.000.000');
    expect(result).toContain('Rp');
  });
});

describe('formatNumber', () => {
  it('format number with thousand separators', () => {
    expect(formatNumber(1000000)).toBe('1.000.000');
  });

  it('format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('parsePrice', () => {
  it('parse number input directly', () => {
    expect(parsePrice(1000000)).toBe(1000000);
  });

  it('parse string without formatting', () => {
    expect(parsePrice('1000000')).toBe(1000000);
  });

  it('parse Indonesian format with dot separators (dots as thousand sep)', () => {
    expect(parsePrice('1.500.000')).toBe(1500);
  });

  it('parse Indonesian format with comma decimal', () => {
    const result = parsePrice('1.500.000,50');
    expect(result).toBeGreaterThan(1500000);
    expect(result).toBeLessThan(1500001);
  });

  it('parse US format with comma separators', () => {
    expect(parsePrice('1,500,000.50')).toBe(1500000.5);
  });

  it('return 0 for invalid input', () => {
    expect(parsePrice('abc')).toBe(0);
  });

  it('return 0 for empty string', () => {
    expect(parsePrice('')).toBe(0);
  });

  it('handle negative numbers as 0', () => {
    expect(parsePrice(-100)).toBe(0);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel debounce', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should pass arguments to function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('normalizeBarcode', () => {
  it('should trim whitespace', () => {
    expect(normalizeBarcode('  ABC123  ')).toBe('ABC123');
  });

  it('should convert to uppercase', () => {
    expect(normalizeBarcode('abc123')).toBe('ABC123');
  });

  it('should remove newlines and tabs', () => {
    expect(normalizeBarcode('AB\nC\r\tD')).toBe('ABCD');
  });

  it('should handle empty string', () => {
    expect(normalizeBarcode('')).toBe('');
  });
});

describe('generateIdempotencyKey', () => {
  it('should generate valid UUID', () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique keys', () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();
    expect(key1).not.toBe(key2);
  });
});

describe('handleBarcodeInput', () => {
  it('should call onSubmit on Enter key', () => {
    const onSubmit = vi.fn();
    const mockEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
      currentTarget: { value: 'ABC123', style: {} },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    handleBarcodeInput(mockEvent, onSubmit);
    expect(onSubmit).toHaveBeenCalledWith('ABC123');
  });

  it('should not call onSubmit for other keys', () => {
    const onSubmit = vi.fn();
    const mockEvent = {
      key: 'a',
      preventDefault: vi.fn(),
      currentTarget: { value: 'ABC123' },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    handleBarcodeInput(mockEvent, onSubmit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should not call onSubmit for empty barcode', () => {
    const onSubmit = vi.fn();
    const mockEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
      currentTarget: { value: '   ', style: {} },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    handleBarcodeInput(mockEvent, onSubmit);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('createDebouncedHandler', () => {
  it('should create debounced handler with cancel', () => {
    const fn = vi.fn();
    const handler = createDebouncedHandler(fn, 100);

    expect(typeof handler).toBe('function');
    expect(typeof handler.cancel).toBe('function');
  });
});

describe('levenshteinDistance', () => {
  it('return 0 for identical strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('return 1 for single character difference', () => {
    expect(levenshteinDistance('abc', 'abd')).toBe(1);
  });

  it('return length for completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });

  it('handle empty strings', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });
});

describe('stringSimilarity', () => {
  it('return 100 for identical strings', () => {
    expect(stringSimilarity('hello', 'hello')).toBe(100);
  });

  it('return 100 for same string different case', () => {
    expect(stringSimilarity('Hello', 'HELLO')).toBe(100);
  });

  it('return percentage for similar strings', () => {
    const similarity = stringSimilarity('hello', 'hallo');
    expect(similarity).toBeGreaterThan(0);
    expect(similarity).toBeLessThan(100);
  });

  it('return 0 for completely different strings', () => {
    expect(stringSimilarity('abc', 'xyz')).toBe(0);
  });

  it('handle trimmed strings', () => {
    expect(stringSimilarity(' hello ', 'hello')).toBe(100);
  });
});

describe('generateAutoBarcode', () => {
  it('should generate barcode with AUTO- prefix', () => {
    const barcode = generateAutoBarcode();
    expect(barcode).toMatch(/^AUTO-\d{6}$/);
  });

  it('should generate valid 6-digit number', () => {
    const barcode = generateAutoBarcode();
    const numPart = parseInt(barcode.split('-')[1], 10);
    expect(numPart).toBeGreaterThanOrEqual(100000);
    expect(numPart).toBeLessThanOrEqual(999999);
  });
});