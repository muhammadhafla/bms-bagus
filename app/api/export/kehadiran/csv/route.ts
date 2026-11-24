import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { z } from 'zod';
import Papa from 'papaparse';
import { createAdminClient } from '@/lib/api/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const kehadiranExportQuerySchema = z.object({
  startDate: z.string().regex(DATE_REGEX, 'Format startDate tidak valid').optional(),
  endDate: z.string().regex(DATE_REGEX, 'Format endDate tidak valid').optional(),
  lokasiId: z.union([z.literal('all'), z.uuid('Invalid lokasiId format')]).optional(),
  statusHadir: z.string().trim().max(50).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = kehadiranExportQuerySchema.safeParse({
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    lokasiId: searchParams.get('lokasiId') || undefined,
    statusHadir: searchParams.get('statusHadir') || undefined,
  });

  if (!parsedQuery.success) {
    return new NextResponse(parsedQuery.error.issues[0]?.message || 'Parameter tidak valid', {
      status: 400,
    });
  }

  const { startDate, endDate, lokasiId, statusHadir } = parsedQuery.data;

  // 1. Verifikasi sesi login pengguna menggunakan cookies
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized: Silakan login terlebih dahulu.', { status: 401 });
  }

  // 2. Client query data
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabaseAuth;

  try {
    // 3. Verifikasi RBAC: Hanya Admin, Finance, atau Kepala Cabang
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();

    const requesterRoles: string[] = requesterProfile?.roles || [];
    const allowedRoles = ['admin', 'finance'];
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

    const rows = exportList.map((item) =>
      [
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
        item.status_lembur,
      ].map(sanitizeCsvCell),
    );

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
  } catch (err: unknown) {
    console.error('Export kehadiran CSV error:', err);
    return new NextResponse('Terjadi kesalahan sistem saat mengekspor data.', { status: 500 });
  }
}
