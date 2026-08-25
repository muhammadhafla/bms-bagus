'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { IconBellRinging, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export function SoftPromptBanner() {
  const [show, setShow] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only show if supported, not granted, and not dismissed recently
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      if (Notification.permission === 'default') {
        const dismissed = localStorage.getItem('push_prompt_dismissed');
        if (!dismissed) {
          setShow(true);
        }
      }
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true');
    setShow(false);
  };

  const goToProfile = () => {
    router.push('/profile');
  };

  if (!show) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/20 rounded-full text-primary mt-1 sm:mt-0">
          <IconBellRinging size={20} />
        </div>
        <div>
          <h4 className="font-medium text-foreground">Dapatkan Pengingat Absen</h4>
          <p className="text-sm text-muted-foreground mt-1">
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
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground ml-2">
          <IconX size={18} />
        </button>
      </div>
    </div>
  );
}
