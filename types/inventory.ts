export interface InventoryItem {
  id: string;
  nama_barang: string;
  slug?: string | null;
  kode_barcode?: string;
  harga_beli_terakhir?: number | null;
  harga_jual: number;
  stok: number | null;
  id_kategori?:
    | {
        id: string;
        nama: string;
        created_at?: string | null;
      }
    | string
    | null;
  kategori?: {
    id: string;
    nama: string;
  } | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  minimum_stock?: number | null;
  unit?: string | null;
  diskon: number | null;
  harga_beli?: number | null;
  barcode?: string;
  updated_by?: string | null;
  is_discontinued?: boolean | null;
  discontinued_at?: string | null;
  discontinued_by?: string | null;
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
