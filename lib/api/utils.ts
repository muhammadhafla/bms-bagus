// Local copy to avoid circular dependency

export interface ApiError {
  message: string;
  details?: string;
}

export function createError(message: string, details?: string): ApiError {
  return { message, details: details || message };
}

export async function safeQuery<T>(query: Promise<{ data: T | null; error: Error | null }>): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const result = await query;
    if (result.error) {
      return { data: null, error: createError(result.error.message, (result.error as unknown as { name?: string }).name || 'Error') };
    }
    return { data: result.data as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    return { data: null, error: createError('Request failed', message) };
  }
}

export function queryToPromise<T>(query: { then(onfulfilled: (value: { data: T | null; error: Error | null }) => unknown): unknown }): Promise<{ data: T | null; error: Error | null }> {
  return query.then((value) => ({ data: value.data as T | null, error: value.error as Error | null })) as Promise<{ data: T | null; error: Error | null }>;
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

