import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';
import { verifyAuth } from '@/lib/api/auth-guard';

export async function POST(request: Request) {
  try {
    // Verifikasi otorisasi via webhook secret atau sesi terotentikasi
    const secretHeader = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;

    let isAuthorized = false;
    if (expectedSecret && secretHeader === expectedSecret) {
      isAuthorized = true;
    } else {
      const { user } = await verifyAuth(request);
      if (user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // targets: array of { user_id, tipe, jam }
    if (!body.targets || !Array.isArray(body.targets)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const promises = body.targets.map((target: any) => {
      let title = '';
      let msg = '';
      let url = '/payroll'; // URL to absen page

      if (target.tipe === 'masuk') {
        title = 'Waktunya Absen Masuk!';
        msg = `Shift Anda akan dimulai pada pukul ${target.jam}. Jangan lupa absen ya!`;
      } else if (target.tipe === 'pulang') {
        title = 'Waktunya Absen Pulang!';
        msg = `Shift Anda telah berakhir pada pukul ${target.jam}. Jangan lupa absen pulang!`;
      } else {
        return Promise.resolve();
      }

      return sendPushNotification(target.user_id, {
        title,
        body: msg,
        url
      });
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, notified: body.targets.length });
  } catch (error) {
    console.error('Reminder Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
