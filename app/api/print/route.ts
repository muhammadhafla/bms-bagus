import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    const body = await request.json();
    let { template_id, payload_json, gudang_id } = body;

    if (!template_id || !payload_json) {
      return NextResponse.json(
        { error: 'template_id and payload_json are required' },
        { status: 400 },
      );
    }

    // Graceful fallback jika gudang_id tidak disertakan
    if (!gudang_id) {
      // 1. Coba dari default_gudang_id profil user
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_gudang_id')
        .eq('id', user.id)
        .single();

      if (profile?.default_gudang_id) {
        gudang_id = profile.default_gudang_id;
      } else {
        // 2. Coba dari gudang default sistem (is_default = true)
        const { data: defaultGudang } = await supabase
          .from('gudang')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();

        if (defaultGudang?.id) {
          gudang_id = defaultGudang.id;
        } else {
          // 3. Fallback ke gudang pertama
          const { data: firstGudang } = await supabase
            .from('gudang')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          gudang_id = firstGudang?.id;
        }
      }
    }

    if (!gudang_id) {
      return NextResponse.json(
        { error: 'gudang_id is required and no active warehouse found' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        template_id,
        gudang_id,
        payload_json,
        status: 'Pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ job: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
