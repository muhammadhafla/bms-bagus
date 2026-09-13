'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('[GlobalError] Uncaught root error:', error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="mb-2 text-xl sm:text-2xl font-black tracking-tight text-neutral-900">
            Terjadi Kesalahan Sistem
          </h1>

          <p className="mb-6 text-sm text-neutral-600 leading-relaxed">
            Aplikasi mengalami kendala tak terduga saat memuat layout utama. Silakan coba muat ulang atau periksa koneksi Anda.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-700 active:scale-95"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 active:scale-95"
            >
              Muat Ulang Halaman
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {showDetails ? 'Sembunyikan Detail Teknis ▲' : 'Tampilkan Detail Teknis ▼'}
            </button>
            {showDetails && (
              <div className="mt-2 p-3 bg-neutral-900 text-neutral-200 rounded-xl text-xs font-mono overflow-x-auto max-h-48 text-left">
                <p className="font-bold text-rose-400 mb-1">{error?.name || 'Error'}: {error?.message}</p>
                {error?.digest && <p className="text-neutral-400 mb-1">Digest: {error.digest}</p>}
                {error?.stack && <pre className="text-[11px] whitespace-pre-wrap">{error.stack}</pre>}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
