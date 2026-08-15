import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    const body = await request.json();
    const { template_id, payload_json } = body;

    if (!template_id || !payload_json) {
      return NextResponse.json(
        { error: 'template_id and payload_json are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .insert({
        template_id,
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
