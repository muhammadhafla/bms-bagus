import { Database } from './supabase';

export type Supplier = Database['public']['Tables']['supplier']['Row'];
export type Template = Database['public']['Tables']['label_templates']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type PrintJob = Database['public']['Tables']['print_jobs']['Row'];
export type StockAdjustment = Database['public']['Tables']['stock_adjustments']['Row'];
export type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
export type StockOpname = Database['public']['Tables']['stock_opname']['Row'];
export type StockOpnameItem = Database['public']['Tables']['stock_opname_items']['Row'];
export type Pembelian = Database['public']['Tables']['pembelian']['Row'];
export type PembelianItem = Database['public']['Tables']['pembelian_items']['Row'];
export type Penjualan = Database['public']['Tables']['penjualan']['Row'];
export type PenjualanItem = Database['public']['Tables']['penjualan_items']['Row'];

export interface PrintPayload {
  id: string;
  kode_barcode: string;
  nama_barang: string;
  qty: number;
}
export type StockAdjustmentWithInventory = StockAdjustment & {
  inventory?: { nama_barang: string };
};
