import React from 'react';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  header: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  infoBox: { flexDirection: 'row', marginBottom: 20 },
  infoCol: { width: '50%', flexDirection: 'column' },
  infoRow: { flexDirection: 'row', marginBottom: 5 },
  label: { width: 80, fontWeight: 'bold', color: '#444' },
  labelRight: { width: 100, fontWeight: 'bold', color: '#444' },
  table: { width: '100%', marginBottom: 30 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #ccc' },
  tableHeader: { fontWeight: 'bold', backgroundColor: '#eeeeee', padding: 5, flexDirection: 'row' },
  tableSection: { fontWeight: 'bold', backgroundColor: '#f9f9f9', padding: 5, flex: 1 },
  cellCol1: { flex: 2, padding: 5 },
  cellCol2: { flex: 1, padding: 5, textAlign: 'right' },
  cellCol3: { flex: 1, padding: 5, textAlign: 'right' },
  signatures: { flexDirection: 'row', marginTop: 30 },
  signCol: { width: '50%', textAlign: 'center' },
  signName: { fontWeight: 'bold', marginTop: 50 },
  signTitle: { fontSize: 10, color: '#666' }
});

const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rp 0';
  if (num < 0) {
    return `-Rp ${Math.abs(num).toLocaleString('id-ID')}`;
  }
  return `Rp ${num.toLocaleString('id-ID')}`;
};

const SlipGajiPDF = ({ slip }: { slip: any }) => {
  const totalPotongan = Number(slip.total_denda_telat || 0) + Number(slip.total_potongan_kasbon || 0);
  const isMinus = Number(slip.gaji_bersih) < 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>SLIP GAJI KARYAWAN</Text>
        
        <View style={styles.infoBox}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nama</Text>
              <Text>: {slip.profiles?.nama || 'Unknown'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Periode</Text>
              <Text>: {slip.periode_bulan}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.labelRight}>Total Kehadiran</Text>
              <Text>: {slip.total_hari_hadir} Hari</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.labelRight}>Total Jam Telat</Text>
              <Text>: {Number(slip.total_jam_telat || 0).toFixed(1)} Jam</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellCol1}>KETERANGAN</Text>
            <Text style={styles.cellCol2}>JUMLAH</Text>
            <Text style={styles.cellCol3}>SUBTOTAL</Text>
          </View>

          <View style={styles.tableRow}><Text style={styles.tableSection}>PENDAPATAN</Text></View>
          <View style={styles.tableRow}>
            <Text style={styles.cellCol1}>Gaji Pokok (Hadir)</Text>
            <Text style={styles.cellCol2}>{formatCurrency(slip.total_gaji_harian)}</Text>
            <Text style={styles.cellCol3}>{formatCurrency(slip.total_gaji_harian)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellCol1}>Uang Lembur</Text>
            <Text style={styles.cellCol2}>{formatCurrency(slip.total_gaji_lembur)}</Text>
            <Text style={styles.cellCol3}>{formatCurrency(Number(slip.total_gaji_harian || 0) + Number(slip.total_gaji_lembur || 0))}</Text>
          </View>

          <View style={styles.tableRow}><Text style={styles.tableSection}>POTONGAN & PENCAIRAN</Text></View>
          <View style={styles.tableRow}>
            <Text style={styles.cellCol1}>Pencairan / Kasbon Diambil</Text>
            <Text style={styles.cellCol2}>{formatCurrency(slip.total_potongan_kasbon)}</Text>
            <Text style={styles.cellCol3}>{formatCurrency(slip.total_potongan_kasbon)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellCol1}>Denda Keterlambatan</Text>
            <Text style={styles.cellCol2}>{formatCurrency(slip.total_denda_telat)}</Text>
            <Text style={styles.cellCol3}>{formatCurrency(totalPotongan)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={{ ...styles.cellCol1, fontWeight: 'bold' }}>
              {isMinus ? 'TANGGUNGAN KASBON (MINUS)' : 'TOTAL SISA GAJI BERSIH'}
            </Text>
            <Text style={styles.cellCol2}></Text>
            <Text style={{ ...styles.cellCol3, fontWeight: 'bold' }}>{formatCurrency(slip.gaji_bersih)}</Text>
          </View>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signCol}>
            <Text>Diterima Oleh,</Text>
            <Text style={styles.signName}>( {slip.profiles?.nama || '___________________'} )</Text>
            <Text style={styles.signTitle}>Karyawan</Text>
          </View>
          <View style={styles.signCol}>
            <Text>Dibuat Oleh,</Text>
            <Text style={styles.signName}>( ___________________ )</Text>
            <Text style={styles.signTitle}>Admin / HRD</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export async function GET(request: Request, context: any) {
  const params = await context.params;
  const id = params.id;
  const { searchParams } = new URL(request.url);
  const periode = searchParams.get('periode');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Verifikasi sesi login pengguna yang meminta
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

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
    // Cek peran pengguna peminta (apakah Admin)
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .maybeSingle();

    const requesterRoles: string[] = requesterProfile?.roles || [];
    const isAdminOrFinance = requesterRoles.includes('admin') || requesterRoles.includes('finance');

    // 3. Cari berdasarkan ID slip_gaji
    let { data: slip, error } = await supabase
      .from('slip_gaji')
      .select('*, profiles:user_id(nama)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Export Slip Error]:', error);
      return new NextResponse(`Error query slip_gaji: ${error.message}`, { status: 500 });
    }

    // 4. Fallback: jika id yang dikirim adalah user_id
    if (!slip) {
      let userQuery = supabase
        .from('slip_gaji')
        .select('*, profiles:user_id(nama)')
        .eq('user_id', id);

      if (periode) {
        userQuery = userQuery.eq('periode_bulan', periode);
      } else {
        userQuery = userQuery.order('created_at', { ascending: false });
      }

      const userRes = await userQuery.limit(1).maybeSingle();
      if (userRes.error) {
        console.error('[Export Slip UserRes Error]:', userRes.error);
      }
      slip = userRes.data;
    }

    if (!slip) {
      return new NextResponse('Data slip gaji tidak ditemukan', { status: 404 });
    }

    // 5. Validasi Hak Akses (Anti-IDOR): Hanya Admin/Finance atau Karyawan Pemilik Slip
    if (!isAdminOrFinance && slip.user_id !== user.id) {
      return new NextResponse('Forbidden: Anda tidak memiliki izin untuk melihat slip gaji ini.', { status: 403 });
    }

    const stream = await renderToStream(<SlipGajiPDF slip={slip} />);
    
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Slip_Gaji_${slip.profiles?.nama || 'Karyawan'}_${slip.periode_bulan}.pdf"`
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
