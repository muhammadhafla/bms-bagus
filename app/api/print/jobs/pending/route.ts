import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    
    // Polling endpoint for POS to fetch pending jobs along with their templates
    const { data, error } = await supabase
      .from('print_jobs')
      .select(`
        *,
        label_templates (
          name,
          language,
          content_json
        )
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ jobs: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
