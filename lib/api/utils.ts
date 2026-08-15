import { retryWithBackoff, isAuthError } from './retry';

export interface ApiError {
  message: string;
  details?: string;
}

export function createError(message: string, details?: string): ApiError {
  return { message, details: details || message };
}

let refreshPromise: Promise<boolean> | null = null;
async function ensureSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  const { useAuthStore } = await import('@/lib/auth');
  refreshPromise = useAuthStore
    .getState()
    .refreshSession()
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function safeQuery<T>(
  operation: () => Promise<{ data: T | null; error: Error | null }>,
  options?: { isMutation?: boolean },
): Promise<{ data: T | null; error: ApiError | null }> {
  let result: { data: T | null; error: Error | null };

  try {
    if (options?.isMutation) {
      result = await operation();
    } else {
      result = await retryWithBackoff(operation);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { data: null, error: createError(error.message, (error as any).name) };
  }

  // Check if operation returned an error (e.g., auth error, 400, etc.)
  if (result.error) {
    if (isAuthError(result.error)) {
      try {
        const refreshed = await ensureSession();
        if (refreshed) {
          const retryResult = await operation();
          if (retryResult.error) {
            return {
              data: null,
              error: createError(retryResult.error.message, retryResult.error.name),
            };
          }
          return { data: retryResult.data as T, error: null };
        }
      } catch (e) {
        console.error('Failed to ensure session:', e);
      }
    }

    // Non-auth error or refresh failed - return the original error
    return { data: null, error: createError(result.error.message, result.error.name) };
  }

  // Success
  return { data: result.data as T, error: null };
}

export function queryToPromise<T>(
  queryFactory: () => Promise<{ data: T | null; error: Error | null }>,
): Promise<{ data: T | null; error: Error | null }> {
  return queryFactory();
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
