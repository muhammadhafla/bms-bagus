import React from 'react';
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabase'; // Using the public client for read is fine if RLS allows it

const styles = StyleSheet.create({
  page: { flexDirection: 'column', padding: 30 },
  section: { margin: 10, padding: 10, flexGrow: 1 },
  header: { fontSize: 18, marginBottom: 10, fontWeight: 'bold' },
  row: { flexDirection: 'row', borderBottom: '1px solid #EEE', paddingVertical: 5 },
  cell: { flex: 1, fontSize: 10 }
});

const SuratJalanPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text>SURAT JALAN / TRANSFER STOK</Text>
      </View>
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 12 }}>ID Transfer: {data.nomor_transfer || data.id}</Text>
        <Text style={{ fontSize: 12 }}>Tanggal: {new Date(data.tanggal_kirim || data.created_at).toLocaleDateString('id-ID')}</Text>
        <Text style={{ fontSize: 12 }}>Asal: {data.gudang_asal?.nama}</Text>
        <Text style={{ fontSize: 12 }}>Tujuan: {data.gudang_tujuan?.nama}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={{ ...styles.cell, fontWeight: 'bold' }}>Barang</Text>
        <Text style={{ ...styles.cell, fontWeight: 'bold' }}>Qty</Text>
        <Text style={{ ...styles.cell, fontWeight: 'bold' }}>Keterangan</Text>
      </View>
      
      {data.items?.map((item: any, i: number) => (
        <View style={styles.row} key={i}>
          <Text style={styles.cell}>{item.inventory?.nama_barang || item.inventory_id}</Text>
          <Text style={styles.cell}>{item.qty_kirim}</Text>
          <Text style={styles.cell}>{item.catatan || '-'}</Text>
        </View>
      ))}
      
      <View style={{ marginTop: 50, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View><Text style={{ fontSize: 10 }}>Penerima,</Text></View>
        <View><Text style={{ fontSize: 10 }}>Pengirim,</Text></View>
      </View>
    </Page>
  </Document>
);

export async function GET(request: Request, context: any) {
  // Use context.params in Next.js 15
  const params = await context.params;
  const id = params.id;
  
  try {
    const { data, error } = await supabase
      .from('transfer_stok')
      .select('*, gudang_asal:gudang_asal_id(nama), gudang_tujuan:gudang_tujuan_id(nama), items:transfer_stok_items(*, inventory:inventory_id(nama_barang))')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching data for PDF:', error);
      return new NextResponse('Data tidak ditemukan', { status: 404 });
    }

    const stream = await renderToStream(<SuratJalanPDF data={data} />);
    
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Surat_Jalan_${data.nomor_transfer || id}.pdf"`
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
