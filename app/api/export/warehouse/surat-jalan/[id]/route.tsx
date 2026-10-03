import React from 'react';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

  // 2. Client query data (service role jika tersedia, fallback ke supabaseAuth)
  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabaseAuth;
  
  try {
    const { data, error } = await supabase
      .from('transfer_stok')
      .select('*, gudang_asal:gudang!transfer_stok_gudang_asal_id_fkey(nama), gudang_tujuan:gudang!transfer_stok_gudang_tujuan_id_fkey(nama), items:transfer_stok_items(*, inventory:inventory(nama_barang))')
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
