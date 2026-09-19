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
        <Text style={{ fontSize: 12 }}>ID Transfer: {data.id}</Text>
        <Text style={{ fontSize: 12 }}>Tanggal: {data.tanggal_transfer}</Text>
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
          <Text style={styles.cell}>{item.barang?.nama_barang || item.id_barang}</Text>
          <Text style={styles.cell}>{item.qty}</Text>
          <Text style={styles.cell}>{item.keterangan || '-'}</Text>
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
      .select('*, gudang_asal:id_gudang_asal(nama), gudang_tujuan:id_gudang_tujuan(nama), items:transfer_stok_items(*, barang:id_barang(nama_barang))')
      .eq('id', id)
      .single();

    if (error || !data) {
      return new NextResponse('Data tidak ditemukan', { status: 404 });
    }

    const stream = await renderToStream(<SuratJalanPDF data={data} />);
    
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Surat_Jalan_${id}.pdf"`
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
