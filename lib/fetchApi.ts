import { supabase } from '@/lib/supabase';

/**
 * Wrapper for native fetch that automatically injects Supabase session token
 * and redirects to login upon 401 Unauthorized errors.
 */
export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    const loginUrl = new URL('/login', window.location.origin);
    const pathname = window.location.pathname;
    if (pathname !== '/login') {
      loginUrl.searchParams.set('redirectTo', pathname);
    }
    window.location.href = loginUrl.toString();
  }

  return res;
}
