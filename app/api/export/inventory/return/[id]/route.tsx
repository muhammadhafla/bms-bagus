import React from 'react';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: { flexDirection: 'column', padding: 30, fontFamily: 'Helvetica', fontSize: 10 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  subheader: { fontSize: 10, color: '#666', marginBottom: 2 },
  label: { fontWeight: 'bold', fontSize: 10, marginBottom: 2 },
  table: { width: '100%', marginTop: 15, marginBottom: 15 },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #EEE', paddingVertical: 5 },
  tableHeader: { backgroundColor: '#f0f0f0', fontWeight: 'bold', flexDirection: 'row', paddingVertical: 5 },
  cellCol1: { flex: 2 },
  cellCol2: { flex: 1 },
  cellCol3: { flex: 1 },
  cellCol4: { flex: 0.5, textAlign: 'right' },
  cellCol5: { flex: 1, textAlign: 'right' },
  cellCol6: { flex: 1, textAlign: 'right' },
  signatures: { flexDirection: 'row', marginTop: 40 },
  signCol: { width: '50%', textAlign: 'center' },
  signLine: { marginTop: 40, fontSize: 9 },
  signTitle: { fontSize: 8 }
});

const ReturnPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>SURAT RETUR BARANG</Text>
      <Text style={styles.subheader}>Nomor: {(data.id || '').slice(0, 8).toUpperCase()}</Text>
      <Text style={{ ...styles.subheader, marginBottom: 15 }}>Tanggal: {data.tanggal}</Text>

      <Text style={styles.label}>Kepada Yth:</Text>
      <Text style={{ marginBottom: 15 }}>{data.supplier_nama}</Text>

      {data.note && (
        <Text style={{ fontStyle: 'italic', marginBottom: 15 }}>Catatan: {data.note}</Text>
      )}

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.cellCol1}>Nama Barang</Text>
          <Text style={styles.cellCol2}>No. PO</Text>
          <Text style={styles.cellCol3}>Tgl Beli</Text>
          <Text style={styles.cellCol4}>Qty</Text>
          <Text style={styles.cellCol5}>Harga</Text>
          <Text style={styles.cellCol6}>Subtotal</Text>
        </View>
        {data.items?.map((item: any, i: number) => {
          const harga = item.harga_beli - (item.diskon || 0);
          return (
            <View style={styles.tableRow} key={i}>
              <Text style={{ ...styles.cellCol1, fontSize: 9 }}>{item.nama_barang}</Text>
              <Text style={{ ...styles.cellCol2, fontSize: 9 }}>{item.nomor_nota || '-'}</Text>
              <Text style={{ ...styles.cellCol3, fontSize: 9 }}>{item.tanggal_pembelian || '-'}</Text>
              <Text style={{ ...styles.cellCol4, fontSize: 9 }}>{item.qty}</Text>
              <Text style={{ ...styles.cellCol5, fontSize: 9 }}>Rp {harga.toLocaleString('id-ID')}</Text>
              <Text style={{ ...styles.cellCol6, fontSize: 9 }}>Rp {item.harga_final?.toLocaleString('id-ID')}</Text>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 12 }}>
          TOTAL RETURN: Rp {data.total?.toLocaleString('id-ID')}
        </Text>
      </View>

      <View style={styles.signatures}>
        <View style={styles.signCol}>
          <Text>Penerima Barang,</Text>
          <Text style={styles.signLine}>___________________</Text>
          <Text style={styles.signTitle}>Nama & Tanda Tangan</Text>
        </View>
        <View style={styles.signCol}>
          <Text>Dibuat Oleh,</Text>
          <Text style={styles.signLine}>___________________</Text>
          <Text style={styles.signTitle}>Nama & Tanda Tangan</Text>
        </View>
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
      .from('pembelian_return')
      .select('*, items:pembelian_return_items(*, inventory:inventory(nama_barang))')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching return data:', error);
      return new NextResponse('Data tidak ditemukan', { status: 404 });
    }

    // Calculate total from items
    const total = data.items?.reduce((sum: number, item: any) => sum + (item.harga_final * item.qty), 0) || 0;

    const returnData = {
      id: data.id,
      tanggal: new Date(data.tanggal).toLocaleDateString('id-ID'),
      supplier_nama: data.supplier_nama || '-',
      note: data.note,
      items: data.items?.map((item:any) => ({
        nama_barang: item.inventory?.nama_barang || item.nama_barang,
        nomor_nota: item.pembelian_id || '-',
        tanggal_pembelian: '-',
        qty: item.qty,
        harga_beli: item.harga_beli,
        diskon: item.diskon,
        harga_final: item.harga_final
      })) || [],
      total: total
    };

    const stream = await renderToStream(<ReturnPDF data={returnData} />);
    
    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Surat_Retur_${id}.pdf"`
      },
    });
  } catch (err: any) {
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
