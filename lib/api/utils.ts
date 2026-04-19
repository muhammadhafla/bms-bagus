import { retryWithBackoff, isAuthError } from './retry';

export interface ApiError {
  message: string;
  details?: string;
}

export function createError(message: string, details?: string): ApiError {
  return { message, details: details || message };
}

export async function safeQuery<T>(operation: () => Promise<{ data: T | null; error: Error | null }>): Promise<{ data: T | null; error: ApiError | null }> {
  let result: { data: T | null; error: Error | null };
  
  try {
    // Retry only on thrown exceptions (network errors, timeouts)
    result = await retryWithBackoff(operation);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { data: null, error: createError(error.message, (error as any).name) };
  }

  // Check if operation returned an error (e.g., auth error, 400, etc.)
  if (result.error) {
    // If it's an auth error, try to refresh session and retry once
    if (isAuthError(result.error)) {
      const { useAuthStore } = await import('@/lib/auth');
      try {
        const refreshed = await useAuthStore.getState().checkAndRefreshSession();
        if (refreshed) {
          const retryResult = await operation();
          if (retryResult.error) {
            return { data: null, error: createError(retryResult.error.message, retryResult.error.name) };
          }
          return { data: retryResult.data as T, error: null };
        }
      } catch { /* ignored */ }
      
      // If check didn't refresh, try explicit refresh
      const refreshed2 = await useAuthStore.getState().refreshSession();
      if (refreshed2) {
        const retryResult = await operation();
        if (retryResult.error) {
          return { data: null, error: createError(retryResult.error.message, retryResult.error.name) };
        }
        return { data: retryResult.data as T, error: null };
      }
    }
    
    // Non-auth error or refresh failed - return the original error
    return { data: null, error: createError(result.error.message, result.error.name) };
  }

  // Success
  return { data: result.data as T, error: null };
}

export function queryToPromise<T>(queryFactory: () => Promise<{ data: T | null; error: Error | null }>): Promise<{ data: T | null; error: Error | null }> {
  return queryFactory();
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}