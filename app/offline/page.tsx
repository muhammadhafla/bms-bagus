'use client';

import { IconWifiOff } from '@tabler/icons-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 
                    bg-neutral-50 dark:bg-neutral-950 text-center">
      <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full 
                      flex items-center justify-center mb-6">
        <IconWifiOff className="w-10 h-10 text-neutral-400" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
        Tidak Ada Koneksi
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-8">
        Perangkat Anda sedang offline. Periksa koneksi internet Anda, 
        lalu coba kembali.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-brand-500 text-white rounded-xl 
                   font-semibold min-h-[44px] active:scale-95 transition-transform"
      >
        Coba Lagi
      </button>
    </div>
  );
}
