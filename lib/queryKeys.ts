/**
 * Centralized Query Keys Factory
 * Mencegah key fragmentation/typo dan memudahkan invalidasi cache lintas modul.
 */

export const queryKeys = {
  // Inventory & Katalog
  inventory: {
    all: ['inventory'] as const,
    list: (filters?: Record<string, any>) => ['inventory', filters] as const,
    allData: () => ['inventory', 'all'] as const,
    lowStockCount: (filters?: Record<string, any>) => ['inventory', 'low-stock-count', filters] as const,
  },

  // Kategori
  kategori: {
    all: ['kategoris'] as const,
  },

  // Supplier
  suppliers: {
    all: ['suppliers'] as const,
  },

  // Gudang & Stok Gudang
  warehouse: {
    list: ['warehouse-list'] as const,
    masterList: ['warehouse-list-master'] as const,
    stocksAll: ['warehouse-stocks'] as const,
    stocks: (gudangId: string, filters?: Record<string, any>) =>
      ['warehouse-stocks', gudangId, filters] as const,
    outbounds: ['warehouse-outbounds'] as const,
    transfers: ['warehouse-transfers'] as const,
    summary: ['warehouse-summary'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    lowStock: () => ['dashboard', 'lowStock'] as const,
    transactions: () => ['dashboard', 'transactions'] as const,
    kasBalance: (userIdOrGlobal?: string) => ['dashboard', 'kasBalance', userIdOrGlobal] as const,
  },

  // Keuangan / Finance
  finance: {
    kasLog: (filters?: Record<string, any>) => ['kas_log', filters] as const,
    cashFlowSummary: (filters?: Record<string, any>) => ['cash_flow_summary', filters] as const,
    shiftSummary: (filters?: Record<string, any>) => ['shift_summary', filters] as const,
    bukuBesar: ['buku_besar'] as const,
    bukuBesarOpeningBalance: ['buku_besar_opening_balance'] as const,
    pengeluaranOperasional: ['pengeluaran_operasional'] as const,
  },

  // Riwayat Transaksi
  transactions: {
    penjualanAll: ['penjualan'] as const,
    pembelianAll: ['pembelian'] as const,
    returPenjualanAll: ['retur_penjualan'] as const,
    returPembelianAll: ['retur_pembelian'] as const,
  },

  // Payroll & Absensi
  payroll: {
    all: ['payroll'] as const,
    todayStatus: () => ['payroll', 'today_status'] as const,
    history: () => ['payroll', 'history'] as const,
    profile: () => ['payroll', 'profile'] as const,
    stores: () => ['payroll', 'stores'] as const,
    saldo: () => ['payroll', 'saldo'] as const,
    mutasi: () => ['payroll', 'mutasi'] as const,
    slip: () => ['payroll', 'slip'] as const,
    adminKaryawan: ['admin_payroll_karyawan'] as const,
    adminKehadiran: ['admin_payroll_kehadiran_paginated'] as const,
    adminTodaySummary: ['admin_today_kehadiran_summary'] as const,
    adminSaldo: ['admin_payroll_saldo'] as const,
    adminMutasi: ['admin_payroll_mutasi'] as const,
    adminKasbon: ['admin_payroll_kasbon'] as const,
    adminLokasiKerja: ['admin_lokasi_kerja'] as const,
  },

  // Promo
  promo: {
    all: ['promos'] as const,
    activeMap: ['activePromos'] as const,
  },

  // Help Docs
  help: {
    articles: ['help-articles'] as const,
    article: (slug: string) => ['help-article', slug] as const,
  },
};
