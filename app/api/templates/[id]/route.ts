import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseClient(request: Request) {
  const authHeader = request.headers.get('Authorization');
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const client = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

  return client;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const { name, language, content_json, active } = body;

    if (!name || !language || !content_json) {
      return NextResponse.json({ error: 'Name, language, and content_json are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('label_templates')
      .update({
        name,
        language,
        content_json,
        active: active !== undefined ? active : true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ template: data });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient(request);
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Check if there are dependent print_jobs
    const { count, error: countError } = await supabase
      .from('print_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    if (count && count > 0) {
      return NextResponse.json({ error: 'Cannot delete template. It is being used by existing print jobs.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('label_templates')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
