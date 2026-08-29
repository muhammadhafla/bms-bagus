'use client';

import { TransferStok } from '@/types/warehouse';

async function getPdfMake() {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const pdfFonts = pdfFontsModule.default || pdfFontsModule;
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs || pdfFonts;
  return pdfMake;
}

export async function generateSuratJalanPDF(transfer: TransferStok) {
  const pdfMake = await getPdfMake();

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const tableBody: any[] = [
    [
      { text: 'No', style: 'tableHeader', alignment: 'center' },
      { text: 'Kode Barcode', style: 'tableHeader' },
      { text: 'Nama Barang', style: 'tableHeader' },
      { text: 'Satuan', style: 'tableHeader', alignment: 'center' },
      { text: 'Qty Kirim', style: 'tableHeader', alignment: 'center' },
      { text: 'Qty Terima', style: 'tableHeader', alignment: 'center' },
      { text: 'Catatan', style: 'tableHeader' },
    ],
  ];

  (transfer.items || []).forEach((item, index) => {
    tableBody.push([
      { text: `${index + 1}`, alignment: 'center' },
      { text: item.inventory?.kode_barcode || '-' },
      { text: item.inventory?.nama_barang || 'Barang' },
      { text: item.inventory?.unit || 'Pcs', alignment: 'center' },
      { text: `${item.qty_kirim}`, alignment: 'center', bold: true },
      { text: transfer.status === 'RECEIVED' ? `${item.qty_terima}` : '.....', alignment: 'center' },
      { text: item.catatan || '-' },
    ]);
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        columns: [
          {
            text: 'BAGUS MANAGEMENT SYSTEM',
            style: 'companyTitle',
          },
          {
            text: 'SURAT JALAN / TRANSFER STOK',
            style: 'docTitle',
            alignment: 'right',
          },
        ],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1.5, lineColor: '#2563eb' }],
        margin: [0, 5, 0, 15],
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              {
                columns: [
                  { text: 'Nomor Transfer', width: 95, bold: true },
                  { text: `: ${transfer.nomor_transfer}` },
                ],
                margin: [0, 2, 0, 2],
              },
              {
                columns: [
                  { text: 'Gudang Asal', width: 95, bold: true },
                  { text: `: ${transfer.gudang_asal?.nama || '-'} (${transfer.gudang_asal?.kode_gudang || ''})` },
                ],
                margin: [0, 2, 0, 2],
              },
              {
                columns: [
                  { text: 'Gudang Tujuan', width: 95, bold: true },
                  { text: `: ${transfer.gudang_tujuan?.nama || '-'} (${transfer.gudang_tujuan?.kode_gudang || ''})` },
                ],
                margin: [0, 2, 0, 2],
              },
            ],
          },
          {
            width: '50%',
            stack: [
              {
                columns: [
                  { text: 'Tanggal Kirim', width: 90, bold: true },
                  { text: `: ${formatDate(transfer.tanggal_kirim || transfer.created_at)}` },
                ],
                margin: [0, 2, 0, 2],
              },
              {
                columns: [
                  { text: 'Kurir / Driver', width: 90, bold: true },
                  { text: `: ${transfer.kurir_pengirim || '-'}` },
                ],
                margin: [0, 2, 0, 2],
              },
              {
                columns: [
                  { text: 'Status', width: 90, bold: true },
                  { text: `: ${transfer.status}` },
                ],
                margin: [0, 2, 0, 2],
              },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        table: {
          headerRows: 1,
          widths: [25, 80, '*', 45, 55, 55, 75],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f3f4f6' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineColor: () => '#e5e7eb',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
      },
      {
        text: `Catatan Transfer: ${transfer.catatan || 'Tidak ada catatan tambahan.'}`,
        margin: [0, 15, 0, 25],
        italics: true,
        fontSize: 9,
        color: '#4b5563',
      },
      {
        columns: [
          {
            width: '33%',
            alignment: 'center',
            stack: [
              { text: 'Petugas Pengirim,', fontSize: 10 },
              { text: transfer.gudang_asal?.nama || 'Gudang Asal', fontSize: 8, color: '#6b7280' },
              { text: '\n\n\n\n' },
              { text: `( ${transfer.created_by_profile?.nama || '................................'} )`, bold: true, fontSize: 10 },
            ],
          },
          {
            width: '33%',
            alignment: 'center',
            stack: [
              { text: 'Kurir / Driver,', fontSize: 10 },
              { text: 'Ekspedisi / Pengantar', fontSize: 8, color: '#6b7280' },
              { text: '\n\n\n\n' },
              { text: `( ${transfer.kurir_pengirim || '................................'} )`, bold: true, fontSize: 10 },
            ],
          },
          {
            width: '33%',
            alignment: 'center',
            stack: [
              { text: 'Petugas Penerima,', fontSize: 10 },
              { text: transfer.gudang_tujuan?.nama || 'Gudang Tujuan', fontSize: 8, color: '#6b7280' },
              { text: '\n\n\n\n' },
              { text: `( ${transfer.received_by_profile?.nama || '................................'} )`, bold: true, fontSize: 10 },
            ],
          },
        ],
      },
    ],
    styles: {
      companyTitle: {
        fontSize: 14,
        bold: true,
        color: '#1e3a8a',
      },
      docTitle: {
        fontSize: 12,
        bold: true,
        color: '#111827',
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: '#1f2937',
      },
    },
    defaultStyle: {
      fontSize: 9,
      color: '#1f2937',
    },
  };

  pdfMake.createPdf(docDefinition).open();
}
