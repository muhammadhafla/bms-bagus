'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button } from './ui/Button';
import { IconBellRinging, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

const emptySubscribe = () => () => {};

function canShowPushPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return false;
  try {
    return !localStorage.getItem('push_prompt_dismissed');
  } catch {
    return false;
  }
}

export function SoftPromptBanner() {
  const isPromptEligible = useSyncExternalStore(emptySubscribe, canShowPushPrompt, () => false);
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  const dismiss = () => {
    try {
      localStorage.setItem('push_prompt_dismissed', 'true');
    } catch {}
    setIsDismissed(true);
  };

  const goToProfile = () => {
    router.push('/profile');
  };

  if (!isPromptEligible || isDismissed) return null;

  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-lg border border-brand-200 bg-brand-50/80 p-4 sm:flex-row sm:items-center dark:border-brand-800/60 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-full bg-brand-100 p-2 text-brand-600 sm:mt-0 dark:bg-brand-900/50 dark:text-brand-400">
          <IconBellRinging size={20} />
        </div>
        <div>
          <h4 className="font-medium text-neutral-900 dark:text-white">Dapatkan Pengingat Absen</h4>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Aktifkan notifikasi untuk menerima pengingat absen tepat waktu dan pemberitahuan penting lainnya.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Nanti saja
        </Button>
        <Button size="sm" onClick={goToProfile}>
          Aktifkan Sekarang
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup banner"
          className="ml-2 rounded-lg p-1 text-neutral-500 transition-colors hover:bg-brand-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-neutral-400 dark:hover:bg-brand-900/40 dark:hover:text-white"
        >
          <IconX size={18} />
        </button>
      </div>
    </div>
  );
}
