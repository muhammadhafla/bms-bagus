import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin, createAdminClient } from '@/lib/api/auth-guard';
import type { Json } from '@/types/supabase';

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authError } = await verifyAdmin(request);
    if (authError) return authError;

    const rawId = (await params).id;
    const idParsed = z.uuid().safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Template ID tidak valid' }, { status: 400 });
    }
    const id = idParsed.data;

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
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update label template error:', error);
      return NextResponse.json({ error: 'Gagal memperbarui template' }, { status: 400 });
    }

    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authError } = await verifyAdmin(request);
    if (authError) return authError;

    const rawId = (await params).id;
    const idParsed = z.uuid().safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Template ID tidak valid' }, { status: 400 });
    }
    const id = idParsed.data;

    const supabase = createAdminClient();
    const { count, error: countError } = await supabase
      .from('print_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id);

    if (countError) {
      console.error('Count template dependencies error:', countError);
      return NextResponse.json({ error: 'Gagal memeriksa dependensi template' }, { status: 400 });
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template. It is being used by existing print jobs.' },
        { status: 400 },
      );
    }

    const { error } = await supabase.from('label_templates').delete().eq('id', id);

    if (error) {
      console.error('Delete label template error:', error);
      return NextResponse.json({ error: 'Gagal menghapus template' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
