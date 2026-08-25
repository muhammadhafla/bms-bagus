'use client';

import { SlipGaji } from '@/lib/api/payroll';

// This function dynamically imports pdfMake so it doesn't break SSR
async function getPdfMake() {
  const pdfMake =
    (await import('pdfmake/build/pdfmake')).default || (await import('pdfmake/build/pdfmake'));
  const pdfFonts =
    (await import('pdfmake/build/vfs_fonts')).default || (await import('pdfmake/build/vfs_fonts'));
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || (pdfFonts as any).vfs || pdfFonts;
  return pdfMake;
}

const buildSlipGajiPage = (slip: SlipGaji) => {
  const formatCurrency = (amount: number | string) => {
    return `Rp ${Number(amount).toLocaleString('id-ID')}`;
  };

  const totalPotongan = Number(slip.total_denda_telat) + Number(slip.total_potongan_kasbon);

  return [
    {
      text: 'SLIP GAJI KARYAWAN',
      style: 'header',
      alignment: 'center',
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          width: '50%',
          stack: [
            {
              columns: [
                { text: 'Nama', width: 80, style: 'label' },
                { text: `: ${slip.profiles?.nama || 'Unknown'}` },
              ],
            },
            {
              columns: [
                { text: 'Periode', width: 80, style: 'label' },
                { text: `: ${slip.periode_bulan}` },
              ],
              margin: [0, 5, 0, 0],
            },
          ],
        },
        {
          width: '50%',
          stack: [
            {
              columns: [
                { text: 'Total Kehadiran', width: 100, style: 'label' },
                { text: `: ${slip.total_hari_hadir} Hari` },
              ],
            },
            {
              columns: [
                { text: 'Total Jam Telat', width: 100, style: 'label' },
                { text: `: ${Number(slip.total_jam_telat).toFixed(1)} Jam` },
              ],
              margin: [0, 5, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 20],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 120, '*'],
        body: [
          [
            { text: 'KETERANGAN', style: 'tableHeader' },
            { text: 'JUMLAH', style: 'tableHeader', alignment: 'right' },
            { text: 'SUBTOTAL', style: 'tableHeader', alignment: 'right' },
          ],
          // PENDAPATAN
          [
            { text: 'PENDAPATAN', bold: true, colSpan: 3, fillColor: '#f9f9f9', margin: [0, 5, 0, 5] },
            {},
            {},
          ],
          [
            { text: 'Gaji Pokok (Hadir)' },
            { text: formatCurrency(slip.total_gaji_harian), alignment: 'right' },
            { text: formatCurrency(slip.total_gaji_harian), alignment: 'right' },
          ],
          [
            { text: 'Uang Lembur' },
            { text: formatCurrency(slip.total_gaji_lembur), alignment: 'right' },
            { text: formatCurrency(Number(slip.total_gaji_harian) + Number(slip.total_gaji_lembur)), alignment: 'right' },
          ],
          // POTONGAN
          [
            { text: 'POTONGAN', bold: true, colSpan: 3, fillColor: '#f9f9f9', margin: [0, 5, 0, 5] },
            {},
            {},
          ],
          [
            { text: 'Potongan Kasbon' },
            { text: formatCurrency(slip.total_potongan_kasbon), alignment: 'right' },
            { text: formatCurrency(slip.total_potongan_kasbon), alignment: 'right' },
          ],
          [
            { text: 'Denda Keterlambatan' },
            { text: formatCurrency(slip.total_denda_telat), alignment: 'right' },
            { text: formatCurrency(totalPotongan), alignment: 'right' },
          ],
          // TOTAL BERSIH
          [
            { text: 'TOTAL GAJI BERSIH', bold: true, margin: [0, 5, 0, 5] },
            { text: '', margin: [0, 5, 0, 5] },
            { text: formatCurrency(slip.gaji_bersih), bold: true, alignment: 'right', margin: [0, 5, 0, 5] },
          ],
        ],
      },
      margin: [0, 0, 0, 30],
    },
    {
      columns: [
        {
          stack: [
            { text: 'Diterima Oleh,', alignment: 'center' },
            { text: '', margin: [0, 50, 0, 0] },
            { text: `(${slip.profiles?.nama || '___________________'})`, alignment: 'center', bold: true },
            { text: 'Karyawan', alignment: 'center', fontSize: 10, color: '#666' },
          ],
          width: '50%',
        },
        {
          stack: [
            { text: 'Dibuat Oleh,', alignment: 'center' },
            { text: '', margin: [0, 50, 0, 0] },
            { text: '(___________________)', alignment: 'center', bold: true },
            { text: 'Admin / HRD', alignment: 'center', fontSize: 10, color: '#666' },
          ],
          width: '50%',
        },
      ],
    },
  ];
};

