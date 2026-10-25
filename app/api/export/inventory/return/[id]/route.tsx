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
    fontSize: 8.5,
    color: '#1f2937',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
    marginBottom: 10,
  },
  companyBrand: {
    flexDirection: 'column',
    maxWidth: 200,
  },
  logo: {
    height: 36,
    width: 110,
    objectFit: 'contain',
    marginBottom: 3,
  },
  companySubtitle: {
    fontSize: 7.5,
    color: '#6b7280',
  },
  docTitleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 0.5,
  },
  docSubtitle: {
    fontSize: 8,
    color: '#4b5563',
    marginTop: 1,
  },
  docNumber: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 2,
  },
  barcodesWrapper: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 6,
  },
  barcode128Img: {
    width: 125,
    height: 34,
    objectFit: 'contain',
  },
  qrCodeImg: {
    width: 38,
    height: 38,
    objectFit: 'contain',
  },
  barcodeCaption: {
    fontSize: 6,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 1,
  },

  // Info Cards Section
  infoSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 7,
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
    marginBottom: 2,
  },
  infoLabel: {
    width: 75,
    fontSize: 7.5,
    color: '#6b7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 7.5,
    color: '#111827',
    fontWeight: 'bold',
  },

  // Metadata Bar
  metaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemLabel: {
    fontSize: 7.5,
    color: '#1e40af',
  },
  metaItemVal: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },

  // Table
  table: {
    width: '100%',
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontWeight: 'bold',
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  colNo: { width: '4%', textAlign: 'center', fontSize: 7.5 },
  colBarcode: { width: '15%', fontSize: 7, fontFamily: 'Courier' },
  colName: { width: '31%', fontSize: 7.5 },
  colReason: { width: '13%', fontSize: 7 },
  colNota: { width: '12%', fontSize: 7 },
  colQty: { width: '7%', textAlign: 'center', fontSize: 7.5, fontWeight: 'bold' },
  colHarga: { width: '9%', textAlign: 'right', fontSize: 7.5 },
  colSubtotal: { width: '9%', textAlign: 'right', fontSize: 7.5, fontWeight: 'bold' },

  // Note Box
  noteBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 0.5,
    borderColor: '#fef3c7',
    borderRadius: 3,
    padding: 5,
    marginBottom: 6,
  },
  noteLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 1,
  },
  noteText: {
    fontSize: 7,
    color: '#78350f',
  },

  // Summary
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
  },
  summaryTotal: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#1e40af',
  },

  // Signatures
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  signCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    borderRadius: 3,
    padding: 6,
    textAlign: 'center',
    backgroundColor: '#fafafa',
  },
  signHeader: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  signSubtitle: {
    fontSize: 6.5,
    color: '#6b7280',
    marginBottom: 32,
  },
  signLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    marginBottom: 3,
    marginHorizontal: 10,
  },
  signName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#111827',
  },
  signStamp: {
    fontSize: 6,
    color: '#9ca3af',
    fontStyle: 'italic',
  },

  // Audit Footer
  auditFooter: {
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditText: {
    fontSize: 6.5,
    color: '#9ca3af',
  },
});

function parseReturnNote(note?: string) {
  if (!note) {
    return {
      kompensasi: 'Potong Hutang',
      itemReasons: {} as Record<string, string>,
      userNote: '',
    };
  }

  let kompensasi = 'Potong Hutang';
  const kompMatch = note.match(/\[Penyelesaian:\s*([^\]]+)\]/i);
  if (kompMatch) {
    kompensasi = kompMatch[1].trim();
  }

  const itemReasons: Record<string, string> = {};
  const reasonMatch = note.match(/\[Alasan:\s*([^\]]+)\]/i);
  if (reasonMatch) {
    const parts = reasonMatch[1].split(',');
    parts.forEach((p) => {
      const m = p.trim().match(/^(.+?)\s*\((.+?)\)$/);
      if (m) {
        itemReasons[m[1].trim().toLowerCase()] = m[2].trim();
      }
    });
  }

  let userNote = '';
  const noteMatch = note.match(/(?:^|\|\s*)Catatan:\s*(.+)$/i);
  if (noteMatch) {
    userNote = noteMatch[1].trim();
  } else if (!kompMatch && !reasonMatch) {
    userNote = note;
  }

  return { kompensasi, itemReasons, userNote };
}

