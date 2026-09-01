import { RoleInfo } from '../types';

export const ROLES_INFO: RoleInfo[] = [
  {
    id: 'admin',
    title: 'Administrator (Super Admin)',
    badgeVariant: 'danger',
    color: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300',
    summary:
      'Akses penuh ke seluruh modul sistem, pengaturan multi-cabang, kontrol keuangan, buku besar akuntansi, dan manajemen hak akses pengguna.',
    responsibilities: [
      'Akses bebas ke seluruh cabang dan gudang tanpa pembatasan lokasi',
      'Mengatur hak akses multi-peran dan penugasan lokasi cabang seluruh staf',
      'Melihat HPP, margin laba, laporan laba rugi, dan mengelola buku besar',
      'Mengesahkan dan membatalkan transaksi pada tingkat wewenang tertinggi',
      'Mengelola data master outlet, suplier, kategori produk, dan tingkatan member',
    ],
    restricted: [],
    keyModules: ['Dashboard', 'Katalog & HPP', 'Semua Gudang', 'Kasir (POS)', 'Buku Besar', 'Payroll & Gaji', 'Manajemen Pengguna'],
  },
  {
    id: 'kepala_gudang',
    title: 'Kepala Gudang (Warehouse Lead)',
    badgeVariant: 'warning',
    color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    summary:
      'Supervisor operasional logistik, penanggung jawab stok fisik gudang, opname, persetujuan barang rusak, dan pemesanan restock ke suplier.',
    responsibilities: [
      'Menyetujui dokumen penyesuaian selisih Stok Opname pada saldo sistem',
      'Meninjau dan menyetujui pengajuan barang rusak / kadaluarsa (Waste)',
      'Mengatur posisi rak (Bin Location) serta batas stok minimum dan maksimum',
      'Membuat pesanan pembelian barang masuk (PO) ke suplier distributor',
      'Memantau pengiriman barang antar cabang dan menjaga ketersediaan buffer stok',
    ],
    restricted: [
      'Tidak dapat melihat Harga Pokok Penjualan (HPP modal)',
      'Tidak dapat mengubah harga jual produk di toko',
      'Tidak dapat mengakses Buku Besar Akuntansi & Laporan Laba Rugi',
    ],
    keyModules: ['Stok per Gudang', 'Mutasi Transfer', 'Persetujuan Opname', 'Persetujuan Waste', 'Pesanan Suplier (PO)'],
  },
  {
    id: 'staff_gudang',
    title: 'Staf Gudang (Warehouse Staff)',
    badgeVariant: 'info',
    color: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300',
    summary:
      'Pelaksana teknis operasional gudang, pengiriman dan penerimaan mutasi barang antar cabang, penghitungan fisik opname, dan cetak label barcode.',
    responsibilities: [
      'Gudang asal otomatis terkunci sesuai lokasi cabang tugas staf',
      'Membuat surat jalan dan memproses pengiriman transfer stok ke cabang tujuan',
      'Melakukan verifikasi dan konfirmasi penerimaan fisik barang tiba',
      'Mengajukan draf pemusnahan barang rusak / kadaluarsa ke supervisor',
      'Melakukan input penghitungan fisik saat sesi Stok Opname',
      'Mencetak label stiker barcode untuk produk dan rak toko',
    ],
    restricted: [
      'Tidak dapat mengesahkan selisih Stok Opname (wajib persetujuan Kepala Gudang)',
      'Tidak dapat langsung memotong stok barang rusak tanpa persetujuan',
      'Tidak dapat melihat Harga Pokok Penjualan (HPP modal)',
    ],
    keyModules: ['Katalog Produk', 'Stok Cabang Tugas', 'Transfer Antar Gudang', 'Pengajuan Waste', 'Input Opname', 'Cetak Label'],
  },
  {
    id: 'kasir',
    title: 'Kasir (Frontliner / Kasir POS)',
    badgeVariant: 'success',
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    summary:
      'Melayani transaksi penjualan belanja pelanggan, penerimaan pembayaran multi-metode, pendaftaran member loyalitas, dan penanganan retur.',
    responsibilities: [
      'Mengoperasikan mesin kasir POS dengan pembaca barcode cepat',
      'Menerima pembayaran tunai, QRIS, transfer bank, tempo, atau pembayaran campuran',
      'Melihat riwayat nota belanja harian dan mencetak ulang struk kasir',
      'Mendaftarkan pelanggan ke program member dan menerapkan diskon otomatis',
      'Memproses penukaran barang atau retur dari pembeli sesuai prosedur',
    ],
    restricted: [
      'Tidak dapat melihat Harga Pokok Penjualan (HPP modal)',
      'Tidak memiliki akses ke modul stok gudang internal dan pembukuan akuntansi',
      'Tidak dapat menghapus data master barang atau mengubah harga jual master',
    ],
    keyModules: ['Kasir (POS)', 'Riwayat Transaksi', 'Retur Penjualan', 'Data Member & Loyalty'],
  },
  {
    id: 'finance',
    title: 'Keuangan & Akuntansi (Finance)',
    badgeVariant: 'default',
    color: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300',
    summary:
      'Pengelola arus kas toko, pencatatan biaya operasional, pembukuan buku besar akuntansi, perhitungan payroll gaji, dan evaluasi laba rugi.',
    responsibilities: [
      'Melihat nilai HPP, margin keuntungan, dan total nilai valuasi aset persediaan',
      'Mengelola Buku Besar, Jurnal Umum, dan Neraca Saldo Toko',
      'Mencatat mutasi arus kas masuk/keluar dan biaya operasional toko harian',
      'Memverifikasi kewajiban hutang dagang suplier dan tempo jatuh tempo',
      'Mengelola data absensi, persetujuan kasbon, dan slip gaji karyawan',
    ],
    restricted: [
      'Tidak melakukan intervensi fisik opname gudang (hanya menerima data laporan)',
    ],
    keyModules: ['Buku Besar (Ledger)', 'Arus Kas Operasional', 'HPP & Laba Rugi', 'Payroll & Kasbon', 'Hutang Suplier'],
  },
];
