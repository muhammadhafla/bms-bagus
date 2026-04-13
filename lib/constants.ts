export const DEBOUNCE_DELAY = 300;
export const DEFAULT_PAGE_LIMIT = 20;
export const REPORT_PAGE_LIMIT = 1000;
export const DEFAULT_TIMEOUT = 30000;
export const MAX_DISKON_PERCENT = 100;
export const MIN_QTY = 1;

export const ROUTES = {
  INVENTORY: '/inventory',
  PEMBELIAN: '/pembelian',
  PENJUALAN: '/penjualan',
  RETURN: '/return',
  REPORTS: '/reports',
  RECEIPT: '/receipt',
} as const;

export const STORAGE_KEYS = {
  IDEMPOTENCY_KEY: 'idempotency_key',
  LAST_SYNC: 'last_sync',
} as const;

export const API_ERROR_MESSAGES = {
  FETCH_FAILED: 'Gagal mengambil data',
  SAVE_FAILED: 'Gagal menyimpan data',
  DELETE_FAILED: 'Gagal menghapus data',
  NETWORK_ERROR: 'Error koneksi jaringan',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui',
} as const;