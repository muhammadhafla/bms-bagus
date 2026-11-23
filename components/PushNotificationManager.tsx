'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { IconBell, IconBellRinging, IconInfoCircle } from '@tabler/icons-react';

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

function formatPushError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') {
      return 'Izin notifikasi ditolak atau diblokir oleh browser.';
    }
    if (err.name === 'AbortError') {
      return 'Gagal terhubung ke layanan push browser. Pastikan internet lancar dan tidak diblokir VPN/AdBlock.';
    }
    if (err.name === 'InvalidStateError') {
      return 'Status langganan notifikasi tidak sinkron. Muat ulang halaman lalu coba lagi.';
    }
    if (err.message === 'Failed to fetch' || err.name === 'NetworkError') {
      return 'Koneksi jaringan bermasalah saat menghubungi server. Periksa internet Anda.';
    }
    if (err.message) {
      return err.message;
    }
  }
  return 'Gagal mengaktifkan notifikasi. Silakan coba lagi.';
}

/**
 * Reuses an already-active Service Worker registration when available, or registers `/sw.js`
 * and waits for activation with bounded timeout and redundancy detection.
 */
async function waitForActiveServiceWorker(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  const existingReg = await navigator.serviceWorker.getRegistration('/');
  if (existingReg?.active) {
    return existingReg;
  }

  const registration =
    existingReg && (existingReg.installing || existingReg.waiting)
      ? existingReg
      : await navigator.serviceWorker.register('/sw.js');

  if (registration.active) {
    return registration;
  }

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  const pendingWorker = registration.installing || registration.waiting;
  if (pendingWorker?.state === 'redundant') {
    throw new Error(
      'Service Worker gagal dipasang. Pastikan aplikasi berjalan di mode produksi atau muat ulang halaman.',
    );
  }

  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (pendingWorker) {
        pendingWorker.removeEventListener('statechange', handleStateChange);
      }
    };

    const finishResolve = (reg: ServiceWorkerRegistration) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(reg);
    };

    const finishReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const handleStateChange = () => {
      if (registration.active) {
        finishResolve(registration);
        return;
      }
      if (pendingWorker?.state === 'installed' && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (pendingWorker?.state === 'redundant') {
        finishReject(
          new Error(
            'Service Worker gagal dipasang. Pastikan aplikasi berjalan di mode produksi atau muat ulang halaman.',
          ),
        );
      }
    };

    timer = setTimeout(() => {
      finishReject(
        new Error('Service Worker tidak merespons (timeout). Muat ulang halaman lalu coba lagi.'),
      );
    }, timeoutMs);

    if (pendingWorker) {
      pendingWorker.addEventListener('statechange', handleStateChange);
    }

    navigator.serviceWorker.ready
      .then((readyReg) => {
        finishResolve(readyReg);
      })
      .catch((err: unknown) => {
        finishReject(
          err instanceof Error ? err : new Error('Gagal mengaktifkan Service Worker'),
        );
      });
  });
}

