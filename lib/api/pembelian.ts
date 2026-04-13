import { supabase } from './client';

export interface PembelianItem {
  id?: string;
  pembelian_id?: string;
  inventory_id: string;
  barcode?: string;
  nama_barang: string;
  qty: number;
  harga_beli: number;
  harga_jual?: number;
  diskon: number;
  harga_final: number;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface Pembelian {
  id: string;
  idempotency_key: string;
  supplier_id: string | null;
  tanggal: string;
  items: PembelianItem[];
  total: number;
  total_supplier: number;
  selisih: number;
  created_at: string;
}

export const pembelianApi = {
  async submit(data: {
    supplier_id: string | null | undefined;
    supplier_nama?: string | null;
    tanggal: string;
    items: PembelianItem[];
    total_supplier: number;
    note?: string;
    nomor_nota?: string;
    idempotency_key?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    if (!userId) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    try {
      // Prepare items for batch RPC - use harga_final (net price after diskon)
      const itemsPayload = data.items.map(item => ({
        nama_barang: item.nama_barang,
        qty: item.qty,
        harga: item.harga_final || 0
      }));

      const result = await supabase.rpc('tambah_pembelian_batch', {
        p_items: itemsPayload,
        p_supplier_id: data.supplier_id,
        p_tanggal: data.tanggal,
        p_user: userId
      });

      if (result.error) {
        console.error('RPC Error:', result.error);
        return { data: null, error: { message: result.error.message } };
      }

      return { data: { success: true, pembelian_id: result.data }, error: null };
    } catch (err: any) {
      console.error('Error submitting pembelian:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};