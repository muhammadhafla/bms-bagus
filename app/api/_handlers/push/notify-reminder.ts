import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushNotification } from '@/lib/push';
import { verifyWebhookOrAuth } from '@/lib/api/auth-guard';

const reminderTargetSchema = z.object({
  user_id: z.uuid(),
  tipe: z.enum(['masuk', 'pulang']),
  jam: z.string().trim().min(1).max(20),
});

const notifyReminderSchema = z.object({
  targets: z.array(reminderTargetSchema).max(500),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyWebhookOrAuth(request);
    if (!authResult.authorized) {
      return authResult.error;
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = notifyReminderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { targets } = parsed.data;
    const promises = targets.map((target) => {
      const title =
        target.tipe === 'masuk' ? 'Waktunya Absen Masuk!' : 'Waktunya Absen Pulang!';
      const msg =
        target.tipe === 'masuk'
          ? `Shift Anda akan dimulai pada pukul ${target.jam}. Jangan lupa absen ya!`
          : `Shift Anda telah berakhir pada pukul ${target.jam}. Jangan lupa absen pulang!`;

      return sendPushNotification(target.user_id, {
        title,
        body: msg,
        url: '/payroll',
      });
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, notified: targets.length });
  } catch (error) {
    console.error('Reminder Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