export function PushNotificationManager() {
  const toggleId = useId();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isSubscribingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const iOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);

    // Detect standalone PWA mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standaloneMode);

    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) return;

    let isMounted = true;

    const syncStatus = async () => {
      if (!isMounted || isSubscribingRef.current) return;
      setPermission(Notification.permission);
      try {
        const existingReg = await navigator.serviceWorker.getRegistration('/');
        const reg = existingReg || (await navigator.serviceWorker.register('/sw.js'));
        const subscription = await reg.pushManager?.getSubscription();
        if (isMounted && !isSubscribingRef.current) {
          setIsSubscribed(!!subscription);
        }
      } catch (err) {
        console.warn('[PushNotificationManager] Service worker check:', err);
      }
    };

    syncStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const subscribeToPush = async () => {
    if (isSubscribingRef.current) return;

    // Optimistic UI: immediately reflect active state while processing in the background
    isSubscribingRef.current = true;
    setIsSubscribing(true);
    setIsSubscribed(true);

    let createdNewSubscription: PushSubscription | null = null;

    try {
      if (isIOS && !isStandalone) {
        toast.info('Di iPhone/iPad, tambahkan web ke Layar Utama (Add to Home Screen) terlebih dahulu.');
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'denied') {
        setIsSubscribed(false);
        toast.error(
          'Gagal mengaktifkan: izin notifikasi ditolak. Aktifkan izin notifikasi di pengaturan browser/HP Anda.',
        );
        return;
      }

      if (perm !== 'granted') {
        setIsSubscribed(false);
        toast.info('Notifikasi belum diaktifkan. Silakan pilih "Izinkan" saat browser meminta izin.');
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Konfigurasi notifikasi (VAPID Public Key) belum tersedia.');
      }

      const [registration, sessionResult] = await Promise.all([
        waitForActiveServiceWorker(),
        supabase.auth.getSession(),
      ]);

      if (!registration.pushManager) {
        throw new Error('Browser ini tidak mendukung layanan Push Notification.');
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        createdNewSubscription = subscription;
      }

      const session = sessionResult.data.session;

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
        const errBody = await response.json().catch(() => null);
        if (response.status === 401) {
          throw new Error('Sesi login berakhir. Silakan masuk ulang untuk mengaktifkan notifikasi.');
        }
        throw new Error(errBody?.error || 'Gagal menyimpan pendaftaran notifikasi ke server.');
      }

      toast.success('Notifikasi berhasil diaktifkan di HP Anda!');
    } catch (err: unknown) {
      console.error('Error subscribing to push:', err);
      // Rollback orphaned browser subscription if server sync failed
      if (createdNewSubscription) {
        await createdNewSubscription.unsubscribe().catch(() => {});
      }
      // Revert optimistic UI back to inactive
      setIsSubscribed(false);
      toast.error('Gagal mengaktifkan notifikasi: ' + formatPushError(err));
    } finally {
      isSubscribingRef.current = false;
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (isSubscribingRef.current) return;

    // Optimistic UI: immediately reflect inactive state
    isSubscribingRef.current = true;
    setIsSubscribing(true);
    setIsSubscribed(false);

    try {
      const [registration, sessionResult] = await Promise.all([
        navigator.serviceWorker
          .getRegistration('/')
          .then((reg) => reg || waitForActiveServiceWorker()),
        supabase.auth.getSession(),
      ]);

      const subscription = await registration.pushManager?.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const session = sessionResult.data.session;

        const response = await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ endpoint }),
        });

        if (!response.ok) {
          console.warn('[PushNotificationManager] Failed to delete subscription on server');
        }
      }

      toast.success('Notifikasi berhasil dimatikan.');
    } catch (err: unknown) {
      console.error('Error unsubscribing:', err);
      // Revert optimistic UI back to active if browser unsubscribe failed
      setIsSubscribed(true);
      toast.error('Gagal mematikan notifikasi: ' + formatPushError(err));
    } finally {
      isSubscribingRef.current = false;
      setIsSubscribing(false);
    }
  };

  const testPush = async () => {
    try {
      setIsTesting(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengirim notifikasi uji coba');
      }

      toast.success('Notifikasi uji coba dikirim! Periksa layar / banner HP Anda.');
    } catch (err: any) {
      toast.error('Uji coba gagal: ' + (err.message || 'Error tidak diketahui'));
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

  const isToggleDisabled = isSubscribing || permission === 'denied';

  return (
    <div className="space-y-2.5 rounded-lg border border-neutral-200 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSubscribed ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800'}`}>
            {isSubscribed ? <IconBellRinging className="h-4 w-4" /> : <IconBell className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Notifikasi Aplikasi (Push Notif)
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${isSubscribed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                {isSubscribed ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Terima pemberitahuan kasbon, absensi, dan update sistem langsung di HP.
            </p>
          </div>
        </div>

        <label
          htmlFor={toggleId}
          className={`relative inline-flex shrink-0 select-none items-center ${
            permission === 'denied'
              ? 'cursor-not-allowed opacity-50'
              : isSubscribing
                ? 'cursor-wait opacity-85'
                : 'cursor-pointer'
          }`}
        >
          <input
            id={toggleId}
            type="checkbox"
            aria-label="Notifikasi Aplikasi (Push Notif)"
            className="peer sr-only"
            checked={isSubscribed}
            onChange={(e) => {
              if (e.target.checked && !isSubscribed) {
                subscribeToPush();
              } else if (!e.target.checked && isSubscribed) {
                unsubscribeFromPush();
              }
            }}
            disabled={isToggleDisabled}
          />
          <div className="h-6 w-11 rounded-full bg-neutral-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 dark:bg-neutral-700 dark:peer-checked:bg-brand-500"></div>
          {isSubscribing && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute top-1.5 h-3 w-3 animate-spin rounded-full border-2 border-t-transparent ${
                isSubscribed ? 'left-1.5 border-white' : 'right-1.5 border-brand-500'
              }`}
            />
          )}
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

      {isSubscribed && !isSubscribing && (
        <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2 text-[11px] text-emerald-600 dark:border-neutral-800 dark:text-emerald-400">
          <span>✓ Perangkat ini aktif menerima notifikasi.</span>
          <button
            type="button"
            onClick={testPush}
            disabled={isTesting}
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 active:scale-95 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            {isTesting ? 'Mengirim...' : 'Kirim Uji Coba'}
          </button>
        </div>
      )}
    </div>
  );
}
