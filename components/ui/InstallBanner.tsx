'use client';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { IconDownload, IconX } from '@tabler/icons-react';
import Image from 'next/image';

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="bg-brand-50 dark:bg-brand-950/50 border-brand-100 dark:border-brand-900/30 animate-fade-in-up flex items-center gap-3 border-b px-4 py-2.5">
      <div className="relative h-8 w-8 shrink-0 dark:rounded-lg dark:bg-white">
        <Image src="/favicon-32x32.png" alt="BMS" fill className="object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-brand-900 dark:text-brand-100 text-sm leading-tight font-semibold">
          Install BMS
        </p>
        <p className="text-brand-600 dark:text-brand-400 truncate text-xs">
          Akses lebih cepat dari home screen
        </p>
      </div>
      <button
        onClick={install}
        className="bg-brand-600 hover:bg-brand-700 flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95"
      >
        <IconDownload className="h-3.5 w-3.5" />
        Install
      </button>
      <button
        onClick={dismiss}
        className="text-brand-400 hover:text-brand-600 dark:text-brand-500 dark:hover:text-brand-300 shrink-0 rounded p-1 transition-colors"
        aria-label="Tutup banner"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
