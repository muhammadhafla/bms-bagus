import { retryWithBackoff, isAuthError } from './retry';

export interface ApiError {
  message: string;
  details?: string;
}

export function createError(message: string, details?: string): ApiError {
  return { message, details: details || message };
}

export async function safeQuery<T>(query: Promise<{ data: T | null; error: Error | null }>): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const result = await retryWithBackoff(async () => {
      const queryResult = await query;
      if (queryResult.error) throw queryResult.error;
      return queryResult;
    });

    return { data: result.data as T, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    if (isAuthError(error)) {
      const { useAuthStore } = await import('@/lib/auth');
      try {
        const refreshed = await useAuthStore.getState().checkAndRefreshSession();
        if (refreshed) {
          const retryResult = await query;
          if (retryResult.error) {
            return { data: null, error: createError(retryResult.error.message, retryResult.error.name) };
          }
          return { data: retryResult.data as T, error: null };
        }
      } catch {
        // Session check failed
      }
      
      const refreshed = await useAuthStore.getState().refreshSession();
      if (refreshed) {
        const retryResult = await query;
        if (retryResult.error) {
          return { data: null, error: createError(retryResult.error.message, retryResult.error.name) };
        }
        return { data: retryResult.data as T, error: null };
      }
    }
    
    return { data: null, error: createError(error.message, (error as { name?: string }).name) };
  }
}

export function queryToPromise<T>(query: { then(onfulfilled: (value: { data: T | null; error: Error | null }) => unknown): unknown }): Promise<{ data: T | null; error: Error | null }> {
  return query.then((value) => ({ data: value.data as T | null, error: value.error as Error | null })) as Promise<{ data: T | null, error: Error | null }>;
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}