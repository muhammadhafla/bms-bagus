'use client';

import { useEffect, useState } from 'react';
import { IconWifiOff } from '@tabler/icons-react';

export default function OfflinePage() {
  const [isReloading, setIsReloading] = useState(false);

  // Otomatis reload ketika koneksi kembali
  useEffect(() => {
    const handleOnline = () => {
      setIsReloading(true);
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const handleRetry = () => {
    setIsReloading(true);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 text-center dark:bg-neutral-950">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <IconWifiOff className="h-10 w-10 text-neutral-400" aria-hidden="true" />
      </div>
      
      <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
        Tidak Ada Koneksi
      </h1>
      
      <p className="mb-8 max-w-sm text-neutral-500 dark:text-neutral-400">
        Perangkat Anda sedang offline. Periksa koneksi internet Anda, lalu coba kembali.
      </p>
      
      <button
        onClick={handleRetry}
        disabled={isReloading}
        className="bg-brand-500 min-h-[44px] rounded-xl px-6 py-3 font-semibold text-white transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 mx-auto"
      >
        {isReloading ? 'Menyambungkan...' : 'Coba Lagi'}
      </button>
    </div>
  );
}
