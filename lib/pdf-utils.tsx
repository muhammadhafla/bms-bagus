'use client';

interface ReturnItem {
  nama_barang: string;
  nomor_nota?: string;
  tanggal_pembelian?: string;
  qty: number;
  harga_beli: number;
  diskon?: number;
  harga_final: number;
}

interface ReturnData {
  id: string;
  tanggal: string;
  supplier_nama: string;
  note?: string;
  items: ReturnItem[];
  total: number;
}

export async function generateReturnPdf(returnData: ReturnData): Promise<Buffer> {
  const pdfMake = require('pdfmake/build/pdfmake');
  const pdfFonts = require('pdfmake/build/vfs_fonts');
  (pdfMake as any).vfs = pdfFonts.pdfMake?.vfs || pdfFonts;
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        text: 'SURAT RETUR BARANG',
        style: 'header',
        margin: [0, 0, 0, 5]
      },
      {
        text: `Nomor: ${(returnData.id || '').slice(0, 8).toUpperCase()}`,
        style: 'subheader',
        margin: [0, 0, 0, 2]
      },
      {
        text: `Tanggal: ${returnData.tanggal}`,
        style: 'subheader',
        margin: [0, 0, 0, 15]
      },
      {
        text: 'Kepada Yth:',
        style: 'label',
        margin: [0, 0, 0, 2]
      },
      {
        text: returnData.supplier_nama,
        margin: [0, 0, 0, 15]
      },
      ...(returnData.note ? [{
        text: `Catatan: ${returnData.note}`,
        italics: true,
        margin: [0, 0, 0, 15]
      }] : []),
      {
        table: {
          headerRows: 1,
          widths: ['*', 70, 50, 50, 30, 60, 60],
          body: [
            [
              { text: 'Nama Barang', style: 'tableHeader' },
              { text: 'No. PO', style: 'tableHeader' },
              { text: 'Tgl Beli', style: 'tableHeader' },
              { text: 'Qty', style: 'tableHeader', alignment: 'right' },
              { text: 'Harga', style: 'tableHeader', alignment: 'right' },
              { text: 'Subtotal', style: 'tableHeader', alignment: 'right' }
            ],
            ...returnData.items.map((item, index) => {
              const harga = item.harga_beli - (item.diskon || 0);
              return [
                { text: item.nama_barang, fontSize: 9 },
                { text: item.nomor_nota || '-', fontSize: 9 },
                { text: item.tanggal_pembelian || '-', fontSize: 9 },
                { text: String(item.qty), fontSize: 9, alignment: 'right' },
                { text: `Rp ${harga.toLocaleString('id-ID')}`, fontSize: 9, alignment: 'right' },
                { text: `Rp ${item.harga_final.toLocaleString('id-ID')}`, fontSize: 9, alignment: 'right' }
              ];
            })
          ]
        },
        margin: [0, 0, 0, 15]
      },
      {
        columns: [
          { text: '', width: '*' },
          {
            stack: [
              {
                text: `TOTAL RETURN: Rp ${returnData.total.toLocaleString('id-ID')}`,
                bold: true,
                fontSize: 12,
                alignment: 'right'
              }
            ]
          }
        ],
        margin: [0, 10, 0, 0]
      },
      {
        columns: [
          {
            stack: [
              { text: 'Penerima Barang,', alignment: 'center' },
              { text: '', margin: [0, 40, 0, 0] },
              { text: '___________________', alignment: 'center', fontSize: 9 },
              { text: 'Nama & Tanda Tangan', alignment: 'center', fontSize: 8 }
            ],
            width: '50%'
          },
          {
            stack: [
              { text: 'Dibuat Oleh,', alignment: 'center' },
              { text: '', margin: [0, 40, 0, 0] },
              { text: '___________________', alignment: 'center', fontSize: 9 },
              { text: 'Nama & Tanda Tangan', alignment: 'center', fontSize: 8 }
            ],
            width: '50%'
          }
        ],
        margin: [0, 40, 0, 0]
      }
    ],
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 10, color: '#666' },
      label: { bold: true, fontSize: 10 },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f0f0f0' }
    },
    defaultStyle: {
      fontSize: 10,
      font: 'Helvetica'
    }
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
  });
}