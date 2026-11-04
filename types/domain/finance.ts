import type { Database } from '../supabase';

export type LedgerSumber = Database['public']['Enums']['ledger_sumber'];
export type LedgerTipe = Database['public']['Enums']['ledger_tipe'];

export type BukuBesarRow = Database['public']['Tables']['buku_besar']['Row'];
export type BukuBesarInsert = Database['public']['Tables']['buku_besar']['Insert'];
export type BukuBesarUpdate = Database['public']['Tables']['buku_besar']['Update'];

export interface BukuBesarEntry {
  id: string;
  tanggal: string;
  sumber: LedgerSumber;
  tipe_transaksi: LedgerTipe;
  nominal: number;
  keterangan: string;
  referensi_id?: string | null;
  gudang_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface CashFlowSummary {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoBersih: number;
  periodeAwal: string;
  periodeAkhir: string;
}

export interface OperasionalExpense {
  id: string;
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  bukti_url?: string | null;
  created_by?: string | null;
}