const getStyles = () => ({
  header: { fontSize: 16, bold: true },
  label: { bold: true, color: '#444' },
  tableHeader: { bold: true, fillColor: '#eeeeee', margin: [0, 4, 0, 4] },
});

export async function downloadSlipGajiPdf(slip: SlipGaji) {
  const pdfMake = await getPdfMake();
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: buildSlipGajiPage(slip),
    styles: getStyles(),
    defaultStyle: {
      fontSize: 11,
    },
  };
  
  const fileName = `Slip_Gaji_${slip.profiles?.nama || 'Unknown'}_${slip.periode_bulan}.pdf`;
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  
  // Use download to trigger browser download
  pdfDocGenerator.download(fileName);
}

export async function downloadAllSlipGajiPdf(slips: SlipGaji[], periode: string) {
  const pdfMake = await getPdfMake();
  
  const content: any[] = [];
  
  for (let i = 0; i < slips.length; i++) {
    content.push(...buildSlipGajiPage(slips[i]));
    
    // Add page break after each slip EXCEPT the very last one
    if (i < slips.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: content,
    styles: getStyles(),
    defaultStyle: {
      fontSize: 11,
    },
  };
  
  const fileName = `Kumpulan_Slip_Gaji_${periode}.pdf`;
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);
  
  pdfDocGenerator.download(fileName);
}

export async function downloadMutasiPdf(mutasiData: any[], profileName: string, saldo: number) {
  const pdfMake = await getPdfMake();
  const formatCurrency = (amount: number | string) => `Rp ${Number(amount).toLocaleString('id-ID')}`;
  
  const content = [
    { text: 'RIWAYAT MUTASI KARYAWAN', style: 'header', alignment: 'center', margin: [0, 0, 0, 20] },
    {
      columns: [
        { text: `Nama: ${profileName}`, width: '*' },
        { text: `Total Saldo/Tanggungan: ${saldo < 0 ? '-' : ''}${formatCurrency(Math.abs(saldo))}`, alignment: 'right', bold: true, width: '*' }
      ],
      margin: [0, 0, 0, 15]
    },
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto'],
        body: [
          [
            { text: 'Tanggal', style: 'tableHeader' },
            { text: 'Keterangan', style: 'tableHeader' },
            { text: 'Status', style: 'tableHeader' },
            { text: 'Nominal', style: 'tableHeader', alignment: 'right' }
          ],
          ...mutasiData.map(item => {
            const dateStr = new Date(item.tanggal).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
            return [
              { text: dateStr, margin: [0, 5, 0, 5] },
              { text: item.keterangan || '-', margin: [0, 5, 0, 5] },
              { text: item.status, margin: [0, 5, 0, 5] },
              { text: `${item.jenis === 'kredit' ? '' : '-'}${formatCurrency(item.nominal)}`, alignment: 'right', margin: [0, 5, 0, 5], color: item.jenis === 'kredit' ? '#16a34a' : '#000000' }
            ];
          })
        ]
      }
    }
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content,
    styles: getStyles(),
    defaultStyle: { fontSize: 11 }
  };
  
  const fileName = `Riwayat_Mutasi_${profileName.replace(/\s+/g, '_')}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
}

