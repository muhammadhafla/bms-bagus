import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const lokasiId = searchParams.get('lokasiId');
  const statusHadir = searchParams.get('statusHadir');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Verifikasi sesi login pengguna menggunakan cookies
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized: Silakan login terlebih dahulu.', { status: 401 });
  }

  // 2. Client query data
  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabaseAuth;

  try {
    // 3. Verifikasi RBAC: Hanya Admin, Finance, atau Kepala Cabang
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();

    const requesterRoles: string[] = requesterProfile?.roles || [];
    const allowedRoles = ['admin', 'finance', 'kepala_cabang', 'kepala_gudang'];
    const isAllowed = allowedRoles.some((r) => requesterRoles.includes(r));

    if (!isAllowed) {
      return new NextResponse('Forbidden: Anda tidak memiliki izin untuk mengunduh laporan kehadiran.', {
        status: 403,
      });
    }

    let query = supabase
      .from('kehadiran')
      .select('*, profiles(nama), lokasi_masuk:lokasi_masuk_id(nama), lokasi_pulang:lokasi_pulang_id(nama)')
      .order('tanggal', { ascending: false });

    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', endDate);
    if (lokasiId && lokasiId !== 'all') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(lokasiId)) {
        return new NextResponse('Invalid lokasiId format', { status: 400 });
      }
      query = query.or(`lokasi_masuk_id.eq.${lokasiId},lokasi_pulang_id.eq.${lokasiId}`);
    }
    if (statusHadir && statusHadir !== 'all') {
      query = query.eq('status_hadir', statusHadir);
    }

    const { data: exportList, error } = await query;

    if (error || !exportList) {
      return new NextResponse('Gagal mengambil data untuk ekspor', { status: 500 });
    }

    const headers = [
      'Tanggal',
      'Nama Karyawan',
      'Status Hadir',
      'Lokasi Masuk',
      'Lokasi Pulang',
      'Jam Masuk',
      'Jam Pulang (Tercatat)',
      'Jam Pulang (Aktual)',
      'Menit Kerja',
      'Menit Telat',
      'Pulang Awal (Status)',
      'Pulang Awal (Menit)',
      'Alasan Pulang Awal',
      'Lembur Aktual (Menit)',
      'Lembur Disetujui (Menit)',
      'Status Lembur'
    ];

    const rows = exportList.map(item => [
      item.tanggal,
      item.profiles?.nama || 'Unknown',
      item.status_hadir,
      item.lokasi_masuk?.nama || '-',
      item.lokasi_pulang?.nama || '-',
      item.waktu_masuk ? format(new Date(item.waktu_masuk), 'HH:mm') : '-',
      item.waktu_pulang ? format(new Date(item.waktu_pulang), 'HH:mm') : '-',
      item.waktu_pulang_aktual ? format(new Date(item.waktu_pulang_aktual), 'HH:mm') : '-',
      item.menit_kerja || 0,
      item.menit_telat || 0,
      item.status_pulang_awal || 'tidak_ada',
      item.menit_pulang_awal || 0,
      item.alasan_pulang_awal || '-',
      item.menit_lembur_aktual || 0,
      item.menit_lembur_disetujui || 0,
      item.status_lembur
    ]);

    const csvStr = Papa.unparse({
      fields: headers,
      data: rows
    });

    const headersList = new Headers();
    headersList.set('Content-Type', 'text/csv; charset=utf-8');
    headersList.set('Content-Disposition', `attachment; filename="rekap_kehadiran_${format(new Date(), 'yyyyMMdd_HHmm')}.csv"`);

    return new NextResponse('\uFEFF' + csvStr, {
      status: 200,
      headers: headersList
    });
  } catch (err: any) {
    return new NextResponse('Terjadi kesalahan sistem: ' + err.message, { status: 500 });
  }
}
