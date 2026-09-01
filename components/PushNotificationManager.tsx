'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { IconBell, IconBellRinging, IconInfoCircle, IconSend } from '@tabler/icons-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const iOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);

    // Detect standalone PWA mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register and check subscription
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          return reg.pushManager.getSubscription();
        })
        .then((subscription) => {
          setIsSubscribed(!!subscription);
        })
        .catch((err) => {
          console.warn('[PushNotificationManager] Service worker check:', err);
        });
    }
  }, []);

  const subscribeToPush = async () => {
    try {
      setIsSubscribing(true);

      if (isIOS && !isStandalone) {
        toast.info('Di iPhone/iPad, tambahkan web ke Layar Utama (Add to Home Screen) terlebih dahulu.');
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        toast.error('Izin notifikasi ditolak oleh browser/sistem HP.');
        setIsSubscribing(false);
        return;
      }

      // Pastikan Service Worker terdaftar
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID Public Key belum disetel di environment');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const { data: { session } } = await supabase.auth.getSession();

      // Kirim pendaftaran ke server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan pendaftaran notifikasi ke server');
      }

      toast.success('Notifikasi berhasil diaktifkan di HP Anda!');
      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Error subscribing to push:', err);
      toast.error('Terjadi kesalahan: ' + (err.message || 'Gagal mendaftar notifikasi'));
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      setIsSubscribing(true);
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();

        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      toast.success('Notifikasi berhasil dimatikan.');
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      toast.error('Gagal mematikan notifikasi');
    } finally {
      setIsSubscribing(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setIsTesting(true);
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Gagal mengirim notifikasi tes');
      }

      toast.success('Notifikasi uji coba terkirim! Cek bilah notifikasi HP Anda.');
    } catch (err: any) {
      console.error('Error sending test push:', err);
      toast.error('Gagal tes notifikasi: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsTesting(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <IconInfoCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Web Push Notification Tidak Didukung</p>
            {isIOS && !isStandalone ? (
              <p>
                Untuk pengguna <strong>iPhone / iPad (iOS)</strong>: Buka menu <strong>Share</strong> (ikon bagikan di bawah Safari), lalu pilih <strong>&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>. Buka BMS dari Layar Utama untuk mengaktifkan notifikasi.
              </p>
            ) : (
              <p>Browser HP Anda tidak mendukung Web Push Notification atau berjalan di mode penyamaran (Incognito).</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSubscribed ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800'}`}>
            {isSubscribed ? <IconBellRinging className="h-4 w-4" /> : <IconBell className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Notifikasi Aplikasi (Push Notif)
              </label>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${isSubscribed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                {isSubscribed ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Terima pemberitahuan kasbon, absensi, dan update sistem langsung di HP.
            </p>
          </div>
        </div>

        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={isSubscribed}
            onChange={(e) => {
              if (e.target.checked && !isSubscribed) {
                subscribeToPush();
              } else if (!e.target.checked && isSubscribed) {
                unsubscribeFromPush();
              }
            }}
            disabled={isSubscribing || permission === 'denied'}
          />
          <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/20 dark:bg-neutral-700 dark:peer-checked:bg-brand-500"></div>
        </label>
      </div>

      {permission === 'denied' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <p className="font-semibold">Izin Notifikasi Diblokir</p>
          <p className="mt-0.5">
            Browser atau sistem HP Anda memblokir notifikasi. Untuk mengaktifkan kembali: buka Info Situs / Pengaturan Aplikasi di HP &rarr; Izinkan Notifikasi.
          </p>
        </div>
      )}

      {isIOS && !isStandalone && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
          <p className="font-semibold">Petunjuk Pengguna iPhone / iPad</p>
          <p className="mt-0.5">
            Agar notifikasi dapat masuk di latar belakang, buka menu <strong>Bagikan (Share)</strong> di Safari lalu pilih <strong>&quot;Tambah ke Layar Utama&quot;</strong>.
          </p>
        </div>
      )}

      {isSubscribed && (
        <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2.5 dark:border-neutral-800">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Perangkat terhubung & siap menerima notifikasi.
          </span>
          <button
            type="button"
            onClick={sendTestNotification}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {isTesting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
            ) : (
              <IconSend className="h-3.5 w-3.5 text-brand-500" />
            )}
            <span>Tes Notifikasi HP</span>
          </button>
        </div>
      )}
    </div>
  );
}
