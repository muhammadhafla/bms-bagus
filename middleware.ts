import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

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

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.includes('-auth-token') || c.name.includes('supabase'));
}

function buildLoginRedirect(
  request: NextRequest,
  pathname: string,
  sourceResponse?: NextResponse,
): NextResponse {
  const loginUrl = new URL('/login', request.url);
  // Validasi path sebelum set ke param (cegah open redirect)
  const safeRedirect =
    pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/dashboard';
  loginUrl.searchParams.set('redirectTo', safeRedirect);

  const redirectResponse = NextResponse.redirect(loginUrl);
  sourceResponse?.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Lewati static assets dan path publik tanpa overhead session check
  if (isPublicPath(pathname)) {
    return NextResponse.next({ request });
  }

  // 2. Deteksi Next.js background prefetch request
  // PENTING: Browser mengabaikan Set-Cookie pada request prefetch.
  // Jika token dirotasi pada prefetch, refresh token lama akan hangus di Supabase.
  // Karena itu pada prefetch kita tetap memverifikasi klaim JWT dengan setAll() no-op (tanpa rotasi cookie).
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-middleware-prefetch') === '1';

  // 3. Tangani rute /api/* (selain /api/auth yang sudah dilewati di PUBLIC_PATHS)
  // Serahkan verifikasi detail ke endpoint auth-guard masing-masing, termasuk webhook secret
  // dari pg_net Supabase (`x-webhook-secret`) dan WA Bridge (`x-wa-bridge-secret`).
  if (pathname.startsWith('/api/')) {
    const hasAuthHeader = Boolean(request.headers.get('authorization'));
    const hasWebhookSecret = Boolean(request.headers.get('x-webhook-secret'));
    const hasWaBridgeSecret = Boolean(request.headers.get('x-wa-bridge-secret'));

    if (!hasSupabaseAuthCookie(request) && !hasAuthHeader && !hasWebhookSecret && !hasWaBridgeSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next({ request });
  }

  // 4. Cek cepat keberadaan cookie auth Supabase sebelum inisialisasi client / network call
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  if (!hasAuthCookie) {
    if (pathname === '/login') {
      return NextResponse.next({ request });
    }
    return buildLoginRedirect(request, pathname);
  }

  // 5. Inisialisasi response untuk menangani cookie refresh
  let response = NextResponse.next({
    request,
  });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Middleware] Supabase URL atau Anon Key tidak ditemukan di environment');
      return new NextResponse('Service Unavailable', { status: 503 });
    }

    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Jangan rotasi cookie saat background prefetch agar tidak memicu refresh_token_not_found
            if (isPrefetch) {
              return;
            }
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

    // Gunakan getClaims() (verifikasi JWT lokal via JWKS jika asymmetric, atau fallback
    // getUser() jika symmetric) sekaligus auto-refresh token expired via getSession() -> setAll().
    const { data: claimsData, error } = await supabase.auth.getClaims();
    const isAuthenticated = Boolean(claimsData?.claims?.sub);

    // Jika user mengakses halaman login
    if (pathname === '/login') {
      if (isAuthenticated) {
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

    // Fail-closed: tidak ada klaim sesi yang valid atau terjadi error → redirect ke login
    if (error || !isAuthenticated) {
      return buildLoginRedirect(request, pathname, response);
    }

    return response;
  } catch (err) {
    console.error('[Middleware] Error checking auth:', err);
    if (pathname === '/login') {
      return NextResponse.next({ request });
    }
    return buildLoginRedirect(request, pathname);
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
