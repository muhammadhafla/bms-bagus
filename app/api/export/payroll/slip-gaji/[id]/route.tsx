import React from 'react';
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabase';

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
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
};

const SlipGajiPDF = ({ slip }: { slip: any }) => {
  const totalPotongan = Number(slip.total_denda_telat) + Number(slip.total_potongan_kasbon);
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
              <Text>: {Number(slip.total_jam_telat).toFixed(1)} Jam</Text>
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
            <Text style={styles.cellCol3}>{formatCurrency(Number(slip.total_gaji_harian) + Number(slip.total_gaji_lembur))}</Text>
          </View>

          <View style={styles.tableRow}><Text style={styles.tableSection}>POTONGAN</Text></View>
          <View style={styles.tableRow}>
            <Text style={styles.cellCol1}>Potongan Kasbon</Text>
            <Text style={styles.cellCol2}>{formatCurrency(slip.total_potongan_kasbon)}</Text>
            <Text style={styles.cellCol3}>{formatCurrency(slip.total_potongan_kasbon)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.cellCol1}>Denda Keterlambatan</Text>
            <Text style={styles.cellCol2}>{formatCurrency(slip.total_denda_telat)}</Text>
            <Text style={styles.cellCol3}>{formatCurrency(totalPotongan)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={{ ...styles.cellCol1, fontWeight: 'bold' }}>TOTAL GAJI BERSIH</Text>
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
  // Use context.params in Next.js 15
  const params = await context.params;
  const id = params.id;
  
  try {
    const { data: slip, error } = await supabase
      .from('payroll_gaji')
      .select('*, profiles:user_id(nama)')
      .eq('id', id)
      .single();

    if (error || !slip) {
      return new NextResponse('Data slip gaji tidak ditemukan', { status: 404 });
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
