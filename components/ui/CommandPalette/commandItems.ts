'use client';

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
  IconSun,
  IconMoon,
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
  IconHelpCircle,
  IconShieldLock,
  IconBrandWhatsapp,
  IconLayoutSidebarLeftCollapse,
} from '@tabler/icons-react';

export interface CommandActionContext {
  toggleTheme: () => void;
  isDark: boolean;
  toggleSidebar: () => void;
  openLogoutModal: () => void;
  navigate: (href: string) => void;
}

export interface RolePermissions {
  isAdminUser: boolean;
  isFinanceUser: boolean;
  isWarehouseUser: boolean;
  isKepalaGudang: boolean;
  isKasir: boolean;
}

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'menu' | 'action';
  href?: string;
  icon: React.ElementType;
  keywords: string[];
  shortcut?: string;
  badge?: string | number;
  isSuggestedForRole?: (perms: RolePermissions) => boolean;
  isAllowedForRole?: (perms: RolePermissions) => boolean;
  perform?: (ctx: CommandActionContext) => void;
}

export const ALL_COMMAND_ITEMS: CommandItem[] = [
  // --- DASHBOARD & UTAMA ---
  {
    id: 'nav-dashboard',
    title: 'Dashboard Utama',
    subtitle: 'Ringkasan metriks & status toko',
    category: 'menu',
    href: '/dashboard',
    icon: IconLayoutDashboard,
    keywords: ['dashboard', 'beranda', 'home', 'ringkasan', 'metrik', 'omset'],
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
  },

  // --- WAREHOUSE & GUDANG ---
  {
    id: 'nav-warehouse-stocks',
    title: 'Stok per Gudang',
    subtitle: 'Monitoring inventaris antar lokasi gudang & toko',
    category: 'menu',
    href: '/warehouse/stocks',
    icon: IconBuildingWarehouse,
    keywords: ['gudang', 'warehouse', 'stok gudang', 'lokasi', 'rak', 'bin'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-warehouse-transfers',
    title: 'Mutasi & Transfer Stok',
    subtitle: 'Surat jalan & perpindahan barang antar gudang',
    category: 'menu',
    href: '/warehouse/transfers',
    icon: IconTruck,
    keywords: ['transfer', 'mutasi', 'surat jalan', 'kirim barang', 'terima stok'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-warehouse-outbound',
    title: 'Pengeluaran Khusus Gudang',
    subtitle: 'Barang rusak, kadaluarsa, atau kebutuhan operasional',
    category: 'menu',
    href: '/warehouse/outbound',
    icon: IconTrash,
    keywords: ['outbound', 'barang rusak', 'kadaluarsa', 'afkir', 'buang barang'],
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-warehouse-master',
    title: 'Master Gudang & Outlet',
    subtitle: 'Daftar gudang, toko pusat, dan toko cabang',
    category: 'menu',
    href: '/warehouse/master',
    icon: IconBuildingWarehouse,
    keywords: ['master gudang', 'tambah gudang', 'cabang', 'outlet'],
    isAllowedForRole: (p) => p.isAdminUser,
  },

  // --- INVENTORY & CETAK ---
  {
    id: 'nav-inventory',
    title: 'Katalog Produk',
    subtitle: 'Daftar master produk, SKU, barcode, dan harga',
    category: 'menu',
    href: '/inventory',
    icon: IconPackage,
    keywords: ['produk', 'katalog', 'barang', 'sku', 'barcode', 'harga jual', 'inventory'],
    isSuggestedForRole: (p) => p.isAdminUser || p.isWarehouseUser,
    isAllowedForRole: () => true,
  },
  {
    id: 'nav-stock-opname',
    title: 'Stock Opname',
    subtitle: 'Audit fisik dan rekonsiliasi selisih stok',
    category: 'menu',
    href: '/inventory/stock-opname',
    icon: IconClipboardCheck,
    keywords: ['opname', 'stock opname', 'audit fisik', 'hitung stok', 'selisih'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-bulk-print',
    title: 'Cetak Massal Barcode',
    subtitle: 'Cetak label barcode termal rak & gantung',
    category: 'menu',
    href: '/bulk-print',
    icon: IconPrinter,
    keywords: ['cetak barcode', 'print barcode', 'thermal', 'label harga', 'bulk print'],
    isSuggestedForRole: (p) => p.isWarehouseUser,
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-print-history',
    title: 'Riwayat Cetak Label',
    subtitle: 'Log dokumen dan cetakan label sebelumnya',
    category: 'menu',
    href: '/print-history',
    icon: IconHistory,
    keywords: ['riwayat cetak', 'log print', 'print history'],
    isAllowedForRole: (p) => p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-label-templates',
    title: 'Template Label Barcode',
    subtitle: 'Desain visual ukuran & tata letak stiker harga',
    category: 'menu',
    href: '/master/label-templates',
    icon: IconTags,
    keywords: ['template label', 'desain barcode', 'ukuran label', 'kustom stiker'],
    isAllowedForRole: (p) => p.isAdminUser,
  },

  // --- TRANSAKSI & POS SUPERVISOR ---
  {
    id: 'nav-pos-auth',
    title: 'Otorisasi POS (Supervisor)',
    subtitle: 'Persetujuan void, diskon manual, & ubah harga kasir',
    category: 'menu',
    href: '/admin/pos-auth',
    icon: IconShieldLock,
    keywords: ['otorisasi pos', 'pos auth', 'void', 'diskon manual', 'persetujuan kasir', 'approval'],
    isSuggestedForRole: (p) => p.isAdminUser || p.isKepalaGudang,
    isAllowedForRole: (p) => p.isAdminUser || p.isKepalaGudang,
  },
  {
    id: 'nav-transactions-history',
    title: 'Riwayat Transaksi Penjualan',
    subtitle: 'Daftar struk nota penjualan dari seluruh kasir',
    category: 'menu',
    href: '/transactions/history',
    icon: IconHistory,
    keywords: ['riwayat transaksi', 'penjualan kasir', 'nota', 'struk', 'invoice'],
    isAllowedForRole: (p) => p.isKasir || p.isAdminUser || p.isFinanceUser,
  },
  {
    id: 'nav-transactions-return',
    title: 'Retur Penjualan',
    subtitle: 'Penerimaan pengembalian barang dari pelanggan',
    category: 'menu',
    href: '/transactions/return',
    icon: IconArrowBack,
    keywords: ['retur', 'retur penjualan', 'kembalikan barang', 'tukar barang'],
    isAllowedForRole: (p) => p.isKasir || p.isWarehouseUser || p.isAdminUser,
  },
  {
    id: 'nav-purchasing',
    title: 'Pembelian & PO Supplier',
    subtitle: 'Pengadaan barang masuk dari pemasok',
    category: 'menu',
    href: '/purchasing',
    icon: IconShoppingCart,
    keywords: ['pembelian', 'purchasing', 'po', 'order supplier', 'kulakan', 'beli stok'],
    isAllowedForRole: (p) => p.isAdminUser || p.isKepalaGudang || p.isFinanceUser,
  },

  // --- KEUANGAN & FINANCE ---
  {
    id: 'nav-finance-ledger',
    title: 'Buku Besar (General Ledger)',
    subtitle: 'Jurnal keuangan toko otomatis dari penjualan & operasional',
    category: 'menu',
    href: '/finance/ledger',
    icon: IconBook,
    keywords: ['buku besar', 'ledger', 'jurnal', 'keuangan', 'debit kredit', 'saldo'],
    isSuggestedForRole: (p) => p.isFinanceUser,
    isAllowedForRole: (p) => p.isFinanceUser || p.isAdminUser,
  },
  {
    id: 'nav-finance-cash-flow',
    title: 'Laporan Arus Kas (Cash Flow)',
    subtitle: 'Rekapitulasi kas masuk & kas keluar berkala',
    category: 'menu',
    href: '/finance/cash-flow',
    icon: IconReport,
    keywords: ['arus kas', 'cash flow', 'kas masuk', 'kas keluar', 'aliran uang'],
    isSuggestedForRole: (p) => p.isFinanceUser,
    isAllowedForRole: (p) => p.isFinanceUser || p.isAdminUser,
  },
  {
    id: 'nav-finance-operasional',
    title: 'Biaya Operasional Toko',
    subtitle: 'Pencatatan pengeluaran harian, listrik, & perlengkapan',
    category: 'menu',
    href: '/finance/operasional',
    icon: IconReceipt,
    keywords: ['biaya operasional', 'pengeluaran', 'beban', 'listrik', 'biaya toko'],
    isAllowedForRole: (p) => p.isFinanceUser || p.isAdminUser,
  },

  // --- PAYROLL & KEPEGAWAIAN ---
  {
    id: 'nav-payroll-kasbon-approval',
    title: 'Persetujuan Kasbon Karyawan',
    subtitle: 'Pengajuan EWA & pinjaman mandiri karyawan',
    category: 'menu',
    href: '/admin/payroll/kasbon',
    icon: IconWallet,
    keywords: ['kasbon', 'approval kasbon', 'ewa', 'pinjaman', 'gaji harian'],
    isSuggestedForRole: (p) => p.isAdminUser,
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-gaji-admin',
    title: 'Rekapitulasi Gaji Karyawan',
    subtitle: 'Hitung gaji pokok, tunjangan, denda telat, & slip gaji',
    category: 'menu',
    href: '/admin/payroll/gaji',
    icon: IconReport,
    keywords: ['payroll', 'gaji karyawan', 'slip gaji', 'proses gaji', 'hitung denda'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-kehadiran',
    title: 'Data Kehadiran & Absensi Staf',
    subtitle: 'Rekap jam masuk, keterlambatan, & pulang awal',
    category: 'menu',
    href: '/admin/payroll/kehadiran',
    icon: IconClock,
    keywords: ['kehadiran', 'absensi staf', 'telat', 'pulang awal', 'jam kerja'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-payroll-staff',
    title: 'Absensi Saya',
    subtitle: 'Catat absensi masuk & pulang mandiri',
    category: 'menu',
    href: '/payroll',
    icon: IconClock,
    keywords: ['absen', 'absensi saya', 'jam masuk', 'jam pulang'],
    isAllowedForRole: () => true,
  },
  {
    id: 'nav-payroll-dompet',
    title: 'Dompet Saya & Pengajuan Kasbon',
    subtitle: 'Lihat slip gaji pribadi & ajukan kasbon berjalan',
    category: 'menu',
    href: '/payroll/gaji',
    icon: IconWallet,
    keywords: ['dompet', 'slip gaji saya', 'ajukan kasbon', 'gaji saya'],
    isAllowedForRole: () => true,
  },

  // --- MEMBER & PROMOSI ---
  {
    id: 'nav-members',
    title: 'Master Member & Pelanggan',
    subtitle: 'Data pelanggan, nomor kontak, & saldo poin',
    category: 'menu',
    href: '/members',
    icon: IconUsersGroup,
    keywords: ['member', 'pelanggan', 'customer', 'loyalty', 'poin member'],
    isAllowedForRole: (p) => p.isAdminUser || p.isKasir,
  },
  {
    id: 'nav-members-tiers',
    title: 'Konfigurasi Tier Member',
    subtitle: 'Pengaturan level reward (Classic, Silver, Gold, Platinum)',
    category: 'menu',
    href: '/members/tiers',
    icon: IconSettings,
    keywords: ['tier member', 'level member', 'poin reward', 'diskon member'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-promo',
    title: 'Manajemen Diskon & Promo',
    subtitle: 'Voucher potongan harga, bundling, & promo belanja',
    category: 'menu',
    href: '/inventory/promo',
    icon: IconTicket,
    keywords: ['promo', 'diskon', 'voucher', 'potongan harga', 'sale'],
    isAllowedForRole: (p) => p.isAdminUser,
  },

  // --- ANALITIK & PENGATURAN ---
  {
    id: 'nav-analytics',
    title: 'Analitik & Laporan Penjualan',
    subtitle: 'Grafik omset, laba rugi, dan produk terlaris',
    category: 'menu',
    href: '/analytics',
    icon: IconChartBar,
    keywords: ['analitik', 'analytics', 'grafik penjualan', 'laba rugi', 'profit', 'laporan'],
    isSuggestedForRole: (p) => p.isAdminUser,
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-users',
    title: 'Manajemen Pengguna & Role',
    subtitle: 'Kelola akun staf, hak akses, dan gudang tugas',
    category: 'menu',
    href: '/users',
    icon: IconUsers,
    keywords: ['users', 'pengguna', 'akun', 'role', 'hak akses', 'password'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-wa-bridge',
    title: 'WhatsApp Bridge Integration',
    subtitle: 'Monitoring gateway notifikasi WhatsApp otomatis',
    category: 'menu',
    href: '/admin/wa-bridge',
    icon: IconBrandWhatsapp,
    keywords: ['whatsapp', 'wa bridge', 'notifikasi wa', 'pesan otomatis', 'gateway'],
    isAllowedForRole: (p) => p.isAdminUser,
  },
  {
    id: 'nav-help',
    title: 'Pusat Bantuan & Panduan',
    subtitle: 'Buku panduan penggunaan fitur & FAQ sistem',
    category: 'menu',
    href: '/help',
    icon: IconHelpCircle,
    keywords: ['bantuan', 'help', 'panduan', 'faq', 'tutorial', 'sop'],
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
  },

  // --- AKSI CEPAT SISTEM ---
  {
    id: 'act-toggle-theme',
    title: 'Ganti Mode Tampilan (Gelap / Terang)',
    subtitle: 'Beralih antara tema gelap dan terang seketika',
    category: 'action',
    icon: IconSun,
    keywords: ['tema', 'dark mode', 'light mode', 'gelap', 'terang', 'theme'],
    shortcut: 'Tema',
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
    perform: (ctx) => ctx.toggleTheme(),
  },
  {
    id: 'act-toggle-sidebar',
    title: 'Buka / Sembunyikan Sidebar',
    subtitle: 'Luaskan area kerja konten utama',
    category: 'action',
    icon: IconLayoutSidebarLeftCollapse,
    keywords: ['sidebar', 'menu samping', 'sembunyikan menu', 'collapse sidebar'],
    shortcut: 'Sidebar',
    isSuggestedForRole: () => true,
    isAllowedForRole: () => true,
    perform: (ctx) => ctx.toggleSidebar(),
  },
];

export function getFilteredCommands(perms: RolePermissions): CommandItem[] {
  return ALL_COMMAND_ITEMS.filter((item) => {
    if (!item.isAllowedForRole) return true;
    return item.isAllowedForRole(perms);
  });
}

export function getSuggestedCommands(perms: RolePermissions): CommandItem[] {
  const allowed = getFilteredCommands(perms);
  return allowed.filter((item) => {
    if (!item.isSuggestedForRole) return false;
    return item.isSuggestedForRole(perms);
  });
}
