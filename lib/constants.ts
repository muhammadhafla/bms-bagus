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

export const UI_MESSAGES = {
  LOADING: 'Memuat...',
  NO_DATA: 'Tidak ada data',
  TRY_AGAIN: 'Coba lagi',
  CONFIRM_DELETE: 'Yakin ingin menghapus?',
  DELETE_SUCCESS: 'Berhasil dihapus',
  SAVE_SUCCESS: 'Berhasil disimpan',
  SUBMIT_SUCCESS: 'Berhasil submitted',
} as const;

export const INVENTORY_MESSAGES = {
  NO_ITEMS: 'Belum ada item inventaris',
  LOW_STOCK: 'Stok di bawah minimum',
  NOT_FOUND: 'Item tidak ditemukan',
  BARCODE_NOT_FOUND: 'Barcode tidak terdaftar',
  CREATE_SUCCESS: 'Item berhasil ditambahkan',
} as const;

export const STOCK_OPNAME_MESSAGES = {
  NO_OPNAME: 'Belum ada stock opname',
  CREATE_HINT: 'Klik tombol di atas untuk membuat opname baru',
  DELETE_CONFIRM: 'Yakin ingin menghapus stock opname ini? Tindakan ini tidak dapat dibatalkan.',
  APPROVAL_PENDING: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  COMPLETED: 'Selesai',
  DRAFT: 'Draft',
  REASON_REQUIRED: 'Semua item dengan selisih harus memiliki alasan',
  ADMIN_ONLY: 'Hanya admin yang dapat melakukan approval',
} as const;