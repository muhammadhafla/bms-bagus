import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoles, createAdminClient } from '@/lib/api/auth-guard';

export async function GET(request: Request) {
  try {
    const { profile, error: authError } = await verifyRoles(request, [
      'admin',
      'kepala_cabang',
      'kepala_gudang',
      'staff_gudang',
      'kasir',
    ]);
    if (authError || !profile) return authError!;

    const { searchParams } = new URL(request.url);
    const requestedGudangId = searchParams.get('gudang_id');

    if (requestedGudangId && !z.uuid().safeParse(requestedGudangId).success) {
      return NextResponse.json({ error: 'Format gudang_id tidak valid' }, { status: 400 });
    }

    const isAdmin = profile.roles.includes('admin');
    const supabase = createAdminClient();
    let effectiveGudangId: string | null = requestedGudangId;

    if (!isAdmin) {
      if (!profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Akun Anda belum memiliki cabang default.' },
          { status: 403 },
        );
      }
      if (requestedGudangId && requestedGudangId !== profile.default_gudang_id) {
        return NextResponse.json(
          { error: 'Forbidden. Tidak diizinkan membaca antrean cabang lain.' },
          { status: 403 },
        );
      }
      effectiveGudangId = profile.default_gudang_id;
    } else if (!effectiveGudangId) {
      effectiveGudangId = profile.default_gudang_id;
      if (!effectiveGudangId) {
        const { data: defaultGudang } = await supabase
          .from('gudang')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();
        effectiveGudangId = defaultGudang?.id ?? null;
      }
    }

    if (!effectiveGudangId) {
      return NextResponse.json(
        { error: 'Parameter gudang_id wajib ditentukan' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .select(
        `
        *,
        label_templates (
          name,
          language,
          content_json
        ),
        gudang (
          id,
          nama,
          kode_gudang
        )
      `,
      )
      .eq('status', 'Pending')
      .eq('gudang_id', effectiveGudangId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch pending print jobs error:', error);
      return NextResponse.json({ error: 'Gagal mengambil antrean cetak' }, { status: 400 });
    }

    return NextResponse.json({ jobs: data });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
