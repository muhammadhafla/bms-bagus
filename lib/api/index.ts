export { supabase } from './client';

export { inventoryApi } from './inventory';
export { purchasesApi, purchaseApi, type PembelianItem, type Pembelian } from './pembelian';
export { penjualanApi, type PenjualanItem, type Penjualan } from './penjualan';
export { returnApi, type ReturnItem, type ReturnedTransaction } from './return';
export { supplierApi, type Supplier } from './supplier';
export { reportApi, type StockMutation, type InventoryValue, type SalesSummary, type ProfitSummary, type PaginationOptions, type PaginatedResult, type TopSellingItem } from './reports';
export { receiptApi, type ReceiptTemplate, type ReceiptLogo } from './receipt';
export { kategoriApi, type Kategori } from './kategori';
export { stockOpnameApi, type StockOpname, type StockOpnameItem, type StockOpnameWithProfile } from './stockOpname';
export { stockAdjustmentApi, type StockAdjustment } from './stockAdjustment';
export { dashboardApi, type DashboardStats, type LowStockItem, type TrendData, type RecentTransaction } from './dashboard';
export { analyticsApi, type BusiestHour, type CategoryPerformance, type PaymentMethods, type StockVelocity, type Profitability, type Atv, type ReturnAnalytics } from './analytics';
export { kasApi, type KasLogItem } from './kas';

export type { ApiError } from './utils';