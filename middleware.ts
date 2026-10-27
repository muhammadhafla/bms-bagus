import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware untuk server-side route protection.
 * Menggantikan ProtectedRoute yang hanya client-side (bisa di-bypass via DevTools).
 *
 * Alur:
 * 1. Skip static assets dan path publik (offline, API auth)
 * 2. Bypass rotasi token untuk background prefetch & RSC Next.js (mencegah cookie desync)
 * 3. Delegasi otorisasi API ke endpoint auth-guard masing-masing
 * 4. Cek user Supabase via getUser() untuk navigasi halaman penuh (auto-refresh sesi via cookie)
 * 5. Redirect ke /dashboard jika sudah login saat mengakses /login
 * 6. Redirect ke /login jika belum login saat mengakses route proteksi
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

  // 1. Lewati static assets dan path publik tanpa overhead session check
  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  // 2. Deteksi Next.js background prefetch request
  // PENTING: Browser mengabaikan Set-Cookie pada request prefetch.
  // Jika token dirotasi pada prefetch, refresh token lama akan hangus di Supabase
  // tetapi browser masih menyimpannya, memicu error 400 refresh_token_not_found saat navigasi nyata.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1';

  if (isPrefetch) {
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.includes('-auth-token') || c.name.includes('supabase'),
    );
    if (hasAuthCookie) {
      return NextResponse.next({ request });
    }
  }

  // 3. Tangani rute /api/* (selain /api/auth yang sudah dilewati di PUBLIC_PATHS)
  // Serahkan verifikasi detail ke endpoint auth-guard masing-masing untuk mencegah
  // race condition penukaran token bersamaan dari micro-request API paralel.
  if (pathname.startsWith('/api/')) {
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.includes('-auth-token') || c.name.includes('supabase'),
    );
    const hasAuthHeader = Boolean(request.headers.get('authorization'));

    if (!hasAuthCookie && !hasAuthHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next({ request });
  }

  // 4. Inisialisasi response untuk menangani cookie refresh
  let response = NextResponse.next({
    request,
  });

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
            // Update request cookies untuk downstream Server Components
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            // Buat response baru dengan request yang sudah diperbarui
            response = NextResponse.next({
              request,
            });
            // Pasang cookie baru ke response
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    // PENTING: Gunakan getUser(), JANGAN getSession().
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
        response.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return redirectResponse;
      }
      // User belum login, izinkan akses ke /login
      return response;
    }

    // Fallback toleransi untuk mode offline PWA / network error sementara
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

    // Tidak ada user yang valid → redirect ke login
    if (error || !user) {
      const loginUrl = new URL('/login', request.url);
      // Validasi path sebelum set ke param (cegah open redirect)
      const safeRedirect =
        pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/dashboard';
      loginUrl.searchParams.set('redirectTo', safeRedirect);

      const redirectResponse = NextResponse.redirect(loginUrl);
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    return response;
  } catch (err) {
    console.error('[Middleware] Error checking auth:', err);

    // Graceful fallback: periksa apakah ada cookie auth Supabase
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) => c.name.includes('-auth-token') || c.name.includes('supabase'),
    );

    if (hasAuthCookie) {
      // Izinkan lewat agar client-side PWA / cache dapat menangani gracefully
      return response;
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
