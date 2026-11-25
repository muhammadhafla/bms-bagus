import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushNotification } from '@/lib/push';
import { createAdminClient, verifyWebhookOrAuth } from '@/lib/api/auth-guard';

const ACTION_LABELS: Record<string, string> = {
  access_settings: 'Pengaturan POS',
  void_transaction: 'Void Transaksi',
  manual_discount: 'Diskon Manual',
  price_override: 'Ubah Harga Satuan',
  return_approval: 'Retur Penjualan',
};

const notifyPosAuthSchema = z.object({
  request_id: z.uuid(),
  action_type: z.string().trim().min(1).max(60).optional(),
  cashier_name: z.string().trim().max(120).nullable().optional(),
  gudang_name: z.string().trim().max(120).nullable().optional(),
  gudang_id: z.uuid().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyWebhookOrAuth(request);
    if (!authResult.authorized) {
      return authResult.error;
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = notifyPosAuthSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload tidak lengkap' }, { status: 400 });
    }

    const body = parsed.data;
    const supabase = createAdminClient();

    // 1. Ambil target penerima notifikasi: Semua user dengan role 'admin'
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .contains('roles', ['admin']);

    // Dan user dengan role 'kepala_cabang' atau 'kepala_gudang' di cabang yang sama (jika gudang_id ada)
    let kepalaGudang: { id: string }[] = [];
    if (body.gudang_id) {
      const { data: kg } = await supabase
        .from('profiles')
        .select('id')
        .overlaps('roles', ['kepala_cabang', 'kepala_gudang'])
        .eq('default_gudang_id', body.gudang_id);
      if (kg) {
        kepalaGudang = kg;
      }
    }

    const targetUserIds = Array.from(
      new Set([...(admins?.map((a) => a.id) || []), ...kepalaGudang.map((k) => k.id)]),
    );

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: 'Tidak ada admin/kepala gudang penerima' });
    }

    const cashierName = body.cashier_name || 'Kasir';
    const storeName = body.gudang_name || 'Toko';
    const actionLabel = (body.action_type && ACTION_LABELS[body.action_type]) || 'Otorisasi POS';

    // Model Claim & Dispatch: PIN TIDAK disertakan di push notification demi keamanan
    const payload = {
      title: '🔐 Permintaan Otorisasi POS',
      body: `${cashierName} (${storeName}) meminta otorisasi ${actionLabel}. Klik untuk menarik permintaan.`,
      url: '/admin/pos-auth',
      tag: `pos-auth-${body.request_id}`,
    };

    await Promise.all(targetUserIds.map((userId) => sendPushNotification(userId, payload)));

    return NextResponse.json({ success: true, recipients_count: targetUserIds.length });
  } catch (error: unknown) {
    console.error('Error in notify-pos-auth webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
