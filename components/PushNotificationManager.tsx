'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Check existing subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    try {
      setIsSubscribing(true);
      
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        toast.error('Izin notifikasi ditolak.');
        setIsSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID Public Key not set');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const { data: { session } } = await supabase.auth.getSession();
      
      // Send to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan pendaftaran notifikasi');
      }

      toast.success('Notifikasi berhasil diaktifkan!');
      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Error subscribing to push:', err);
      toast.error('Terjadi kesalahan: ' + err.message);
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
        // Hapus dari browser
        await subscription.unsubscribe();
        
        const { data: { session } } = await supabase.auth.getSession();
        
        // Hapus dari server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      
      setIsSubscribed(false);
      toast.success('Notifikasi berhasil dimatikan');
    } catch (err: any) {
      console.error('Error unsubscribing:', err);
      toast.error('Gagal mematikan notifikasi');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
        Browser Anda tidak mendukung Web Push Notification.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1">
      <div className="space-y-0.5">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Notifikasi Aplikasi
        </label>
        {permission === 'denied' && (
          <p className="text-xs text-red-500 mt-1">Notifikasi diblokir oleh browser.</p>
        )}
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
  );
}
