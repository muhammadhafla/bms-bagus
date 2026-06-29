'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Terjadi Kesalahan</h2>
      <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md">
        Maaf, terjadi kesalahan saat memuat halaman ini. Silakan coba lagi.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()} variant="secondary">
          Muat Ulang Halaman
        </Button>
        <Button onClick={() => reset()} variant="primary">
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
