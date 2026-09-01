import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push';
import { createAdminClient, verifyAuth } from '@/lib/api/auth-guard';

export async function POST(request: Request) {
  try {
    const secretHeader = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SECRET;

    let isAuthorized = false;
    if (expectedSecret && secretHeader === expectedSecret) {
      isAuthorized = true;
    } else {
      const { user } = await verifyAuth(request);
      if (user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (!body.kehadiran_id || !body.user_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Cari user yang memiliki role admin/owner/manajer
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'owner', 'super_admin', 'manajer']);
      
    if (error || !admins) {
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
    }
    
    // Ambil nama pemohon
    const { data: pemohon } = await supabase
      .from('profiles')
      .select('nama')
      .eq('id', body.user_id)
      .single();
      
    const nama = pemohon?.nama || 'Karyawan';
    const jamPulangAktual = body.jam_pulang_aktual || '';
    const jamPulangJadwal = body.jam_pulang_jadwal || '';
    const alasan = body.alasan ? ` Alasan: ${body.alasan}` : '';

    const payload = {
      title: 'Pulang Lebih Awal',
      body: `${nama} absen pulang pk ${jamPulangAktual} (Jadwal: ${jamPulangJadwal}).${alasan}`,
      url: '/admin/payroll/kehadiran?tab=pulang_awal'
    };

    // Kirim notif ke semua admin
    const adminIds = admins.map(a => a.id);
    const promises = adminIds.map(adminId => sendPushNotification(adminId, payload));
    
    await Promise.all(promises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pulang awal notification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
