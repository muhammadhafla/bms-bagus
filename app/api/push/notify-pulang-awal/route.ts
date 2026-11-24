import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendPushNotification } from '@/lib/push';
import { createAdminClient, verifyWebhookOrAuth } from '@/lib/api/auth-guard';

const pulangAwalPayloadSchema = z.object({
  kehadiran_id: z.uuid(),
  user_id: z.uuid(),
  jam_pulang_aktual: z.string().trim().max(20).optional().default(''),
  jam_pulang_jadwal: z.string().trim().max(20).optional().default(''),
  alasan: z.string().trim().max(500).optional().default(''),
});

export async function POST(request: Request) {
  try {
    const authResult = await verifyWebhookOrAuth(request);
    if (!authResult.authorized) {
      return authResult.error;
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = pulangAwalPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { user_id, jam_pulang_aktual, jam_pulang_jadwal, alasan } = parsed.data;
    const supabase = createAdminClient();

    // Ambil nama & cabang pemohon
    const { data: pemohon } = await supabase
      .from('profiles')
      .select('nama, default_gudang_id')
      .eq('id', user_id)
      .maybeSingle();

    // Ambil semua admin
    const { data: admins, error: adminErr } = await supabase
      .from('profiles')
      .select('id')
      .contains('roles', ['admin']);

    if (adminErr) {
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }

    // Ambil kepala_cabang / kepala_gudang sesuai cabang pemohon (jika ada), atau seluruh kepala cabang/gudang
    let kepalaQuery = supabase
      .from('profiles')
      .select('id')
      .overlaps('roles', ['kepala_cabang', 'kepala_gudang']);

    if (pemohon?.default_gudang_id) {
      kepalaQuery = kepalaQuery.eq('default_gudang_id', pemohon.default_gudang_id);
    }

    const { data: kepalaList, error: kepalaErr } = await kepalaQuery;
    if (kepalaErr) {
      return NextResponse.json({ error: 'Failed to fetch branch recipients' }, { status: 500 });
    }

    const recipientIds = Array.from(
      new Set([
        ...(admins?.map((a) => a.id) || []),
        ...(kepalaList?.map((k) => k.id) || []),
      ]),
    );

    const nama = pemohon?.nama || 'Karyawan';
    const jadwalSuffix = jam_pulang_jadwal ? ` (Jadwal: ${jam_pulang_jadwal})` : '';
    const alasanSuffix = alasan ? ` Alasan: ${alasan}` : '';

    const payload = {
      title: 'Pulang Lebih Awal',
      body: `${nama} absen pulang pk ${jam_pulang_aktual}${jadwalSuffix}.${alasanSuffix}`,
      url: '/admin/payroll/kehadiran?tab=pulang_awal',
    };

    await Promise.all(recipientIds.map((recipientId) => sendPushNotification(recipientId, payload)));

    return NextResponse.json({ success: true, recipients_count: recipientIds.length });
  } catch (error) {
    console.error('Pulang awal notification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
