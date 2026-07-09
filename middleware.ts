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
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    base-uri 'none';
    object-src 'none';
    script-src 'self' 'nonce-${nonce}' ${
      process.env.NODE_ENV === 'production'
        ? "'strict-dynamic'"
        : "'unsafe-inline' 'unsafe-eval'"
    };
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://letxagpmrumwcjuzruyg.supabase.co https://*.supabase.co wss://*.supabase.co;
  `.replace(/\s{2,}/g, ' ').trim();

  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', cspHeader);

  // Lewati path publik — tidak perlu cek session
  if (isPublicPath(pathname)) {
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  // Buat response baru untuk menangani cookie refresh
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  response.headers.set('Content-Security-Policy', cspHeader);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookie di request untuk downstream
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Buat response baru dengan cookie yang diperbarui
          response = NextResponse.next({
            request: {
              headers: request.headers,
            }
          });
          response.headers.set('Content-Security-Policy', cspHeader);
          
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Cek session — ini juga akan refresh session token jika mendekati expiry
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Tidak ada session → redirect ke login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    // Simpan URL asal agar setelah login bisa redirect balik
    loginUrl.searchParams.set('redirectTo', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set('Content-Security-Policy', cspHeader);
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
