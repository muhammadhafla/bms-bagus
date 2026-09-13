'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { IconAlertTriangle } from '@tabler/icons-react';

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('[RootErrorBoundary] Error caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
        <IconAlertTriangle size={32} />
      </div>
      <h2 className="mb-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
        Terjadi Kesalahan
      </h2>
      <p className="mb-6 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        Maaf, terjadi kendala saat memuat halaman ini. Silakan coba lagi atau muat ulang halaman.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <Button onClick={() => reset()} variant="primary">
          Coba Lagi
        </Button>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Muat Ulang Halaman
        </Button>
      </div>

      <div className="w-full max-w-md border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        >
          {showDetails ? 'Sembunyikan Detail Teknis ▲' : 'Tampilkan Detail Teknis ▼'}
        </button>
        {showDetails && (
          <div className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-mono overflow-x-auto max-h-48 text-left">
            <p className="font-bold text-rose-500 mb-1">{error?.name || 'Error'}: {error?.message}</p>
            {error?.digest && <p className="text-neutral-400 mb-1">Digest: {error.digest}</p>}
            {error?.stack && <pre className="text-[11px] whitespace-pre-wrap">{error.stack}</pre>}
          </div>
        )}
      </div>
    </div>
  );
}
