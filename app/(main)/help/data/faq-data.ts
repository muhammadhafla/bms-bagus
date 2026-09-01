import { FaqItem } from '../types';

export const FAQ_DATA: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'role',
    question: 'Apakah satu orang staf dapat memiliki lebih dari satu peran (Multi-Role)?',
    answer:
      'Bisa. Sistem BMS berbasis Multi-Role. Administrator dapat menetapkan beberapa peran sekaligus untuk satu akun pengguna (misalnya: "Kasir" dan "Staf Gudang" sekaligus, atau "Kepala Gudang" dan "Kasir"). Hak akses yang didapatkan adalah akumulasi wewenang tertinggi dari peran-peran tersebut.',
  },
  {
    id: 'faq-2',
    category: 'role',
    question: 'Mengapa saya tidak dapat melihat kolom "Harga Pokok Penjualan (HPP)" pada tabel katalog?',
    answer:
      'Informasi Harga Pokok Penjualan (HPP) bersifat rahasia keuangan internal dan hanya dapat diakses oleh akun dengan peran "Administrator" atau "Keuangan (Finance)". Peran Staf Gudang, Kasir, dan Kepala Gudang tidak memiliki wewenang melihat HPP guna menjaga kerahasiaan margin laba bisnis.',
  },
  {
    id: 'faq-3',
    category: 'gudang',
    question: 'Mengapa pilihan "Gudang Asal" pada form transfer otomatis terkunci?',
    answer:
      'Fitur Penugasan Lokasi Cabang secara otomatis mengunci cabang pengirim sesuai lokasi tugas staf guna mencegah kesalahan mutasi stok. Hanya akun dengan wewenang Administrator dan Kepala Gudang yang dapat memilih cabang asal secara bebas antar seluruh cabang.',
  },
  {
    id: 'faq-4',
    category: 'gudang',
    question: 'Bagaimana prosedur jika terdapat barang rusak, pecah, atau kadaluarsa di gudang?',
    answer:
      'Staf Gudang dapat membuka menu Gudang -> Pengeluaran Khusus -> "Ajukan Pengeluaran (Draf)". Dokumen tersebut akan masuk ke daftar persetujuan Kepala Gudang atau Administrator sebelum saldo stok sistem dipotong.',
  },
  {
    id: 'faq-5',
    category: 'gudang',
    question: 'Kapan selisih hasil Stok Opname disesuaikan pada saldo sistem?',
    answer:
      'Saldo persediaan sistem baru akan disesuaikan setelah dokumen Stok Opname disetujui (Approved) oleh Kepala Gudang atau Administrator. Selama tahap penghitungan fisik oleh staf, angka saldo sistem belum berubah.',
  },
  {
    id: 'faq-6',
    category: 'kasir',
    question: 'Bagaimana cara kasir menerapkan diskon program member saat transaksi penjualan?',
    answer:
      'Saat melayani pelanggan di menu Kasir (/purchasing), tekan tombol F4 atau klik tombol Pelanggan. Cari nama atau scan nomor WhatsApp / barcode kartu member. Sistem secara otomatis mendeteksi tingkatan member (Bronze, Silver, Gold) dan mengaplikasikan potongan harga sesuai aturan tier.',
  },
  {
    id: 'faq-7',
    category: 'kasir',
    question: 'Bagaimana prosedur penanganan retur atau penukaran barang dari pembeli?',
    answer:
      'Buka menu Kasir -> Retur Penjualan (/transactions/return), masukkan nomor nota struk asal, pilih produk yang akan diretur, cantumkan alasan (misal: cacat pabrik), dan tentukan opsi pengembalian dana tunai atau penggantian barang sejenis.',
  },
  {
    id: 'faq-8',
    category: 'finance',
    question: 'Bagaimana cara mencatat uang modal kasir di awal hari kerja?',
    answer:
      'Buka menu Keuangan -> Arus Kas (/finance/cash-flow), klik "Tambah Mutasi Kas", pilih kategori "Modal Kasir / Kas Masuk", masukkan jumlah nominal modal di laci kasir, lalu simpan data.',
  },
  {
    id: 'faq-9',
    category: 'teknis',
    question: 'Apakah sistem BMS tetap dapat diakses saat koneksi internet terputus (Offline)?',
    answer:
      'Sistem BMS dilengkapi teknologi Service Worker PWA (Progressive Web App). Halaman dan data yang telah dimuat sebelumnya tetap dapat diakses dalam mode offline. Namun, untuk sinkronisasi transaksi penjualan dan pengiriman mutasi stok antar cabang, koneksi internet tetap diperlukan.',
  },
  {
    id: 'faq-10',
    category: 'teknis',
    question: 'Bagaimana jika GPS absensi mendeteksi lokasi saya di luar radius outlet?',
    answer:
      'Pastikan fitur Lokasi/GPS pada ponsel Anda aktif dengan akurasi tinggi (High Accuracy). Buka aplikasi peta digital seperti Google Maps sejenak untuk mengunci titik koordinat GPS, lalu kembali ke halaman Absensi BMS dan klik "Perbarui Lokasi GPS".',
  },
];

export const SUPPORT_INFO = {
  appName: 'BMS Enterprise Inventory & POS System',
  version: 'v2.4.0 (Multi-Role & Cloud Sync)',
  itSupport: {
    name: 'Tim IT & SysAdmin BMS',
    whatsapp: '0823-2470-3076',
    email: 'admin@gayabagus.shop',
    operationalHours: 'Senin - Sabtu: 07.30 - 21.00 WIB',
  },
  emergencyHotline: {
    description: 'Untuk kendala darurat operasional seperti server terputus atau printer kasir bermasalah saat jam sibuk toko:',
    phone: '0823-2470-3076',
  },
};
