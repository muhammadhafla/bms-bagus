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
    adminPendingLemburCount: ['admin_pending_lembur_count'] as const,
    adminPendingPulangAwalCount: ['admin_pending_pulang_awal_count'] as const,
    adminPendingLemburList: ['admin_pending_lembur_list'] as const,
    adminPendingPulangAwalList: ['admin_pending_pulang_awal_list'] as const,
    adminSaldo: ['admin_payroll_saldo'] as const,
    adminMutasi: ['admin_payroll_mutasi'] as const,
    adminKasbon: ['admin_payroll_kasbon'] as const,
    adminPendingKasbonCount: ['admin_payroll_kasbon', 'pending_count'] as const,
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

  // POS Authorization
  posAuth: {
    all: ['pos-auth'] as const,
    active: ['pos-auth-active'] as const,
    history: ['pos-auth-history'] as const,
    historyList: (filters: Record<string, unknown>) =>
      ['pos-auth-history', filters] as const,
  },

  // Analytics & Reports
  analytics: {
    all: ['analytics'] as const,
    summary: (startDate: string, endDate: string) =>
      ['analytics', 'dashboard_summary', startDate, endDate] as const,
    returns: (startDate: string, endDate: string) =>
      ['analytics', 'returns', startDate, endDate] as const,
    salesTrend: (startDate: string, endDate: string, groupBy: string) =>
      ['analytics', 'salesTrend', startDate, endDate, groupBy] as const,
  },

  reports: {
    all: ['report'] as const,
    sales: (params: readonly unknown[]) => ['report', 'sales', ...params] as const,
    profit: (params: readonly unknown[]) => ['report', 'profit', ...params] as const,
    stock: (params: readonly unknown[]) => ['report', 'stock', ...params] as const,
    topItems: (params: readonly unknown[]) => ['report', 'top_items', ...params] as const,
    inventoryValue: (params: readonly unknown[]) =>
      ['report', 'inventory_value', ...params] as const,
  },

  // Ledger & Cash Flow
  ledger: {
    all: ['buku_besar'] as const,
    paginated: (filters: Record<string, unknown>) =>
      ['buku_besar', 'paginated', filters] as const,
    printPreview: (filters: Record<string, unknown>) =>
      ['buku_besar', 'print_preview', filters] as const,
  },

  cashFlow: {
    kasLog: ['kas_log'] as const,
    kasSummary: ['kas_summary'] as const,
    cashFlowSummary: ['cash_flow_summary'] as const,
    shiftSummary: ['shift_summary'] as const,
    shiftBalance: ['shift_balance'] as const,
    activeShifts: ['active-shifts'] as const,
    operasional: ['pengeluaran_operasional'] as const,
  },

  // Warehouse Operations
  warehouseOps: {
    masterList: ['warehouse-list-master'] as const,
    transfers: ['warehouse-transfers'] as const,
    outbounds: ['warehouse-outbounds'] as const,
    summary: ['warehouse-summary'] as const,
  },

  // Members, Users, Loyalty
  members: {
    all: ['members'] as const,
  },
  users: {
    all: ['users'] as const,
  },
  loyalty: {
    all: ['loyalty'] as const,
  },
};

export interface QueryInvalidator {
  invalidateQueries: (options: { queryKey: readonly unknown[] }) => Promise<unknown> | void;
}

/**
 * Helper invalidasi lintas modul setelah mutasi inventaris / stok gudang.
 */
export async function invalidateInventoryMutation(client: QueryInvalidator) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.inventory.all }),
    client.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll }),
    client.invalidateQueries({ queryKey: queryKeys.warehouseOps.summary }),
    client.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}

/**
 * Helper invalidasi lintas modul setelah mutasi kas / buku besar / kasbon.
 */
export async function invalidateFinanceMutation(client: QueryInvalidator) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.ledger.all }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.kasLog }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.kasSummary }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.cashFlowSummary }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.shiftSummary }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.shiftBalance }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.activeShifts }),
    client.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}

/**
 * Helper invalidasi lintas modul setelah transaksi pembelian / retur stok.
 */
export async function invalidatePurchasingMutation(client: QueryInvalidator) {
  await Promise.all([
    invalidateInventoryMutation(client),
    client.invalidateQueries({ queryKey: queryKeys.transactions.pembelianAll }),
    client.invalidateQueries({ queryKey: queryKeys.ledger.all }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.kasLog }),
    client.invalidateQueries({ queryKey: queryKeys.cashFlow.cashFlowSummary }),
  ]);
}

/**
 * Helper invalidasi antrean & riwayat otorisasi POS realtime.
 */
export async function invalidatePosAuthMutation(client: QueryInvalidator) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.posAuth.active }),
    client.invalidateQueries({ queryKey: queryKeys.posAuth.history }),
  ]);
}

/**
 * Helper invalidasi mutasi gudang (transfer & pengeluaran barang).
 */
export async function invalidateWarehouseMutation(client: QueryInvalidator) {
  await Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.warehouse.stocksAll }),
    client.invalidateQueries({ queryKey: queryKeys.warehouseOps.transfers }),
    client.invalidateQueries({ queryKey: queryKeys.warehouseOps.outbounds }),
    client.invalidateQueries({ queryKey: queryKeys.warehouseOps.summary }),
  ]);
}
