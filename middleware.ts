import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Middleware untuk server-side route protection.
 * Menggantikan ProtectedRoute yang hanya client-side (bisa di-bypass via DevTools).
 *
 * Alur:
 * 1. Skip path publik (login, static assets, API auth routes)
 * 2. Cek session Supabase via cookie
 * 3. Redirect ke /login jika tidak ada session
 */

const PUBLIC_PATHS = [
  '/login',
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

  // Lewati path publik — tidak perlu cek session
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Cek session via cookie secara lokal tanpa HTTP request untuk mempercepat TTFB
  // PERINGATAN: Ini hanya fast gate. Untuk security mutlak, gunakan getUser() di Server Action/API Route.
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Tidak ada session → redirect ke login atau return 401
  if (error || !session) {
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
