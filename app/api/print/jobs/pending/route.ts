import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    let gudangId = searchParams.get('gudang_id');

    // Graceful fallback jika gudang_id tidak disertakan oleh klien lama
    if (!gudangId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_gudang_id')
        .eq('id', user.id)
        .single();

      if (profile?.default_gudang_id) {
        gudangId = profile.default_gudang_id;
      } else {
        const { data: defaultGudang } = await supabase
          .from('gudang')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();

        if (defaultGudang?.id) {
          gudangId = defaultGudang.id;
        }
      }
    }

    if (!gudangId) {
      return NextResponse.json(
        { error: 'gudang_id parameter is required' },
        { status: 400 },
      );
    }

    // Polling endpoint for POS to fetch pending jobs along with their templates
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
      .eq('gudang_id', gudangId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ jobs: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
