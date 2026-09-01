import { ShortcutCategory } from '../types';

export const SHORTCUTS_DATA: ShortcutCategory[] = [
  {
    category: 'Kasir & Transaksi POS (/purchasing)',
    description: 'Pintasan keyboard cepat untuk mempercepat checkout kasir tanpa perlu menggunakan mouse.',
    items: [
      {
        key: 'F2',
        description: 'Fokus Pencarian Barcode / SKU',
        action: 'Mengarahkan kursor langsung ke kolom pencarian produk atau scan barcode.',
        context: 'Halaman Kasir & Pembelian',
      },
      {
        key: 'F3',
        description: 'Input Potongan Harga / Diskon',
        action: 'Membuka dialog input diskon tambahan untuk nota transaksi belanja aktif.',
        context: 'Halaman Kasir & Pembelian',
      },
      {
        key: 'F4',
        description: 'Pilih Pelanggan / Suplier',
        action: 'Membuka dialog pencarian member loyalitas pelanggan atau vendor suplier.',
        context: 'Halaman Kasir & Pembelian',
      },
      {
        key: 'F6',
        description: 'Fokus Input Nominal Pembayaran',
        action: 'Mengarahkan kursor ke input jumlah uang tunai yang diterima dari pembeli.',
        context: 'Halaman Kasir & Pembelian',
      },
      {
        key: 'F9',
        description: 'Selesaikan Transaksi & Cetak Struk',
        action: 'Menyimpan transaksi pembayaran dan mencetak struk belanja thermal.',
        context: 'Halaman Kasir & Pembelian',
      },
      {
        key: 'Delete / Backspace',
        description: 'Hapus Item dari Keranjang',
        action: 'Menghapus baris produk yang dipilih dari keranjang belanja kasir.',
        context: 'Tabel Keranjang Belanja',
      },
      {
        key: 'Escape',
        description: 'Tutup Dialog / Batal',
        action: 'Menutup jendela pop-up dialog yang sedang terbuka atau membatalkan pilihan.',
        context: 'Semua Dialog Kasir',
      },
    ],
  },
  {
    category: 'Gudang & Mutasi Transfer (/warehouse/transfers)',
    description: 'Pintasan pembuatan dokumen mutasi stok logistik dan penerimaan barang fisik.',
    items: [
      {
        key: 'F2',
        description: 'Tambah Baris Barang Transfer',
        action: 'Menambah baris baru pada form pengiriman transfer barang antar cabang.',
        context: 'Form Transfer Baru',
      },
      {
        key: 'F9',
        description: 'Kirim Dokumen Transfer',
        action: 'Mengubah status transfer menjadi Dalam Pengiriman dan mencetak Surat Jalan.',
        context: 'Detail Transfer',
      },
      {
        key: 'Escape',
        description: 'Kembali / Batal',
        action: 'Membatalkan aksi atau menutup dialog konfirmasi transfer.',
        context: 'Halaman Transfer',
      },
    ],
  },
  {
    category: 'Cetak Massal Label Barcode (/bulk-print)',
    description: 'Pintasan untuk mencetak stiker barcode rak atau kemasan produk dalam jumlah banyak.',
    items: [
      {
        key: 'F2',
        description: 'Tambah Barang ke Antrean Cetak',
        action: 'Membuka pencarian barang untuk ditambahkan ke daftar antrean cetak stiker.',
        context: 'Halaman Cetak Massal',
      },
      {
        key: 'F4',
        description: 'Pratinjau Tata Letak Cetak',
        action: 'Membuka dialog pratinjau tata letak barcode sebelum dicetak ke kertas stiker.',
        context: 'Halaman Cetak Massal',
      },
      {
        key: 'F9',
        description: 'Mulai Proses Cetak Barcode',
        action: 'Membuat dokumen PDF cetak label dan membuka dialog printer thermal.',
        context: 'Halaman Cetak Massal',
      },
      {
        key: 'Delete',
        description: 'Hapus Barang dari Antrean Cetak',
        action: 'Menghapus barang terpilih dari daftar antrean cetak label.',
        context: 'Tabel Antrean Cetak',
      },
      {
        key: 'Escape',
        description: 'Tutup Pratinjau Cetak',
        action: 'Menutup dialog pratinjau tata letak cetak.',
        context: 'Modal Pratinjau',
      },
    ],
  },
  {
    category: 'Navigasi Global & Katalog (/inventory)',
    description: 'Pintasan universal yang dapat digunakan di seluruh halaman aplikasi BMS.',
    items: [
      {
        key: 'Ctrl + K  /  ⌘ + K',
        description: 'Pencarian Cepat Global',
        action: 'Membuka bilah pencarian universal untuk mencari produk, menu, atau bantuan.',
        context: 'Seluruh Halaman',
      },
      {
        key: 'Shift + /  ( ? )',
        description: 'Bantuan Pintasan Tombol',
        action: 'Membuka panduan pintasan tombol pada halaman yang sedang aktif.',
        context: 'Katalog & Kasir',
      },
      {
        key: 'Ctrl + S  /  ⌘ + S',
        description: 'Simpan Perubahan',
        action: 'Menyimpan form data tanpa harus mengklik tombol Simpan.',
        context: 'Katalog & Form Editor',
      },
      {
        key: 'Escape',
        description: 'Tutup Dialog / Batal Pilihan',
        action: 'Menutup pop-up dialog, panel geser, atau menu dropdown yang sedang terbuka.',
        context: 'Seluruh Halaman',
      },
    ],
  },
];
