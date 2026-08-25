import webpush from 'web-push';
import { createAdminClient } from '@/lib/api/auth-guard';

// Inisialisasi konfigurasi web-push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@gayabagus.shop',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushNotification(userId: string, payload: { title: string, body: string, url: string }) {
  const supabase = createAdminClient();
  
  // Ambil semua device / subscription yang dimiliki user ini
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subscriptions) {
    console.error('Error fetching subscriptions:', error);
    return;
  }

  const sendPromises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        auth: sub.auth_key,
        p256dh: sub.p256dh_key
      }
    };

    try {
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // Subscription is no longer valid, delete it
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id);
      } else {
        console.error('Error sending push notification:', err);
      }
    }
  });

  await Promise.all(sendPromises);
}
