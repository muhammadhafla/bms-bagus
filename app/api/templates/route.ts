import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoles, verifyAdmin, createAdminClient } from '@/lib/api/auth-guard';
import type { Json } from '@/types/supabase';

export const dynamic = 'force-dynamic';

const jsonFieldSchema = z.custom<Json>(() => true);

const templateBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  language: z.string().trim().min(1).max(30),
  content_json: z.union([
    z.record(z.string(), jsonFieldSchema),
    z.array(jsonFieldSchema),
    z.string().min(1),
  ]),
  active: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    const { error: authError } = await verifyRoles(request, [
      'admin',
      'kepala_cabang',
      'kepala_gudang',
      'staff_gudang',
      'kasir',
      'finance',
    ]);
    if (authError) return authError;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('label_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch label templates error:', error);
      return NextResponse.json({ error: 'Gagal mengambil daftar template' }, { status: 400 });
    }

    return NextResponse.json({ templates: data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error: authError } = await verifyAdmin(request);
    if (authError) return authError;

    const rawBody = await request.json().catch(() => null);
    const parsed = templateBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Data template tidak valid' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('label_templates')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      console.error('Create label template error:', error);
      return NextResponse.json({ error: 'Gagal menyimpan template' }, { status: 400 });
    }

    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
