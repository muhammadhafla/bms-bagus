import React from 'react';
import {
  IconLayoutDashboard,
  IconPackage,
  IconShoppingCart,
  IconArrowBack,
  IconReport,
  IconReceipt,
  IconBook,
  IconClipboardCheck,
  IconUsers,
  IconUsersGroup,
  IconSettings,
  IconHistory,
  IconTruck,
  IconTags,
  IconChartBar,
  IconTicket,
  IconWallet,
  IconPrinter,
  IconClock,
  IconMapPin,
  IconBuildingWarehouse,
  IconTrash,
  IconShieldLock,
  IconBrandWhatsapp,
} from '@tabler/icons-react';

export interface RolePermissions {
  isAdminUser: boolean;
  isFinanceUser: boolean;
  isWarehouseUser: boolean;
  isKepalaGudang: boolean;
  isKasir: boolean;
}

export type NavSection =
  | 'dashboard'
  | 'operasional'
  | 'inventory'
  | 'warehouse'
  | 'finance'
  | 'payroll'
  | 'reports'
  | 'master';

export interface AppNavItem {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  section: NavSection;
  keywords?: string[];
  isAllowedForRole?: (perms: RolePermissions) => boolean;
  isSuggestedForRole?: (perms: RolePermissions) => boolean;
}

/**
 * SINGLE SOURCE OF TRUTH (SST) Navigasi Aplikasi
 * -----------------------------------------------
 * Seluruh modul dan rute menu aplikasi didaftarkan di sini.
 * Penambahan rute baru di sini akan OTOMATIS:
 * 1. Terdeteksi dan dapat dicari di Command Palette (Ctrl+K).
 * 2. Muncul di grup yang sesuai pada Sidebar navigasi.
 */
