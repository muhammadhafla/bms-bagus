import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoles, createAdminClient } from '@/lib/api/auth-guard';
import type { Json } from '@/types/supabase';

const jsonFieldSchema = z.custom<Json>(() => true);

const createPrintJobSchema = z.object({
  template_id: z.uuid({ message: 'template_id tidak valid' }),
  payload_json: z.union([
    z.record(z.string(), jsonFieldSchema),
    z.array(jsonFieldSchema),
    z.string().min(1),
  ]),
  gudang_id: z
    .union([z.uuid(), z.literal(''), z.null()])
    .optional()
    .transform((val) => (val ? val : null)),
});

export async function POST(request: Request) {
  try {
    const { profile, error: authError } = await verifyRoles(request, [
      'admin',
      'kepala_cabang',
      'kepala_gudang',
      'staff_gudang',
      'kasir',
    ]);
    if (authError || !profile) return authError!;

    const rawBody = await request.json().catch(() => null);
    const parsed = createPrintJobSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Payload cetak tidak valid' },
        { status: 400 },
      );
    }

    const { template_id, payload_json, gudang_id: requestedGudangId } = parsed.data;
    const isAdmin = profile.roles.includes('admin');
    const supabase = createAdminClient();

    let effectiveGudangId: string | null = null;

    if (!isAdmin) {
      if (!profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Akun Anda belum memiliki cabang default.' },
          { status: 403 },
        );
      }
      if (requestedGudangId && requestedGudangId !== profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Tidak diizinkan mencetak ke cabang lain.' },
          { status: 403 },
        );
      }
      effectiveGudangId = profile.default_gudang_id;
    } else {
      effectiveGudangId = requestedGudangId || profile.default_gudang_id;
      if (!effectiveGudangId) {
        const { data: defaultGudang } = await supabase
          .from('gudang')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();

        if (defaultGudang?.id) {
          effectiveGudangId = defaultGudang.id;
        } else {
          const { data: firstGudang } = await supabase
            .from('gudang')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          effectiveGudangId = firstGudang?.id ?? null;
        }
      }
    }

    if (!effectiveGudangId) {
      return NextResponse.json(
        { error: 'gudang_id wajib ditentukan dan tidak ada gudang aktif' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        template_id,
        gudang_id: effectiveGudangId,
        payload_json,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Create print job error:', error);
      return NextResponse.json({ error: 'Gagal membuat antrean cetak' }, { status: 400 });
    }

    return NextResponse.json({ job: data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
