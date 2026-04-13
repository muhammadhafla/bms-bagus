export interface InventoryItem {
  id: string;
  nama_barang: string;
  slug?: string;
  kode_barcode?: string;
  harga_beli_terakhir?: number;
  harga_jual: number;
  stok: number;
  id_kategori?: string;
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
}

export interface InventoryFilters {
  search: string;
  kategori: string;
  lowStock: boolean;
}