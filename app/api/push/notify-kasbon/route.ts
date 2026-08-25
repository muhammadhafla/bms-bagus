import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';
import { createAdminClient } from '@/lib/api/auth-guard';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi basic (sebaiknya gunakan webhook secret di header)
    if (!body.kasbon_id || !body.user_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Cari user yang memiliki role 'admin' atau semacamnya dari tabel profiles
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'owner', 'super_admin', 'manajer']);
      
    if (error || !admins) {
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
    }
    
    // Ambil nama pemohon (opsional)
    const { data: pemohon } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', body.user_id)
      .single();
      
    const nama = pemohon?.full_name || 'Karyawan';
    const nominalFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(body.nominal);

    const payload = {
      title: 'Pengajuan Kasbon Baru',
      body: `${nama} mengajukan kasbon sebesar ${nominalFormat}`,
      url: '/admin/payroll/kasbon'
    };

    // Kirim notif ke semua admin
    const adminIds = admins.map(a => a.id);
    const promises = adminIds.map(adminId => sendPushNotification(adminId, payload));
    
    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
