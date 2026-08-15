'use client';

import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { IconRefresh } from '@tabler/icons-react';
import { Button } from './Button';

export function UpdateBanner() {
  const { updateAvailable, updatePwa } = usePwaUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-800 animate-fade-in z-50 mb-4 flex flex-col items-center justify-between gap-3 rounded-b-2xl border-b p-3 shadow-sm sm:flex-row lg:mb-6">
      <div className="flex items-center gap-3">
        <div className="bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 shrink-0 rounded-full p-2">
          <IconRefresh className="animate-spin-slow h-5 w-5" />
        </div>
        <div>
          <h4 className="dark:text-brand-100 text-sm font-bold text-neutral-900">
            Pembaruan Tersedia!
          </h4>
          <p className="dark:text-brand-200/80 mt-0.5 text-xs text-neutral-600">
            Versi terbaru aplikasi siap digunakan. Segarkan untuk memuat pembaruan.
          </p>
        </div>
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
        <Button
          variant="primary"
          size="sm"
          className="w-full text-xs whitespace-nowrap sm:w-auto"
          onClick={updatePwa}
        >
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}
