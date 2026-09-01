import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api/auth-guard';
import { sendPushNotification } from '@/lib/push';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError || !user) return authError || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await sendPushNotification(user.id, {
      title: 'Uji Coba Notifikasi BMS 🔔',
      body: 'Hebat! Push notification berhasil terhubung dan aktif di perangkat Anda.',
      url: '/profile',
    });

    return NextResponse.json({ success: true, message: 'Notifikasi uji coba telah dikirim' });
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
