import React from 'react';
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabase';

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
  
  try {
    const { data, error } = await supabase
      .from('retur_pembelian')
      .select('*, supplier:id_supplier(nama), items:retur_pembelian_items(*, barang:id_barang(nama_barang))')
      .eq('id', id)
      .single();

    if (error || !data) {
      return new NextResponse('Data tidak ditemukan', { status: 404 });
    }

    const returnData = {
      id: data.id,
      tanggal: data.tanggal,
      supplier_nama: data.supplier?.nama || '-',
      note: data.catatan,
      items: data.items?.map((item:any) => ({
        nama_barang: item.barang?.nama_barang,
        nomor_nota: item.nomor_nota,
        tanggal_pembelian: item.tanggal_pembelian,
        qty: item.qty,
        harga_beli: item.harga_beli,
        diskon: item.diskon,
        harga_final: item.harga_final
      })) || [],
      total: data.total
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
