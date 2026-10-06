/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import path from 'path';
import fs from 'fs';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { renderToStream } from '@react-pdf/renderer';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { generateCode128DataUrl, generateQrCodeDataUrl } from '@/lib/utils/barcode-generator';

export const dynamic = 'force-dynamic';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1f2937',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
    marginBottom: 12,
  },
  companyBrand: {
    flexDirection: 'column',
    maxWidth: 220,
  },
  logo: {
    height: 38,
    width: 120,
    objectFit: 'contain',
    marginBottom: 4,
  },
  companySubtitle: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  docTitleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 0.5,
  },
  docSubtitle: {
    fontSize: 8.5,
    color: '#4b5563',
    marginTop: 2,
  },
  barcodesWrapper: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  barcode128Img: {
    width: 135,
    height: 38,
    objectFit: 'contain',
  },
  qrCodeImg: {
    width: 44,
    height: 44,
    objectFit: 'contain',
  },
  barcodeCaption: {
    fontSize: 6.5,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  // Info Cards Section
  infoSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#2563eb',
    textTransform: 'uppercase',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbeafe',
    paddingBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  infoLabel: {
    width: 70,
    fontSize: 8,
    color: '#6b7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: '#111827',
    fontWeight: 'bold',
  },
  metaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemLabel: {
    fontSize: 8,
    color: '#1e40af',
  },
  metaItemVal: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  // Table
  table: {
    width: '100%',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontWeight: 'bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colNo: { width: '5%', textAlign: 'center' },
  colBarcode: { width: '18%' },
  colName: { width: '37%' },
  colQty: { width: '12%', textAlign: 'center' },
  colUnit: { width: '8%', textAlign: 'center' },
  colCheck: { width: '10%', textAlign: 'center' },
  colNote: { width: '10%' },
  checkBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 2,
    alignSelf: 'center',
  },
  tableSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    marginTop: 4,
  },
  tableSummaryText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#111827',
  },
  // Paperless Digital Audit Trail Section
  auditSection: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 4,
    marginBottom: 6,
  },
  auditTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  auditBadge: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#047857',
    backgroundColor: '#d1fae5',
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 3,
  },
  auditGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  auditCol: {
    flex: 1,
    paddingRight: 6,
  },
  auditLabel: {
    fontSize: 7,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  auditName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 1,
  },
  auditTime: {
    fontSize: 7,
    color: '#475569',
    marginTop: 1,
  },
  paperlessDisclaimer: {
    fontSize: 7,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
});

interface SuratJalanPDFProps {
  data: any;
  logoDataUrl?: string;
  barcode128Url?: string;
  qrCodeUrl?: string;
}

