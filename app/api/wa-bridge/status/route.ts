import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, verifyWaBridgeSecret } from '@/lib/api/auth-guard';

const bridgeStatusSchema = z.object({
  id_gudang: z.uuid().nullable().optional(),
  connected: z.boolean(),
  phone: z.string().max(50).nullable().optional(),
  name: z.string().max(255).nullable().optional(),
  qr_base64: z.string().max(500000).nullable().optional(),
  qr_expires_at: z.string().datetime().nullable().optional(),
  is_session_corrupted: z.boolean().optional().default(false),
  queue_stats: z
    .object({
      pending: z.number().int().min(0).optional(),
      processing: z.number().int().min(0).optional(),
      sent: z.number().int().min(0).optional(),
      failed: z.number().int().min(0).optional(),
      delivered: z.number().int().min(0).optional(),
      cancelled: z.number().int().min(0).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const authResult = verifyWaBridgeSecret(request);
    if (!authResult.authorized) return authResult.error;

    const rawBody = await request.json().catch(() => null);
    const parsed = bridgeStatusSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload status WA Bridge tidak valid.' }, { status: 400 });
    }

    const {
      id_gudang = null,
      connected,
      phone = null,
      name = null,
      qr_base64 = null,
      qr_expires_at = null,
      is_session_corrupted,
      queue_stats,
    } = parsed.data;

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    let existingQuery = supabase.from('wa_bridge_status').select('id');
    if (id_gudang) {
      existingQuery = existingQuery.eq('id_gudang', id_gudang);
    } else {
      existingQuery = existingQuery.is('id_gudang', null);
    }

    const { data: existing, error: findErr } = await existingQuery.maybeSingle();
    if (findErr) {
      console.error('[api/wa-bridge/status] Lookup error:', findErr);
      return NextResponse.json({ error: 'Gagal membaca status WA Bridge.' }, { status: 500 });
    }

    const rowPayload = {
      id_gudang,
      connected,
      phone,
      name,
      qr_base64,
      qr_expires_at,
      is_session_corrupted,
      ...(queue_stats ? { queue_stats } : {}),
      updated_at: nowIso,
    };

    const { data, error: saveErr } = existing?.id
      ? await supabase
          .from('wa_bridge_status')
          .update(rowPayload)
          .eq('id', existing.id)
          .select('id, id_gudang, connected, updated_at')
          .single()
      : await supabase
          .from('wa_bridge_status')
          .insert(rowPayload)
          .select('id, id_gudang, connected, updated_at')
          .single();

    if (saveErr) {
      console.error('[api/wa-bridge/status] Save error:', saveErr);
      return NextResponse.json({ error: 'Gagal menyimpan status WA Bridge.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: data });
  } catch (error) {
    console.error('[api/wa-bridge/status] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
