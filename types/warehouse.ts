import { InventoryItem } from './inventory';

export type TipeGudang = 'PUSAT' | 'CABANG' | 'RETUR' | 'TRANSIT';

export interface Gudang {
  id: string;
  kode_gudang: string;
  nama: string;
  tipe: TipeGudang;
  alamat?: string | null;
  penanggung_jawab?: string | null;
  kontak_pj?: string | null;
  lokasi_kerja_id?: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryStock {
  id: string;
  inventory_id: string;
  gudang_id: string;
  stok: number;
  min_stok: number | null;
  max_stok: number | null;
  rak_lokasi: string | null;
  created_at?: string;
  updated_at?: string;
  gudang?: Gudang;
  inventory?: InventoryItem;
}

export interface WarehouseItemStock {
  inventory_id: string;
  nama_barang: string;
  kode_barcode: string;
  harga_beli_terakhir: number | null;
  harga_jual: number;
  unit: string | null;
  id_kategori?: { id: string; nama: string } | null;
  stok_gudang: number;
  min_stok: number;
  max_stok: number | null;
  rak_lokasi: string | null;
  stok_global: number;
}

export type StatusTransfer =
  | 'DRAFT'
  | 'REQUESTED'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELED';

export interface TransferStokItem {
  id: string;
  transfer_id: string;
  inventory_id: string;
  qty_kirim: number;
  qty_terima: number;
  catatan?: string | null;
  created_at?: string;
  inventory?: {
    id: string;
    nama_barang: string;
    kode_barcode: string;
    unit?: string | null;
    harga_beli_terakhir?: number | null;
    harga_jual?: number | null;
  };
}

export interface TransferStok {
  id: string;
  nomor_transfer: string;
  gudang_asal_id: string;
  gudang_tujuan_id: string;
  status: StatusTransfer;
  tanggal_kirim?: string | null;
  tanggal_terima?: string | null;
  kurir_pengirim?: string | null;
  catatan?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  received_by?: string | null;
  created_at: string;
  updated_at: string;
  gudang_asal?: Gudang;
  gudang_tujuan?: Gudang;
  created_by_profile?: { id: string; nama: string };
  approved_by_profile?: { id: string; nama: string };
  received_by_profile?: { id: string; nama: string };
  items?: TransferStokItem[];
  total_items?: number;
  total_qty_kirim?: number;
  total_qty_terima?: number;
}

export type TipePengeluaranGudang =
  | 'RUSAK'
  | 'KADALUARSA'
  | 'PEMAKAIAN_SENDIRI'
  | 'SAMPEL_PROMOSI'
  | 'SELISIH_HILANG'
  | 'LAINNYA';

export interface PengeluaranGudangItem {
  id: string;
  pengeluaran_id: string;
  inventory_id: string;
  qty: number;
  harga_pokok: number;
  alasan?: string | null;
  created_at?: string;
  inventory?: {
    id: string;
    nama_barang: string;
    kode_barcode: string;
    unit?: string | null;
  };
}

export type StatusPengeluaranGudang = 'DRAFT' | 'APPROVED' | 'REJECTED';

export interface PengeluaranGudang {
  id: string;
  nomor_dokumen: string;
  gudang_id: string;
  tipe: TipePengeluaranGudang;
  tanggal: string;
  status: StatusPengeluaranGudang;
  catatan?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_note?: string | null;
  created_at: string;
  updated_at?: string;
  gudang?: Gudang;
  created_by_profile?: { id: string; nama: string };
  approved_by_profile?: { id: string; nama: string };
  items?: PengeluaranGudangItem[];
  total_items?: number;
  total_qty?: number;
  total_nominal?: number;
}

export interface WarehouseSummary {
  total_gudang: number;
  total_item_unique: number;
  total_stok_pusat: number;
  total_stok_cabang: number;
  total_transfer_in_transit: number;
  total_low_stock_items: number;
}
