import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const lokasiId = searchParams.get('lokasiId');
  const statusHadir = searchParams.get('statusHadir');

  try {
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
