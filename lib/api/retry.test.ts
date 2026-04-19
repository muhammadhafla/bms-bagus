import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, isAuthError } from './retry';

describe('retryWithBackoff', () => {
  it('should execute function once on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toBe('success');
  });

  it('should retry on failure then succeed', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 2) throw new Error('fail');
      return 'success';
    });

    const result = await retryWithBackoff(fn, 3, 10);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toBe('success');
  });

  it('should throw after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('isAuthError', () => {
  it('return true for session error in name', () => {
    const error = { name: 'session_expired', message: 'test' };
    expect(isAuthError(error)).toBe(true);
  });

  it('return true for token error in name', () => {
    const error = { name: 'token_error', message: 'test' };
    expect(isAuthError(error)).toBe(true);
  });

  it('return true for JWT error in name', () => {
    const error = { name: 'JWT_error', message: 'test' };
    expect(isAuthError(error)).toBe(true);
  });

  it('return true for Auth error in name', () => {
    const error = { name: 'Auth_failed', message: 'test' };
    expect(isAuthError(error)).toBe(true);
  });

  it('return true for session error in message', () => {
    const error = { name: 'error', message: 'session expired' };
    expect(isAuthError(error)).toBe(true);
  });

  it('return true for token error in message', () => {
    const error = { name: 'error', message: 'invalid token' };
    expect(isAuthError(error)).toBe(true);
  });

  it('return false for non-auth error', () => {
    const error = { name: 'not_found', message: 'resource not found' };
    expect(isAuthError(error)).toBe(false);
  });

  it('return false for null error', () => {
    expect(isAuthError(null)).toBe(false);
  });

  it('return false for undefined error', () => {
    expect(isAuthError(undefined)).toBe(false);
  });

  it('return false for empty error', () => {
    expect(isAuthError({})).toBe(false);
  });

  it('return false for non-error object', () => {
    expect(isAuthError({ name: 'test', message: 'test' })).toBe(false);
  });
});