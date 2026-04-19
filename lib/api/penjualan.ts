import { supabase } from './client';
import { safeQuery, generateIdempotencyKey } from './utils';

export interface PenjualanItem {
  inventory_id: string;
  barcode: string;
  nama_barang: string;
  qty: number;
  harga_jual: number;
  diskon: number;
  harga_final: number;
  subtotal: number;
  cost_at_sale: number;
}

export interface Penjualan {
  id: string;
  idempotency_key: string;
  tanggal: string;
  items: PenjualanItem[];
  total: number;
  created_at: string;
}

export const penjualanApi = {
  async submit(data: {
    tanggal: string;
    items: PenjualanItem[];
    idempotency_key?: string;
  }) {
    const idempotencyKey = data.idempotency_key || generateIdempotencyKey();
    const { data: { user } } = await supabase.auth.getUser();
    
    const total = data.items.reduce((sum, item) => sum + item.subtotal, 0);

    const payload = {
      p_idempotency_key: idempotencyKey,
      p_tanggal: data.tanggal,
      p_created_by: user?.id ?? null,
      p_total: total,
      p_items: data.items.map(item => ({
        inventory_id: item.inventory_id,
        nama_barang: item.nama_barang,
        qty: item.qty,
        harga_jual: item.harga_jual,
        diskon: item.diskon,
        harga_final: item.harga_final,
        cost_at_sale: item.cost_at_sale,
      })),
    };

    return safeQuery(async () => {
      const result = await supabase.rpc('create_penjualan', payload);
      return { data: result.data, error: result.error as Error | null };
    });
  }
};