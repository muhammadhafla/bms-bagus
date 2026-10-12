import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const supabase = createAdminClient();
    const body = await request.json();
    const { status, device_name, error_message } = body;

    if (!status || !['Pending', 'Printing', 'Done', 'Failed'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 });
    }

    const updateData: any = { status };
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
      // Jika retry / reset antrean dari BMS UI
      updateData.device_name = null;
      updateData.error_message = null;
      updateData.printed_at = null;
    }

    const { data, error } = await supabase
      .from('print_jobs')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        gudang (
          id,
          nama,
          kode_gudang
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ job: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
