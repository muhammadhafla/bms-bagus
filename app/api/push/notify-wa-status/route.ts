import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';
import { createAdminClient, verifyWebhookOrAuth } from '@/lib/api/auth-guard';

export async function POST(request: Request) {
  try {
    const authResult = await verifyWebhookOrAuth(request);
    if (!authResult.authorized) {
      return authResult.error;
    }

    const body = await request.json().catch(() => ({}));
    const supabase = createAdminClient();

    // Ambil target penerima notifikasi: seluruh admin & owner
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .contains('roles', ['admin']);

    const targetUserIds = admins?.map((a) => a.id) || [];

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: 'Tidak ada admin penerima' });
    }

    const isCorrupted = body.is_session_corrupted === true;
    const isDisconnected = body.connected === false;

    let title = '⚠️ Peringatan WhatsApp Toko';
    let messageBody = 'Koneksi WhatsApp toko terputus. Klik untuk scan ulang di BMS Web.';

    if (isCorrupted) {
      title = '🚨 Sesi WhatsApp Korup (SessionError)';
      messageBody = 'Kunci enkripsi WhatsApp mengalami desinkronisasi. Pesan pelanggan tertahan. Buka BMS Web untuk Reset Sesi.';
    } else if (isDisconnected) {
      title = '⚠️ WhatsApp Toko Terputus';
      messageBody = 'Perangkat WhatsApp toko terputus. Harap buka BMS Web App untuk menautkan perangkat kembali.';
    }

    const payload = {
      title,
      body: messageBody,
      url: '/admin/wa-bridge',
      tag: 'wa-bridge-status-alert',
    };

    const promises = targetUserIds.map((userId) => sendPushNotification(userId, payload));
    await Promise.all(promises);

    return NextResponse.json({ success: true, recipients_count: targetUserIds.length });
  } catch (error: any) {
    console.error('Error in notify-wa-status route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
