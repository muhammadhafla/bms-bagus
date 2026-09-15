export interface InventoryItem {
  id: string;
  nama_barang: string;
  slug?: string;
  kode_barcode?: string;
  harga_beli_terakhir?: number;
  harga_jual: number;
  stok: number;
  id_kategori?: {
    id: string;
    nama: string;
  };
  kategori?: {
    id: string;
    nama: string;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  minimum_stock?: number;
  unit?: string;
  diskon: number;
  harga_beli?: number;
  barcode?: string;
  updated_by?: string;
  is_discontinued?: boolean;
  discontinued_at?: string;
  discontinued_by?: string;
}

export interface InventoryFilters {
  search: string;
  kategori: string;
  lowStock: boolean;
}

export interface InventoryDeletionCheck {
  id: string;
  nama_barang: string;
  kode_barcode?: string;
  stok: number;
  can_delete: boolean;
  total_transactions: number;
  breakdown: {
    penjualan: number;
    pembelian: number;
    retur: number;
    opname: number;
    adjustment: number;
    transfer: number;
    pengeluaran_gudang: number;
  };
}

export interface MergeInventoryResult {
  success: boolean;
  merged_count: number;
  target_id: string;
  target_nama: string;
  source_names: string;
  transferred_stock: number;
}
