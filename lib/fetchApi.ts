import { supabase } from '@/lib/supabase';

/**
 * Wrapper for native fetch that automatically injects Supabase session token,
 * refreshes near-expired sessions, and redirects to login upon 401 Unauthorized errors.
 */
export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let token: string | undefined;

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.warn('[fetchApi] Gagal membaca sesi Supabase:', error.message);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const isNearExpiry = Boolean(session?.expires_at && session.expires_at - nowSec < 60);

    if ((!session || isNearExpiry) && typeof window !== 'undefined') {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshed.session?.access_token) {
        token = refreshed.session.access_token;
      } else {
        token = session?.access_token;
      }
    } else {
      token = session?.access_token;
    }
  } catch (err) {
    console.warn('[fetchApi] Kesalahan saat mengambil token sesi:', err);
  }

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