function formatReason(rawReason?: string): string {
  if (!rawReason) return '-';
  const r = rawReason.toLowerCase();
  if (r === 'rusak') return 'Rusak / Cacat';
  if (r === 'expired') return 'Kedaluwarsa';
  if (r === 'salah_kirim') return 'Salah Kirim';
  if (r === 'konsinyasi') return 'Konsinyasi';
  if (r === 'lainnya') return 'Lainnya';
  return rawReason;
}

interface ReturnPDFProps {
  data: any;
  logoDataUrl?: string;
  barcode128Url?: string;
  qrCodeUrl?: string;
}

const ReturnPDF = ({ data, logoDataUrl, barcode128Url, qrCodeUrl }: ReturnPDFProps) => {
  const nomorRetur = 'RET-' + (data.id || '').slice(0, 8).toUpperCase();
  const totalJenisBarang = (data.items || []).length;
  const totalQty = (data.items || []).reduce((acc: number, it: any) => acc + (Number(it.qty) || 0), 0);

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
            <Text style={styles.docTitle}>SURAT RETUR PEMBELIAN</Text>
            <Text style={styles.docSubtitle}>PENGEMBALIAN BARANG KE SUPPLIER</Text>
            <Text style={styles.docNumber}>#{nomorRetur}</Text>
          </View>

          {/* Dual Barcode: Code 128 + QR Code */}
          <View style={styles.barcodesWrapper}>
            {barcode128Url ? (
              <View style={{ alignItems: 'center' }}>
                <Image src={barcode128Url} style={styles.barcode128Img} />
                <Text style={styles.barcodeCaption}>Scan Barcode Gun</Text>
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

        {/* ORIGIN WAREHOUSE & DESTINATION SUPPLIER CARDS */}
        <View style={styles.infoSection}>
          {/* Gudang Pengirim (Asal) */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Gudang Pengirim (Asal)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Gudang</Text>
              <Text style={styles.infoValue}>: {data.gudang?.nama || 'Gudang Utama'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Penanggung Jawab</Text>
              <Text style={styles.infoValue}>
                : {data.gudang?.penanggung_jawab || data.creator?.nama || '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={{ ...styles.infoValue, fontWeight: 'normal' }}>
                : {data.gudang?.alamat || '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No. Kontak</Text>
              <Text style={{ ...styles.infoValue, fontWeight: 'normal' }}>
                : {data.gudang?.kontak_pj || '-'}
              </Text>
            </View>
          </View>

          {/* Tujuan Pengembalian (Supplier) */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Tujuan Pengembalian (Supplier)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Supplier</Text>
              <Text style={styles.infoValue}>: {data.supplier?.nama || data.supplier_nama || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>No. Kontak / HP</Text>
              <Text style={{ ...styles.infoValue, fontWeight: 'normal' }}>
                : {data.supplier?.kontak || '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={{ ...styles.infoValue, fontWeight: 'normal' }}>
                : {data.supplier?.alamat || '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* METADATA BAR */}
        <View style={styles.metaBar}>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Tgl Retur:</Text>
            <Text style={styles.metaItemVal}>
              {new Date(data.tanggal).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Penyelesaian:</Text>
            <Text style={styles.metaItemVal}>{data.parsedKompensasi || 'Potong Hutang'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Dibuat Oleh:</Text>
            <Text style={styles.metaItemVal}>{data.creator?.nama || 'Petugas Gudang'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Status:</Text>
            <Text style={styles.metaItemVal}>DISETUJUI / SELESAI</Text>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>No</Text>
            <Text style={styles.colBarcode}>Barcode / SKU</Text>
            <Text style={styles.colName}>Nama Barang</Text>
            <Text style={styles.colReason}>Alasan Retur</Text>
            <Text style={styles.colNota}>Ref Nota Beli</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colHarga}>Harga Satuan</Text>
            <Text style={styles.colSubtotal}>Subtotal</Text>
          </View>

          {data.items?.map((item: any, i: number) => {
            const isAlt = i % 2 === 1;
            const hargaSatuan = (Number(item.harga_beli) || 0) - (Number(item.diskon) || 0);
            return (
              <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={i}>
                <Text style={styles.colNo}>{i + 1}</Text>
                <Text style={styles.colBarcode}>{item.barcode || '-'}</Text>
                <View style={styles.colName}>
                  <Text style={{ fontWeight: 'bold' }}>{item.nama_barang}</Text>
                  {item.unit && (
                    <Text style={{ fontSize: 6.5, color: '#6b7280' }}>Satuan: {item.unit}</Text>
                  )}
                </View>
                <Text style={styles.colReason}>{item.alasanFormatted}</Text>
                <View style={styles.colNota}>
                  <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#374151' }}>
                    {item.nomor_nota ? `#${item.nomor_nota}` : '-'}
                  </Text>
                  {item.tanggal_pembelian && item.tanggal_pembelian !== '-' && (
                    <Text style={{ fontSize: 6, color: '#6b7280' }}>{item.tanggal_pembelian}</Text>
                  )}
                </View>
                <Text style={styles.colQty}>{item.qty}</Text>
                <Text style={styles.colHarga}>Rp {hargaSatuan.toLocaleString('id-ID')}</Text>
                <Text style={styles.colSubtotal}>
                  Rp {(Number(item.harga_final) || 0).toLocaleString('id-ID')}
                </Text>
              </View>
            );
          })}
        </View>

        {/* CATATAN PENGEMBALIAN */}
        {data.userNote ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Catatan Pengembalian:</Text>
            <Text style={styles.noteText}>{data.userNote}</Text>
          </View>
        ) : null}

        {/* SUMMARY TABLE */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>
            Total: {totalJenisBarang} jenis produk ({totalQty} pcs)
          </Text>
          <Text style={styles.summaryTotal}>
            TOTAL RETUR: Rp {(Number(data.total) || 0).toLocaleString('id-ID')}
          </Text>
        </View>

        {/* 3 SIGNATURES SECTION */}
        <View style={styles.signatures}>
          <View style={styles.signCard}>
            <Text style={styles.signHeader}>Diserahkan Oleh,</Text>
            <Text style={styles.signSubtitle}>Staff Gudang / Checker</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>{data.creator?.nama || 'Petugas Gudang'}</Text>
          </View>

          <View style={styles.signCard}>
            <Text style={styles.signHeader}>Dibawa Oleh,</Text>
            <Text style={styles.signSubtitle}>Driver / Ekspedisi</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>( ___________________ )</Text>
          </View>

          <View style={styles.signCard}>
            <Text style={styles.signHeader}>Diterima Oleh,</Text>
            <Text style={styles.signSubtitle}>Pihak Supplier (Cap & TTD)</Text>
            <View style={styles.signLine} />
            <Text style={styles.signName}>{data.supplier?.nama || data.supplier_nama}</Text>
            <Text style={styles.signStamp}>Tanda Tangan & Cap Stempel</Text>
          </View>
        </View>

        {/* DIGITAL AUDIT FOOTER */}
        <View style={styles.auditFooter}>
          <Text style={styles.auditText}>
            Dokumen sah diterbitkan melalui BMS Inventory Management System.
          </Text>
          <Text style={styles.auditText}>
            Dicetak: {new Date().toLocaleString('id-ID')} WIB
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
      return new NextResponse('ID retur tidak valid', { status: 400 });
    }

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('roles, default_gudang_id')
      .eq('id', user.id)
      .maybeSingle();

    const requesterRoles: string[] = requesterProfile?.roles || [];
    const allowedRoles = ['admin', 'finance', 'kepala_cabang', 'kepala_gudang', 'staff_gudang', 'kasir'];
    const isAllowed = allowedRoles.some((r) => requesterRoles.includes(r));

    if (!isAllowed) {
      return new NextResponse('Forbidden: Anda tidak memiliki izin untuk mengunduh Bukti Retur.', {
        status: 403,
      });
    }

    // 3. Fetch Data Pembelian Return
    const { data, error } = await supabase
      .from('pembelian_return')
      .select('*, items:pembelian_return_items(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching return data:', error);
      return new NextResponse('Data tidak ditemukan', { status: 404 });
    }

    // 4. Fetch Gudang Info
    let gudangData: any = null;
    if (data.gudang_id) {
      const { data: g } = await supabase
        .from('gudang')
        .select('id, kode_gudang, nama, alamat, penanggung_jawab, kontak_pj')
        .eq('id', data.gudang_id)
        .maybeSingle();
      gudangData = g;
    }
    if (!gudangData) {
      const { data: defaultG } = await supabase
        .from('gudang')
        .select('id, kode_gudang, nama, alamat, penanggung_jawab, kontak_pj')
        .eq('is_default', true)
        .maybeSingle();
      gudangData = defaultG;
    }

    // 5. Fetch Supplier Info
    let supplierData: any = null;
    if (data.supplier_id) {
      const { data: s } = await supabase
        .from('supplier')
        .select('id, nama, kontak, alamat')
        .eq('id', data.supplier_id)
        .maybeSingle();
      supplierData = s;
    }

    // 6. Fetch Creator Profile
    let creatorProfile: any = null;
    if (data.created_by) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, nama')
        .eq('id', data.created_by)
        .maybeSingle();
      creatorProfile = p;
    }

    // 7. Fetch Inventory Info (Barcode, Unit)
    const inventoryIds = Array.from(
      new Set((data.items || []).map((it: any) => it.inventory_id).filter(Boolean)),
    );
    const inventoryMap: Record<string, { kode_barcode?: string; unit?: string }> = {};
    if (inventoryIds.length > 0) {
      const { data: invList } = await supabase
        .from('inventory')
        .select('id, kode_barcode, unit')
        .in('id', inventoryIds);
      if (invList) {
        invList.forEach((inv: any) => {
          inventoryMap[inv.id] = {
            kode_barcode: inv.kode_barcode,
            unit: inv.unit,
          };
        });
      }
    }

    // 8. Fetch related pembelian invoice info
    const pembelianItemIds = (data.items || [])
      .map((it: any) => it.pembelian_item_id)
      .filter(Boolean);

    const invoiceMap: Record<string, { nomor_nota: string; tanggal: string }> = {};
    if (pembelianItemIds.length > 0) {
      const { data: pItems } = await supabase
        .from('pembelian_items')
        .select('id, pembelian:pembelian(nomor_nota, tanggal)')
        .in('id', pembelianItemIds);

      if (pItems) {
        pItems.forEach((pi: any) => {
          const pemb = Array.isArray(pi.pembelian) ? pi.pembelian[0] : pi.pembelian;
          if (pemb) {
            invoiceMap[pi.id] = {
              nomor_nota: pemb.nomor_nota || '-',
              tanggal: pemb.tanggal || '-',
            };
          }
        });
      }
    }

    // 9. Parse Note for Reasons & Compensation Method
    const { kompensasi, itemReasons, userNote } = parseReturnNote(data.note);

    // 10. Load Company Logo
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

    // 11. Generate Code 128 Barcode for Document Number
    const nomorRetur = 'RET-' + id.slice(0, 8).toUpperCase();
    const barcode128Url = await generateCode128DataUrl(nomorRetur, {
      scale: 3,
      height: 11,
      includeText: true,
    });

    // 12. Generate QR Code containing direct verification link
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const docUrl = `${proto}://${host}/transactions/history?tab=retur_pembelian&search=${id.slice(0, 8)}`;
    const qrCodeUrl = await generateQrCodeDataUrl(docUrl, { scale: 3 });

    // 13. Calculate total from items
    const total =
      data.items?.reduce(
        (sum: number, item: any) => sum + (Number(item.harga_final) || 0),
        0,
      ) || 0;

    const returnData = {
      id: data.id,
      tanggal: data.tanggal,
      supplier_nama: data.supplier_nama || '-',
      supplier: supplierData,
      gudang: gudangData,
      creator: creatorProfile,
      parsedKompensasi: kompensasi,
      userNote: userNote,
      items:
        data.items?.map((item: any) => {
          const invInfo = invoiceMap[item.pembelian_item_id];
          const invDetails = inventoryMap[item.inventory_id];
          const rawReason = itemReasons[(item.nama_barang || '').toLowerCase()];

          return {
            barcode: invDetails?.kode_barcode || '-',
            unit: invDetails?.unit || 'pcs',
            nama_barang: item.nama_barang || '-',
            alasanFormatted: formatReason(rawReason),
            nomor_nota: invInfo?.nomor_nota || '-',
            tanggal_pembelian: invInfo?.tanggal || '-',
            qty: item.qty,
            harga_beli: Number(item.harga_beli) || 0,
            diskon: Number(item.diskon) || 0,
            harga_final: Number(item.harga_final) || 0,
          };
        }) || [],
      total: total,
    };

    const stream = await renderToStream(
      <ReturnPDF
        data={returnData}
        logoDataUrl={logoDataUrl}
        barcode128Url={barcode128Url}
        qrCodeUrl={qrCodeUrl}
      />,
    );

    return new Response(stream as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Surat_Retur_${nomorRetur}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