const SuratJalanPDF = ({
  data,
  logoDataUrl,
  barcode128Url,
  qrCodeUrl,
}: SuratJalanPDFProps) => {
  const totalQtyKirim = (data.items || []).reduce(
    (acc: number, item: any) => acc + (item.qty_kirim || 0),
    0,
  );
  const totalJenisBarang = (data.items || []).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER SECTION */}
        <View style={styles.headerContainer}>
          {/* Logo / Company Brand */}
          <View style={styles.companyBrand}>
            {logoDataUrl ? (
              <Image src={logoDataUrl} style={styles.logo} />
            ) : (
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e3a8a' }}>
                BMS INVENTORY
              </Text>
            )}
            <Text style={styles.companySubtitle}>Logistics & Multi-Warehouse Distribution</Text>
          </View>

          {/* Document Title */}
          <View style={styles.docTitleWrapper}>
            <Text style={styles.docTitle}>SURAT JALAN</Text>
            <Text style={styles.docSubtitle}>TRANSFER STOK ANTAR CABANG</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#2563eb', marginTop: 3 }}>
              {data.nomor_transfer || data.id}
            </Text>
          </View>

          {/* Dual Barcode: Code 128 + QR Code */}
          <View style={styles.barcodesWrapper}>
            {barcode128Url ? (
              <View style={{ alignItems: 'center' }}>
                <Image src={barcode128Url} style={styles.barcode128Img} />
                <Text style={styles.barcodeCaption}>Scan Barcode Gun (Fisik)</Text>
              </View>
            ) : null}

            {qrCodeUrl ? (
              <View style={{ alignItems: 'center' }}>
                <Image src={qrCodeUrl} style={styles.qrCodeImg} />
                <Text style={styles.barcodeCaption}>Scan HP/Kamera</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ORIGIN & DESTINATION WAREHOUSE CARDS */}
        <View style={styles.infoSection}>
          {/* Asal */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Gudang Pengirim (Asal)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Gudang</Text>
              <Text style={styles.infoValue}>: {data.gudang_asal?.nama || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Penanggung Jawab</Text>
              <Text style={styles.infoValue}>: {data.gudang_asal?.penanggung_jawab || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={{ ...styles.infoValue, fontWeight: 'normal' }}>
                : {data.gudang_asal?.alamat || '-'}
              </Text>
            </View>
          </View>

          {/* Tujuan */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Gudang Penerima (Tujuan)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Gudang</Text>
              <Text style={styles.infoValue}>: {data.gudang_tujuan?.nama || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Penanggung Jawab</Text>
              <Text style={styles.infoValue}>: {data.gudang_tujuan?.penanggung_jawab || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={{ ...styles.infoValue, fontWeight: 'normal' }}>
                : {data.gudang_tujuan?.alamat || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* METADATA BAR */}
        <View style={styles.metaBar}>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Tgl Berangkat:</Text>
            <Text style={styles.metaItemVal}>
              {data.tanggal_kirim
                ? new Date(data.tanggal_kirim).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : new Date(data.created_at).toLocaleDateString('id-ID')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Kurir / Sopir:</Text>
            <Text style={styles.metaItemVal}>{data.kurir_pengirim || 'Internal Ekspedisi'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Status Dokumen:</Text>
            <Text style={styles.metaItemVal}>{data.status || 'IN_TRANSIT'}</Text>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>No</Text>
            <Text style={styles.colBarcode}>Kode / Barcode</Text>
            <Text style={styles.colName}>Nama Barang</Text>
            <Text style={styles.colQty}>Qty Kirim</Text>
            <Text style={styles.colUnit}>Satuan</Text>
            <Text style={styles.colCheck}>Cek Fisik</Text>
            <Text style={styles.colNote}>Catatan</Text>
          </View>

          {data.items?.map((item: any, i: number) => {
            const isAlt = i % 2 === 1;
            return (
              <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={i}>
                <Text style={styles.colNo}>{i + 1}</Text>
                <Text style={{ ...styles.colBarcode, fontSize: 7.5, fontFamily: 'Courier' }}>
                  {item.inventory?.kode_barcode || '-'}
                </Text>
                <Text style={{ ...styles.colName, fontWeight: 'bold' }}>
                  {item.inventory?.nama_barang || item.inventory_id}
                </Text>
                <Text style={{ ...styles.colQty, fontWeight: 'bold' }}>
                  {item.qty_kirim}
                </Text>
                <Text style={styles.colUnit}>
                  {item.inventory?.unit || 'pcs'}
                </Text>
                <View style={styles.colCheck}>
                  <View style={styles.checkBox} />
                </View>
                <Text style={{ ...styles.colNote, fontSize: 7.5, color: '#6b7280' }}>
                  {item.catatan || '-'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* SUMMARY TABLE */}
        <View style={styles.tableSummary}>
          <Text style={styles.tableSummaryText}>
            Total Muatan: {totalJenisBarang} jenis barang
          </Text>
          <Text style={{ ...styles.tableSummaryText, color: '#1e40af' }}>
            Total Jumlah Kirim: {totalQtyKirim} pcs
          </Text>
        </View>

        {/* PAPERLESS DIGITAL AUDIT TRAIL */}
        <View style={styles.auditSection}>
          <View style={styles.auditHeader}>
            <Text style={styles.auditTitle}>VERIFIKASI LOGISTIK DIGITAL (PAPERLESS SYSTEM)</Text>
            <Text style={styles.auditBadge}>
              {data.status === 'RECEIVED' ? 'VERIFIKASI LENGKAP' : 'DALAM DISTRIBUSI'}
            </Text>
          </View>

          <View style={styles.auditGrid}>
            <View style={styles.auditCol}>
              <Text style={styles.auditLabel}>1. Petugas Pengirim (Asal)</Text>
              <Text style={styles.auditName}>
                {data.created_by_profile?.nama || 'Petugas Gudang Asal'}
              </Text>
              <Text style={styles.auditTime}>
                {data.tanggal_kirim
                  ? new Date(data.tanggal_kirim).toLocaleString('id-ID')
                  : new Date(data.created_at).toLocaleString('id-ID')}
              </Text>
            </View>

            <View style={styles.auditCol}>
              <Text style={styles.auditLabel}>2. Kurir / Sopir Pengantar</Text>
              <Text style={styles.auditName}>
                {data.kurir_pengirim || 'Driver Logistik Internal'}
              </Text>
              <Text style={styles.auditTime}>Armada Distribusi Resmi</Text>
            </View>

            <View style={styles.auditCol}>
              <Text style={styles.auditLabel}>3. Petugas Penerima (Tujuan)</Text>
              <Text style={styles.auditName}>
                {data.received_by_profile?.nama ||
                  (data.status === 'RECEIVED' ? 'Staf Penerima' : 'Menunggu Pengecekan Fisik')}
              </Text>
              <Text style={styles.auditTime}>
                {data.tanggal_terima
                  ? new Date(data.tanggal_terima).toLocaleString('id-ID')
                  : 'Scan Barcode saat tiba di gudang'}
              </Text>
            </View>
          </View>

          <Text style={styles.paperlessDisclaimer}>
            * Dokumen ini diterbitkan dan diverifikasi secara elektronik melalui BMS Paperless Logistics.
            Penerimaan fisik diverifikasi langsung via pemindaian barcode tanpa memerlukan tanda tangan basah.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export async function GET(request: Request, context: any) {
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
    },
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return new NextResponse('ID dokumen tidak valid', { status: 400 });
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('roles, default_gudang_id')
      .eq('id', user.id)
      .maybeSingle();

    const requesterRoles: string[] = requesterProfile?.roles || [];
    const isAdmin = requesterRoles.includes('admin');
    const isWarehouseStaff =
      isAdmin ||
      ['kepala_cabang', 'kepala_gudang', 'staff_gudang'].some((r) => requesterRoles.includes(r));

    if (!isWarehouseStaff) {
      return new NextResponse('Forbidden: Anda tidak memiliki izin untuk mengunduh Surat Jalan.', {
        status: 403,
      });
    }

    const { data, error } = await supabase
      .from('transfer_stok')
      .select(
        `
        *,
        gudang_asal:gudang_asal_id ( id, kode_gudang, nama, tipe, alamat, penanggung_jawab ),
        gudang_tujuan:gudang_tujuan_id ( id, kode_gudang, nama, tipe, alamat, penanggung_jawab ),
        created_by_profile:created_by ( id, nama ),
        received_by_profile:received_by ( id, nama ),
        items:transfer_stok_items (
          id,
          inventory_id,
          qty_kirim,
          qty_terima,
          catatan,
          inventory:inventory_id (
            id,
            nama_barang,
            kode_barcode,
            unit
          )
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching data for PDF:', error);
      return new NextResponse('Data tidak ditemukan', { status: 404 });
    }

    // Isolasi Cabang untuk non-admin
    const userGudangId = requesterProfile?.default_gudang_id;
    if (
      !isAdmin &&
      userGudangId &&
      data.gudang_asal_id !== userGudangId &&
      data.gudang_tujuan_id !== userGudangId
    ) {
      return new NextResponse('Forbidden: Surat Jalan ini bukan milik cabang penempatan Anda.', {
        status: 403,
      });
    }

    // Load Company Logo
    let logoDataUrl = '';
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (logoErr) {
      console.warn('Could not read company logo from file:', logoErr);
    }

    // Generate Code 128 Barcode for Document Number
    const nomorTransfer = data.nomor_transfer || data.id;
    const barcode128Url = await generateCode128DataUrl(nomorTransfer, {
      scale: 3,
      height: 11,
      includeText: true,
    });

    // Generate QR Code containing direct verification link
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const docUrl = `${proto}://${host}/warehouse/transfers?detailId=${data.id}`;
    const qrCodeUrl = await generateQrCodeDataUrl(docUrl, { scale: 3 });

    const stream = await renderToStream(
      <SuratJalanPDF
        data={data}
        logoDataUrl={logoDataUrl}
        barcode128Url={barcode128Url}
        qrCodeUrl={qrCodeUrl}
      />,
    );

    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Surat_Jalan_${nomorTransfer}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
