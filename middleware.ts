import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware untuk server-side route protection.
 * Menggantikan ProtectedRoute yang hanya client-side (bisa di-bypass via DevTools).
 *
 * Alur:
 * 1. Skip static assets dan path publik (offline, API auth)
 * 2. Cek user Supabase via getUser() untuk auto-refresh session via refresh token di cookie
 * 3. Jika user sudah login dan mengakses /login, redirect ke /dashboard
 * 4. Jika user belum login dan mengakses route proteksi, redirect ke /login
 */

const PUBLIC_PATHS = [
  '/offline',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/manifest.json',
  '/sw.js',
  '/workbox-',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati static assets dan path publik tanpa overhead session check
  if (isPublicPath(pathname)) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // Buat response baru untuk menangani cookie refresh
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Array to capture cookies that need to be updated or deleted
  let supabaseCookies: { name: string; value: string; options: any }[] = [];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Middleware] Supabase URL atau Anon Key tidak ditemukan di environment');
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            supabaseCookies = cookiesToSet;
            // Set cookie di request untuk downstream
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            // Buat response baru dengan cookie yang diperbarui
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });

            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // PENTING: Gunakan getUser(), JANGAN getSession().
    // getSession() tidak me-refresh token yang expired di server context.
    // getUser() akan otomatis menggunakan Refresh Token di cookie untuk memperbarui
    // Access Token yang expired (> 1 jam) dan memicu setAll() untuk menyimpan cookie baru.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Jika user mengakses halaman login
    if (pathname === '/login') {
      if (user) {
        // User sudah terautentikasi, alihkan langsung ke dashboard
        const dashboardUrl = new URL('/dashboard', request.url);
        const redirectResponse = NextResponse.redirect(dashboardUrl);
        supabaseCookies.forEach(({ name, value, options }) =>
          redirectResponse.cookies.set(name, value, options),
        );
        return redirectResponse;
      }
      // User belum login, izinkan akses ke /login
      return response;
    }

    // Fallback toleransi untuk mode offline PWA / network error
    const isNetworkError =
      error &&
      (error.message?.includes('fetch failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.name === 'AuthRetryableFetchError');

    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.includes('-auth-token') || c.name.includes('supabase'),
    );

    if (isNetworkError && hasAuthCookie) {
      // Izinkan lewat agar cache PWA / client-side offline dapat menangani
      return response;
    }

    // Tidak ada user yang valid → redirect ke login atau return 401
    if (error || !user) {
      if (pathname.startsWith('/api/')) {
        const apiResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        supabaseCookies.forEach(({ name, value, options }) =>
          apiResponse.cookies.set(name, value, options),
        );
        return apiResponse;
      }

      const loginUrl = new URL('/login', request.url);
      // Validasi path sebelum set ke param (cegah open redirect)
      const safeRedirect =
        pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/dashboard';
      loginUrl.searchParams.set('redirectTo', safeRedirect);

      const redirectResponse = NextResponse.redirect(loginUrl);
      supabaseCookies.forEach(({ name, value, options }) =>
        redirectResponse.cookies.set(name, value, options),
      );
      return redirectResponse;
    }

    return response;
  } catch (err) {
    console.error('[Middleware] Error checking session:', err);

    // Graceful fallback: periksa apakah ada cookie auth Supabase
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.includes('-auth-token') || c.name.includes('supabase'),
    );

    if (hasAuthCookie) {
      // Izinkan lewat agar client-side PWA / cache dapat menangani gracefully
      return response;
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    const safeRedirect =
      pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/dashboard';
    loginUrl.searchParams.set('redirectTo', safeRedirect);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  // Jalankan middleware untuk semua route kecuali static files dan API yang tidak butuh auth
  matcher: [
    /*
     * Match semua path kecuali:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - File ekstensi umum (png, jpg, svg, dll.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
