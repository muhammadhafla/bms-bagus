import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, verifyWaBridgeSecret } from '@/lib/api/auth-guard';

const outboxQuerySchema = z.object({
  gudang_id: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const outboxPatchSchema = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'processing', 'sent', 'delivered', 'read', 'failed', 'cancelled']),
  error_message: z.string().max(1000).nullable().optional(),
  read_at: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const authResult = verifyWaBridgeSecret(request);
    if (!authResult.authorized) return authResult.error;

    const { searchParams } = new URL(request.url);
    const parsedQuery = outboxQuerySchema.safeParse({
      gudang_id: searchParams.get('gudang_id') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Parameter query tidak valid.' }, { status: 400 });
    }

    const { gudang_id, limit } = parsedQuery.data;
    const supabase = createAdminClient();

    let query = supabase
      .from('wa_outbox')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (gudang_id) {
      query = query.or(`id_gudang.eq.${gudang_id},id_gudang.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[api/wa-bridge/outbox] GET error:', error);
      return NextResponse.json({ error: 'Gagal memuat antrean WhatsApp.' }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[api/wa-bridge/outbox] GET unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = verifyWaBridgeSecret(request);
    if (!authResult.authorized) return authResult.error;

    const rawBody = await request.json().catch(() => null);
    const parsed = outboxPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Payload update outbox tidak valid.' }, { status: 400 });
    }

    const { id, status, error_message, read_at } = parsed.data;
    const supabase = createAdminClient();

    const updatePayload: Record<string, string | null> = { status };
    if (error_message !== undefined) updatePayload.error_message = error_message;
    if (read_at !== undefined) updatePayload.read_at = read_at;

    const { data, error } = await supabase
      .from('wa_outbox')
      .update(updatePayload)
      .eq('id', id)
      .select('id, status')
      .maybeSingle();

    if (error) {
      console.error('[api/wa-bridge/outbox] PATCH error:', error);
      return NextResponse.json({ error: 'Gagal memperbarui status outbox.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Item outbox tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('[api/wa-bridge/outbox] PATCH unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
