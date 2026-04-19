const MAX_RETRY = 3;
const RETRY_DELAY = 1000;

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRY,
  delay = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

export function isAuthError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string };
  const name = err.name || '';
  const message = err.message || '';
  return (
    name.includes('session') ||
    name.includes('token') ||
    name.includes('JWT') ||
    name.includes('Auth') ||
    message.includes('session') ||
    message.includes('token') ||
    message.includes('JWT')
  );
}