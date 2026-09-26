import React from 'react';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  header: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  infoBox: { flexDirection: 'row', marginBottom: 15 },
  infoCol: { flex: 1 },
  table: { width: '100%' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #ccc', paddingVertical: 5 },
  tableHeader: { fontWeight: 'bold', backgroundColor: '#eeeeee', padding: 5, flexDirection: 'row' },
  cellCol1: { flex: 1, paddingHorizontal: 5 }, // Tanggal
  cellCol2: { flex: 2, paddingHorizontal: 5 }, // Keterangan
  cellCol3: { flex: 1, paddingHorizontal: 5 }, // Status
  cellCol4: { flex: 1, paddingHorizontal: 5, textAlign: 'right' }, // Nominal
});

const formatCurrency = (amount: number | string) => `Rp ${Number(amount).toLocaleString('id-ID')}`;

const MutasiPDF = ({ mutasiData, profileName, saldo }: { mutasiData: any[], profileName: string, saldo: number }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>RIWAYAT MUTASI KARYAWAN</Text>
      
      <View style={styles.infoBox}>
        <View style={styles.infoCol}>
          <Text>Nama: {profileName}</Text>
        </View>
        <View style={{ ...styles.infoCol, textAlign: 'right' }}>
          <Text style={{ fontWeight: 'bold' }}>
            Total Saldo/Tanggungan: {saldo < 0 ? '-' : ''}{formatCurrency(Math.abs(saldo))}
          </Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.cellCol1}>Tanggal</Text>
          <Text style={styles.cellCol2}>Keterangan</Text>
          <Text style={styles.cellCol3}>Status</Text>
          <Text style={styles.cellCol4}>Nominal</Text>
        </View>
        {mutasiData.map((item, i) => {
          const dateStr = new Date(item.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
          const isKredit = item.jenis === 'kredit';
          return (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.cellCol1}>{dateStr}</Text>
              <Text style={styles.cellCol2}>{item.keterangan || '-'}</Text>
              <Text style={styles.cellCol3}>{item.status}</Text>
              <Text style={{ ...styles.cellCol4, color: isKredit ? '#16a34a' : '#000000' }}>
                {isKredit ? '' : '-'}{formatCurrency(item.nominal)}
              </Text>
            </View>
          );
        })}
      </View>
    </Page>
  </Document>
);

export async function GET(request: Request, context: any) {
  const params = await context.params;
  const userId = params.id;
  
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const saldoParam = searchParams.get('saldo');
  const saldo = saldoParam ? Number(saldoParam) : 0;

  // 1. Inisialisasi client Supabase dengan Cookie sesi login
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
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
  
  try {
    // 2. Verifikasi status login
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized: Silakan login terlebih dahulu.', { status: 401 });
    }

    // 3. Cek peran pengguna (apakah Admin)
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();

    const requesterRoles: string[] = requesterProfile?.roles || [];
    const isAdmin = requesterRoles.includes('admin');

    // 4. Validasi Anti-IDOR: hanya Admin atau Karyawan pemilik mutasi
    if (!isAdmin && user.id !== userId) {
      return new NextResponse('Forbidden: Anda tidak memiliki izin untuk melihat riwayat mutasi ini.', { status: 403 });
    }

    // 5. Ambil data profil karyawan
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama')
      .eq('id', userId)
      .maybeSingle();

    const profileName = profile?.nama || 'Karyawan';

    // 6. Ambil data mutasi dengan filter tanggal akurat
    let query = supabase
      .from('payroll_mutasi')
      .select('*')
      .eq('user_id', userId)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', `${endDate}T23:59:59.999Z`);

    const { data: mutasiData, error } = await query;

    if (error || !mutasiData) {
      return new NextResponse('Gagal memuat data mutasi: ' + (error?.message || 'Data tidak ditemukan'), { status: 500 });
    }

    const stream = await renderToStream(<MutasiPDF mutasiData={mutasiData} profileName={profileName} saldo={saldo} />);
    
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Riwayat_Mutasi_${profileName.replace(/\s+/g, '_')}.pdf"`
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
