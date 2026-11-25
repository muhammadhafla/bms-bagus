import { describe, it, expect, vi, afterEach } from 'vitest';
import { getLocalDateString, generateIdempotencyKey } from '../utils';

describe('WIB Date & Idempotency Utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLocalDateString', () => {
    it('formats a Date according to Asia/Jakarta (UTC+7) rather than UTC date', () => {
      // 17:30 UTC on Nov 24 is 00:30 WIB on Nov 25
      const lateNightUtc = new Date('2026-11-24T17:30:00.000Z');
      expect(getLocalDateString(lateNightUtc)).toBe('2026-11-25');

      // 00:15 UTC on Nov 24 is 07:15 WIB on Nov 24
      const morningWib = new Date('2026-11-24T00:15:00.000Z');
      expect(getLocalDateString(morningWib)).toBe('2026-11-24');
    });

    it('always matches YYYY-MM-DD format', () => {
      expect(getLocalDateString(new Date('2026-01-05T16:59:59.000Z'))).toBe('2026-01-05');
      expect(getLocalDateString(new Date('2026-01-05T17:00:00.000Z'))).toBe('2026-01-06');
    });
  });

  describe('generateIdempotencyKey', () => {
    it('returns unique non-empty UUID-like strings', () => {
      const k1 = generateIdempotencyKey();
      const k2 = generateIdempotencyKey();
      expect(k1).toBeTruthy();
      expect(k2).toBeTruthy();
      expect(k1).not.toBe(k2);
      expect(k1).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('falls back cleanly when crypto.randomUUID is unavailable', () => {
      const originalCrypto = globalThis.crypto;
      vi.stubGlobal('crypto', {
        getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
      });

      const key = generateIdempotencyKey();
      expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      vi.unstubAllGlobals();
    });
  });
});
