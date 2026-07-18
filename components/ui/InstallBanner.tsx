'use client';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { IconDownload, IconX } from '@tabler/icons-react';
import Image from 'next/image';

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 
                    bg-brand-50 dark:bg-brand-950/50 
                    border-b border-brand-100 dark:border-brand-900/30
                    animate-fade-in-up">
      <div className="relative w-8 h-8 shrink-0 dark:bg-white dark:rounded-lg">
        <Image src="/favicon-32x32.png" alt="BMS" fill className="object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand-900 dark:text-brand-100 leading-tight">
          Install BMS
        </p>
        <p className="text-xs text-brand-600 dark:text-brand-400 truncate">
          Akses lebih cepat dari home screen
        </p>
      </div>
      <button
        onClick={install}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 
                   bg-brand-600 text-white rounded-lg text-xs font-semibold
                   hover:bg-brand-700 active:scale-95 transition-all min-h-[32px]"
      >
        <IconDownload className="w-3.5 h-3.5" />
        Install
      </button>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 text-brand-400 hover:text-brand-600 
                   dark:text-brand-500 dark:hover:text-brand-300 
                   rounded transition-colors"
        aria-label="Tutup banner"
      >
        <IconX className="w-4 h-4" />
      </button>
    </div>
  );
}
