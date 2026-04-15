import { supabase } from './client';
import { safeQuery, queryToPromise, generateIdempotencyKey } from './utils';
import type { Penjualan } from './penjualan';

export interface ReturnItem {
  inventory_id: string;
  barcode: string;
  nama_barang: string;
  qty_original: number;
  qty_returned: number;
  qty_remaining: number;
  harga_beli: number;
  harga_jual: number;
  diskon: number;
  subtotal_original: number;
  return_qty: number;
  return_subtotal: number;
}

export interface AvailableReturnItem {
  pembelian_item_id: string;
  pembelian_id: string;
  inventory_id: string;
  nama_barang: string;
  harga_beli: number;
  diskon?: number;
  qty_original: number;
  qty_returned: number;
  qty_remaining: number;
  tanggal_pembelian: string;
  nomor_nota?: string;
  return_qty?: number;
  selected?: boolean;
  qty?: number;
}

export interface BatchReturnInput {
  supplier_id: string;
  supplier_nama: string;
  tanggal: string;
  note?: string;
  idempotency_key?: string;
  items: {
    pembelian_item_id: string;
    inventory_id: string;
    qty: number;
  }[];
}

export interface ReturnedTransaction {
  id: string;
  idempotency_key: string;
  tanggal: string;
  type: 'pembelian' | 'penjualan';
  supplier_id: string | null;
  items: ReturnItem[];
  total: number;
  total_returned: number;
  created_at: string;
}

export const returnApi = {
  async searchPembelian(query: string) {
    const safeQueryString = query.replace(/%/g, '').toLowerCase();
    return safeQuery<ReturnedTransaction[]>(
      queryToPromise(
        supabase
          .from('pembelian_transactions')
          .select('*')
          .or(`id.ilike.%${safeQueryString}%,supplier_id.ilike.%${safeQueryString}%`)
          .order('created_at', { ascending: false })
          .limit(20)
      )
    );
  },

  async searchPenjualan(query: string) {
    const safeQueryString = query.replace(/%/g, '').toLowerCase();
    return safeQuery<Penjualan[]>(
      queryToPromise(
        supabase
          .from('penjualan_transactions')
          .select('*')
          .or(`id.ilike.%${safeQueryString}%`)
          .order('created_at', { ascending: false })
          .limit(20)
      )
    );
  },

  async getPembelianItems(transactionId: string) {
    return safeQuery(queryToPromise(supabase.from('pembelian_items').select('*, inventory:inventory(*)').eq('transaction_id', transactionId)));
  },

  async getPenjualanItems(transactionId: string) {
    return safeQuery(queryToPromise(supabase.from('penjualan_items').select('*, inventory:inventory(*)').eq('transaction_id', transactionId)));
  },

  async submitPembelianReturn(data: {
    original_transaction_id: string;
    tanggal: string;
    note?: string;
    items: { pembelian_item_id: string; qty: number }[];
    idempotency_key?: string;
  }) {
    const idempotencyKey = data.idempotency_key || generateIdempotencyKey();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    return safeQuery(queryToPromise(supabase.rpc('pembelian_return_create', {
      p_pembelian_id: data.original_transaction_id,
      p_tanggal: data.tanggal,
      p_created_by: user.id,
      p_note: data.note ?? null,
      p_idempotency_key: idempotencyKey,
      p_items: data.items,
    })));
  },

  async submitPenjualanReturn(data: {
    original_transaction_id: string;
    tanggal: string;
    note?: string;
    items: { penjualan_item_id: string; qty: number }[];
    idempotency_key?: string;
  }) {
    const idempotencyKey = data.idempotency_key || generateIdempotencyKey();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    return safeQuery(queryToPromise(supabase.rpc('penjualan_return_create', {
      p_penjualan_id: data.original_transaction_id,
      p_tanggal: data.tanggal,
      p_created_by: user.id,
      p_note: data.note ?? null,
      p_idempotency_key: idempotencyKey,
      p_items: data.items,
    })));
  },

  async getAvailableItemsBySupplier(supplierId: string) {
    return safeQuery<AvailableReturnItem[]>(queryToPromise(
      supabase.rpc('get_available_return_items', { p_supplier_id: supplierId })
    ));
  },

  async submitBatchReturn(data: BatchReturnInput) {
    const idempotencyKey = data.idempotency_key || generateIdempotencyKey();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    return safeQuery(queryToPromise(supabase.rpc('proses_return_batch', {
      p_supplier_id: data.supplier_id,
      p_supplier_nama: data.supplier_nama,
      p_tanggal: data.tanggal,
      p_note: data.note ?? null,
      p_items: data.items,
      p_idempotency_key: idempotencyKey,
      p_created_by: user.id,
    })));
  },

  async getReturnDetail(returnId: string) {
    const [headerResult, itemsResult] = await Promise.all([
      supabase.from('pembelian_return').select('*').eq('id', returnId).single(),
      supabase.from('pembelian_return_items').select('*').eq('pembelian_return_id', returnId)
    ]);

    return {
      data: {
        ...headerResult.data,
        items: itemsResult.data
      },
      error: headerResult.error || itemsResult.error
    };
  },

  async getReturnList() {
    return safeQuery(queryToPromise(
      supabase
        .from('pembelian_return')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
    ));
  }
};