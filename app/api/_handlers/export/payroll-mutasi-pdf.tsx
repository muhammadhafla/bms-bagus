import React from 'react';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Database } from '@/types/supabase';

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

type PayrollMutasiRow = Database['public']['Tables']['payroll_mutasi']['Row'];

const MutasiPDF = ({ mutasiData, profileName, saldo }: { mutasiData: PayrollMutasiRow[], profileName: string, saldo: number }) => (
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

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const mutasiExportParamsSchema = z.object({
  id: z.uuid('User ID tidak valid'),
  startDate: z.string().regex(DATE_REGEX, 'Format startDate tidak valid').optional(),
  endDate: z.string().regex(DATE_REGEX, 'Format endDate tidak valid').optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { searchParams } = new URL(request.url);
  const parsed = mutasiExportParamsSchema.safeParse({
    id: params.id,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
  });

  if (!parsed.success) {
    return new NextResponse(parsed.error.issues[0]?.message || 'Parameter tidak valid', {
      status: 400,
    });
  }

  const { id: userId, startDate, endDate } = parsed.data;

  // 1. Inisialisasi client Supabase dengan Cookie sesi login
  const supabase = await createServerSupabaseClient();
  
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
    const isAdminOrFinance = requesterRoles.includes('admin') || requesterRoles.includes('finance');

    // 4. Validasi Anti-IDOR: hanya Admin/Finance atau Karyawan pemilik mutasi
    if (!isAdminOrFinance && user.id !== userId) {
      return new NextResponse('Forbidden: Anda tidak memiliki izin untuk melihat riwayat mutasi ini.', { status: 403 });
    }

    // 5. Ambil data profil karyawan
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama')
      .eq('id', userId)
      .maybeSingle();

    const profileName = profile?.nama || 'Karyawan';

    // 6. Ambil saldo bersih terkini dari server (cegah spoof query param ?saldo=)
    const { data: saldoRow } = await supabase
      .from('vw_payroll_saldo')
      .select('total_saldo')
      .eq('user_id', userId)
      .maybeSingle();
    const saldo = Number(saldoRow?.total_saldo ?? 0);

    // 7. Ambil data mutasi dengan filter tanggal akurat
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
      console.error('Export mutasi query error:', error);
      return new NextResponse('Gagal memuat data mutasi', { status: 500 });
    }

    const stream = await renderToStream(<MutasiPDF mutasiData={mutasiData} profileName={profileName} saldo={saldo} />);
    
    return new Response(stream as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Riwayat_Mutasi_${profileName.replace(/\s+/g, '_')}.pdf"`
      },
    });
  } catch (err: unknown) {
    console.error('Export mutasi error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
