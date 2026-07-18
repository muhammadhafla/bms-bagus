'use client';

import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { IconRefresh } from '@tabler/icons-react';
import { Button } from './Button';

export function UpdateBanner() {
  const { updateAvailable, updatePwa } = usePwaUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="bg-brand-50 dark:bg-brand-900/30 border-b border-brand-200 dark:border-brand-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in z-50 rounded-b-2xl mb-4 lg:mb-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 p-2 rounded-full shrink-0">
          <IconRefresh className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-neutral-900 dark:text-brand-100">Pembaruan Tersedia!</h4>
          <p className="text-xs text-neutral-600 dark:text-brand-200/80 mt-0.5">
            Versi terbaru aplikasi siap digunakan. Segarkan untuk memuat pembaruan.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
        <Button 
          variant="primary" 
          size="sm" 
          className="w-full sm:w-auto text-xs whitespace-nowrap"
          onClick={updatePwa}
        >
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}
