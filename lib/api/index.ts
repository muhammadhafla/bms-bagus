export { supabase } from './client';

export { inventoryApi } from './inventory';
export { pembelianApi, type PembelianItem, type Pembelian } from './pembelian';
export { penjualanApi, type PenjualanItem, type Penjualan } from './penjualan';
export { returnApi, type ReturnItem, type ReturnedTransaction } from './return';
export { supplierApi, type Supplier } from './supplier';
export { reportApi, type StockMutation, type InventoryValue, type SalesSummary, type ProfitSummary } from './reports';
export { receiptApi, type ReceiptTemplate, type ReceiptLogo } from './receipt';
export { kategoriApi, type Kategori } from './kategori';
export { stockOpnameApi, type StockOpname, type StockOpnameItem } from './stockOpname';
export { stockAdjustmentApi, type StockAdjustment } from './stockAdjustment';
export { dashboardApi, type DashboardStats, type LowStockItem, type TrendData, type RecentTransaction } from './dashboard';

export type { ApiError } from './utils';