export const APP_NAVIGATION_ITEMS: AppNavItem[] = [
  // --- DASHBOARD ---
  {
    id: 'nav-dashboard',
    href: '/dashboard',
    title: 'Dashboard',
    subtitle: 'Ringkasan metriks & status toko',
    icon: IconLayoutDashboard,
    section: 'dashboard',
    keywords: ['dashboard', 'beranda', 'home', 'ringkasan', 'metrik', 'omset'],
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
  },

  // --- OPERASIONAL ---
  {
    id: 'nav-purchasing',
    href: '/purchasing',
    title: 'Transaksi Baru',
    subtitle: 'Pengadaan barang & transaksi kasir masuk',
    icon: IconShoppingCart,
    section: 'operasional',
    keywords: ['pembelian', 'purchasing', 'order supplier', 'beli stok'],
    isAllowedForRole: (p) => p.isAdminUser || p.isKepalaGudang || p.isFinanceUser,
  },
  {
    id: 'nav-transactions-history',
    href: '/transactions/history',
    title: 'Riwayat Transaksi',
    subtitle: 'Daftar struk nota penjualan dari seluruh kasir',
    icon: IconHistory,
    section: 'operasional',
    keywords: ['riwayat transaksi', 'penjualan kasir', 'nota', 'struk', 'invoice'],
    isAllowedForRole: (p) => p.isKasir || p.isAdminUser || p.isFinanceUser,
  },
  {
    id: 'nav-transactions-return',
    href: '/transactions/return',
    title: 'Retur',
    subtitle: 'Penerimaan pengembalian barang dari pelanggan',
    icon: IconArrowBack,
    section: 'operasional',
    keywords: ['retur', 'retur penjualan', 'kembalikan barang', 'tukar barang'],
    isAllowedForRole: (p) => p.isKasir || p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-promo',
    href: '/inventory/promo',
    title: 'Manajemen Promo',
    subtitle: 'Voucher potongan harga, bundling, & promo belanja',
    icon: IconTicket,
    section: 'operasional',
    keywords: ['promo', 'diskon', 'voucher', 'potongan harga', 'sale'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-pos-auth',
    href: '/admin/pos-auth',
    title: 'Otorisasi POS',
    subtitle: 'Persetujuan void, diskon manual, & ubah harga kasir',
    icon: IconShieldLock,
    section: 'operasional',
    keywords: ['otorisasi pos', 'pos auth', 'void', 'diskon manual', 'persetujuan kasir', 'approval'],
    isSuggestedForRole: (p) => p.isAdminUser || p.isKepalaGudang,
    isAllowedForRole: (p) => p.isAdminUser || p.isKepalaGudang,
  },
  {
    id: 'nav-wa-bridge',
    href: '/admin/wa-bridge',
    title: 'WhatsApp Bridge',
    subtitle: 'Monitoring gateway notifikasi WhatsApp otomatis',
    icon: IconBrandWhatsapp,
    section: 'operasional',
    keywords: ['whatsapp', 'wa bridge', 'notifikasi wa', 'pesan otomatis', 'gateway'],
    isAllowedForRole: (p) => p.isAdminUser,
  },

  // --- INVENTORY ---
  {
    id: 'nav-inventory',
    href: '/inventory',
    title: 'Katalog Produk',
    subtitle: 'Daftar master produk, SKU, barcode, dan harga',
    icon: IconPackage,
    section: 'inventory',
    keywords: ['produk', 'katalog', 'barang', 'sku', 'barcode', 'harga jual', 'inventory'],
    isSuggestedForRole: (p) => p.isAdminUser || p.isWarehouseUser,
    isAllowedForRole: () => true,
  },
  {
    id: 'nav-stock-opname',
    href: '/inventory/stock-opname',
    title: 'Stok Opname',
    subtitle: 'Audit fisik dan rekonsiliasi selisih stok',
    icon: IconClipboardCheck,
    section: 'inventory',
    keywords: ['opname', 'stock opname', 'audit fisik', 'hitung stok', 'selisih'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-bulk-print',
    href: '/bulk-print',
    title: 'Cetak Massal',
    subtitle: 'Cetak label barcode termal rak & gantung',
    icon: IconPrinter,
    section: 'inventory',
    keywords: ['cetak barcode', 'print barcode', 'thermal', 'label harga', 'bulk print'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-print-history',
    href: '/print-history',
    title: 'Riwayat Cetak',
    subtitle: 'Log dokumen dan cetakan label sebelumnya',
    icon: IconHistory,
    section: 'inventory',
    keywords: ['riwayat cetak', 'log print', 'print history'],
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },

  // --- WAREHOUSE ---
  {
    id: 'nav-warehouse-stocks',
    href: '/warehouse/stocks',
    title: 'Stok per Gudang',
    subtitle: 'Monitoring inventaris antar lokasi gudang & toko',
    icon: IconBuildingWarehouse,
    section: 'warehouse',
    keywords: ['gudang', 'warehouse', 'stok gudang', 'lokasi', 'rak', 'bin'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-warehouse-transfers',
    href: '/warehouse/transfers',
    title: 'Mutasi & Transfer',
    subtitle: 'Surat jalan & perpindahan barang antar gudang',
    icon: IconTruck,
    section: 'warehouse',
    keywords: ['transfer', 'mutasi', 'surat jalan', 'kirim barang', 'terima stok'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-warehouse-outbound',
    href: '/warehouse/outbound',
    title: 'Pengeluaran Khusus',
    subtitle: 'Barang rusak, kadaluarsa, atau kebutuhan operasional',
    icon: IconTrash,
    section: 'warehouse',
    keywords: ['outbound', 'barang rusak', 'kadaluarsa', 'afkir', 'buang barang'],
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },

  // --- FINANCE ---
  {
    id: 'nav-finance-cash-flow',
    href: '/finance/cash-flow',
    title: 'Arus Kas',
    subtitle: 'Rekapitulasi kas masuk & kas keluar berkala',
    icon: IconReport,
    section: 'finance',
    keywords: ['arus kas', 'cash flow', 'kas masuk', 'kas keluar', 'aliran uang'],
    isSuggestedForRole: (p) => p.isFinanceUser,
    isAllowedForRole: (p) => p.isFinanceUser || p.isAdminUser,
  },
  {
    id: 'nav-finance-operasional',
    href: '/finance/operasional',
    title: 'Pengeluaran',
    subtitle: 'Pencatatan pengeluaran harian, listrik, & perlengkapan',
    icon: IconReceipt,
    section: 'finance',
    keywords: ['biaya operasional', 'pengeluaran', 'beban', 'listrik', 'biaya toko'],
    isAllowedForRole: (p) => p.isFinanceUser || p.isAdminUser,
  },
  {
    id: 'nav-finance-ledger',
    href: '/finance/ledger',
    title: 'Buku Besar',
    subtitle: 'Jurnal keuangan toko otomatis dari penjualan & operasional',
    icon: IconBook,
    section: 'finance',
    keywords: ['buku besar', 'ledger', 'jurnal', 'keuangan', 'debit kredit', 'saldo'],
    isSuggestedForRole: (p) => p.isFinanceUser,
    isAllowedForRole: (p) => p.isFinanceUser || p.isAdminUser,
  },

  // --- PAYROLL (ADMIN) ---
  {
    id: 'nav-payroll-kehadiran',
    href: '/admin/payroll/kehadiran',
    title: 'Data Kehadiran',
    subtitle: 'Rekap jam masuk, keterlambatan, & pulang awal staf',
    icon: IconClock,
    section: 'payroll',
    keywords: ['kehadiran', 'absensi staf', 'telat', 'pulang awal', 'jam kerja'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-kasbon-approval',
    href: '/admin/payroll/kasbon',
    title: 'Persetujuan Kasbon',
    subtitle: 'Pengajuan EWA & pinjaman mandiri karyawan',
    icon: IconWallet,
    section: 'payroll',
    keywords: ['kasbon', 'approval kasbon', 'ewa', 'pinjaman', 'gaji harian'],
    isSuggestedForRole: (p) => p.isAdminUser,
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-gaji-admin',
    href: '/admin/payroll/gaji',
    title: 'Dashboard Keuangan',
    subtitle: 'Hitung gaji pokok, tunjangan, denda telat, & slip gaji',
    icon: IconReport,
    section: 'payroll',
    keywords: ['payroll', 'gaji karyawan', 'slip gaji', 'proses gaji', 'hitung denda'],
    isAllowedForRole: (p) => p.isAdminUser,
  },

  // --- PAYROLL (STAFF) ---
  {
    id: 'nav-payroll-staff',
    href: '/payroll',
    title: 'Absensi',
    subtitle: 'Catat absensi masuk & pulang mandiri',
    icon: IconClock,
    section: 'payroll',
    keywords: ['absen', 'absensi saya', 'jam masuk', 'jam pulang'],
    isAllowedForRole: () => true,
  },
  {
    id: 'nav-payroll-dompet',
    href: '/payroll/gaji',
    title: 'Dompet Saya',
    subtitle: 'Lihat slip gaji pribadi & ajukan kasbon berjalan',
    icon: IconWallet,
    section: 'payroll',
    keywords: ['dompet', 'slip gaji saya', 'ajukan kasbon', 'gaji saya'],
    isAllowedForRole: () => true,
  },

  // --- REPORTS ---
  {
    id: 'nav-analytics',
    href: '/analytics',
    title: 'Analisis & Laporan',
    subtitle: 'Grafik omset, laba rugi, dan produk terlaris',
    icon: IconChartBar,
    section: 'reports',
    keywords: ['analitik', 'analytics', 'grafik penjualan', 'laba rugi', 'profit', 'laporan'],
    isSuggestedForRole: (p) => p.isAdminUser,
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-inventory-reports-difference',
    href: '/inventory/reports/difference',
    title: 'Laporan Selisih',
    subtitle: 'Audit selisih stok opname vs fisik',
    icon: IconReport,
    section: 'reports',
    keywords: ['selisih stok', 'laporan selisih', 'audit opname'],
    isAllowedForRole: (p) => p.isAdminUser || p.isFinanceUser,
  },

  // --- MASTER DATA ---
  {
    id: 'nav-users',
    href: '/users',
    title: 'Data Pengguna',
    subtitle: 'Kelola akun staf, hak akses, dan gudang tugas',
    icon: IconUsers,
    section: 'master',
    keywords: ['users', 'pengguna', 'akun', 'role', 'hak akses', 'password'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-karyawan',
    href: '/admin/payroll/karyawan',
    title: 'Data Karyawan',
    subtitle: 'Data profil karyawan, gaji pokok, & tunjangan',
    icon: IconUsers,
    section: 'master',
    keywords: ['karyawan', 'data staf', 'master karyawan', 'biodata'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-members',
    href: '/members',
    title: 'Master Member',
    subtitle: 'Data pelanggan, nomor kontak, & saldo poin',
    icon: IconUsersGroup,
    section: 'master',
    keywords: ['member', 'pelanggan', 'customer', 'loyalty', 'poin member'],
    isAllowedForRole: (p) => p.isAdminUser || p.isKasir,
  },
  {
    id: 'nav-members-tiers',
    href: '/members/tiers',
    title: 'Konfigurasi Tier',
    subtitle: 'Pengaturan level reward (Classic, Silver, Gold, Platinum)',
    icon: IconSettings,
    section: 'master',
    keywords: ['tier member', 'level member', 'poin reward', 'diskon member'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-kategori',
    href: '/inventory/kategori',
    title: 'Kategori Barang',
    subtitle: 'Hierarki kategori dan klasifikasi produk',
    icon: IconTags,
    section: 'master',
    keywords: ['kategori barang', 'kelompok produk', 'tags'],
    isAllowedForRole: (p) => p.isAdminUser || p.isKepalaGudang,
  },
  {
    id: 'nav-supplier',
    href: '/purchasing/supplier',
    title: 'Data Supplier',
    subtitle: 'Daftar vendor, distributor, dan alamat kontak',
    icon: IconTruck,
    section: 'master',
    keywords: ['supplier', 'vendor', 'pemasok', 'distributor'],
    isAllowedForRole: (p) => p.isAdminUser || p.isKepalaGudang,
  },
  {
    id: 'nav-warehouse-master',
    href: '/warehouse/master',
    title: 'Master Gudang',
    subtitle: 'Daftar gudang, toko pusat, dan toko cabang',
    icon: IconBuildingWarehouse,
    section: 'master',
    keywords: ['master gudang', 'tambah gudang', 'cabang', 'outlet'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-label-templates',
    href: '/master/label-templates',
    title: 'Template Label',
    subtitle: 'Desain visual ukuran & tata letak stiker harga',
    icon: IconTags,
    section: 'master',
    keywords: ['template label', 'desain barcode', 'ukuran label', 'kustom stiker'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-lokasi-kerja',
    href: '/admin/payroll/lokasi-kerja',
    title: 'Lokasi Outlet',
    subtitle: 'Geofencing radius absensi dan penempatan kerja',
    icon: IconMapPin,
    section: 'master',
    keywords: ['lokasi outlet', 'geofencing', 'koordinat kerja', 'lokasi cabang'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
];

// Helper untuk menyaring item navigasi berdasarkan section
export const getNavItemsBySection = (section: NavSection): AppNavItem[] => {
  return APP_NAVIGATION_ITEMS.filter((item) => item.section === section);
};
