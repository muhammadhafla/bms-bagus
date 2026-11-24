import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoles, createAdminClient } from '@/lib/api/auth-guard';

const updatePrintJobSchema = z.object({
  status: z.enum(['Pending', 'Printing', 'Done', 'Failed']),
  device_name: z.string().trim().max(120).nullable().optional(),
  error_message: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profile, error: authError } = await verifyRoles(request, [
      'admin',
      'kepala_cabang',
      'kepala_gudang',
      'staff_gudang',
      'kasir',
    ]);
    if (authError || !profile) return authError!;

    const rawId = (await params).id;
    const idParsed = z.uuid().safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'Print job ID tidak valid' }, { status: 400 });
    }
    const id = idParsed.data;

    const rawBody = await request.json().catch(() => null);
    const parsed = updatePrintJobSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Payload update print job tidak valid' },
        { status: 400 },
      );
    }

    const { status, device_name, error_message } = parsed.data;
    const supabase = createAdminClient();

    const { data: existingJob, error: fetchError } = await supabase
      .from('print_jobs')
      .select('id, gudang_id, status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch print job error:', fetchError);
      return NextResponse.json({ error: 'Gagal memeriksa antrean cetak' }, { status: 400 });
    }

    if (!existingJob) {
      return NextResponse.json({ error: 'Antrean cetak tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = profile.roles.includes('admin');
    if (!isAdmin) {
      if (!profile.default_gudang_id || existingJob.gudang_id !== profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Tidak diizinkan mengubah antrean cabang lain.' },
          { status: 403 },
        );
      }
    }

    const updateData: Record<string, unknown> = { status };
    if (device_name !== undefined) {
      updateData.device_name = device_name;
    }
    if (error_message !== undefined) {
      updateData.error_message = error_message;
    }
    if (status === 'Done') {
      updateData.printed_at = new Date().toISOString();
    }
    if (status === 'Pending') {
      updateData.device_name = null;
      updateData.error_message = null;
      updateData.printed_at = null;
    }

    let query = supabase.from('print_jobs').update(updateData).eq('id', id);
    if (status === 'Printing') {
      query = query.eq('status', 'Pending');
    }

    const { data, error } = await query
      .select(
        `
        *,
        gudang (
          id,
          nama,
          kode_gudang
        )
      `,
      )
      .maybeSingle();

    if (error) {
      console.error('Update print job error:', error);
      return NextResponse.json({ error: 'Gagal memperbarui status cetak' }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Antrean cetak sudah diklaim oleh perangkat lain' },
        { status: 409 },
      );
    }

    return NextResponse.json({ job: data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
