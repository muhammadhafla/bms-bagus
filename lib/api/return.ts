import { supabase } from './client';
import { safeQuery, generateIdempotencyKey } from './utils';
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
    return safeQuery<ReturnedTransaction[]>(async () => {
      const result = await supabase
        .from('pembelian_transactions')
        .select('*')
        .or(`id.ilike.%${safeQueryString}%,supplier_id.ilike.%${safeQueryString}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async searchPenjualan(query: string) {
    const safeQueryString = query.replace(/%/g, '').toLowerCase();
    return safeQuery<Penjualan[]>(async () => {
      const result = await supabase
        .from('penjualan_transactions')
        .select('*')
        .or(`id.ilike.%${safeQueryString}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getPembelianItems(transactionId: string) {
    return safeQuery(async () => {
      const result = await supabase.from('pembelian_items').select('*, inventory:inventory(*)').eq('transaction_id', transactionId);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getPenjualanItems(transactionId: string) {
    return safeQuery(async () => {
      const result = await supabase.from('penjualan_items').select('*, inventory:inventory(*)').eq('transaction_id', transactionId);
      return { data: result.data, error: result.error as Error | null };
    });
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

    return safeQuery(async () => {
      const result = await supabase.rpc('pembelian_return_create', {
        p_pembelian_id: data.original_transaction_id,
        p_tanggal: data.tanggal,
        p_created_by: user.id,
        p_note: data.note ?? null,
        p_idempotency_key: idempotencyKey,
        p_items: data.items,
      });
      return { data: result.data, error: result.error as Error | null };
    }, { isMutation: true });
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

    return safeQuery(async () => {
      const result = await supabase.rpc('penjualan_return_create', {
        p_penjualan_id: data.original_transaction_id,
        p_tanggal: data.tanggal,
        p_created_by: user.id,
        p_note: data.note ?? null,
        p_idempotency_key: idempotencyKey,
        p_items: data.items,
      });
      return { data: result.data, error: result.error as Error | null };
    }, { isMutation: true });
  },

  async getAvailableItemsBySupplier(supplierId: string) {
    return safeQuery<AvailableReturnItem[]>(async () => {
      const result = await supabase.rpc('get_available_return_items', { p_supplier_id: supplierId });
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async submitBatchReturn(data: BatchReturnInput) {
    const idempotencyKey = data.idempotency_key || generateIdempotencyKey();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'User not authenticated' } };

    return safeQuery(async () => {
      const result = await supabase.rpc('proses_return_batch', {
        p_supplier_id: data.supplier_id,
        p_supplier_nama: data.supplier_nama,
        p_tanggal: data.tanggal,
        p_note: data.note ?? null,
        p_items: data.items,
        p_idempotency_key: idempotencyKey,
        p_created_by: user.id,
      });
      return { data: result.data, error: result.error as Error | null };
    }, { isMutation: true });
  },

  async getReturnDetail(returnId: string) {
    const headerResult = await safeQuery<any>(async () => {
      const result = await supabase.from('pembelian_return').select('*').eq('id', returnId).single();
      return { data: result.data, error: result.error as Error | null };
    });
    const itemsResult = await safeQuery<any[]>(async () => {
      const result = await supabase.from('pembelian_return_items').select('*').eq('pembelian_return_id', returnId);
      return { data: result.data, error: result.error as Error | null };
    });

    return {
      data: {
        ...headerResult.data,
        items: itemsResult.data
      },
      error: headerResult.error || itemsResult.error
    };
  },

  async getReturnList() {
    return safeQuery(async () => {
      const result = await supabase
        .from('pembelian_return')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getAllPenjualanReturns(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    try {
      const sortBy = options?.sortBy || 'created_at';
      const isAscending = options?.sortDir === 'asc';

      let query = supabase
        .from('penjualan_return')
        .select('*, items:penjualan_return_items(harga_final, qty)', { count: 'exact' })
        .order(sortBy, { ascending: isAscending });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      if (options?.search) query = query.ilike('id', `%${options.search}%`);
      if (options?.startDate) query = query.gte('tanggal', options.startDate);
      if (options?.endDate) query = query.lte('tanggal', options.endDate);

      const result = await safeQuery<{ data: any[], count: number | null }>(async () => {
        const res = await query;
        return { data: { data: res.data as any[], count: res.count }, error: res.error as Error | null };
      });
      
      if (result.error) return { data: null, error: result.error, total: 0 };
      
      const transformedData = result.data?.data?.map(item => {
        const total = item.items?.reduce((sum: number, returnItem: any) => sum + (returnItem.harga_final * returnItem.qty), 0) || 0;
        return { ...item, total };
      });
      
      return { data: transformedData || null, total: result.data?.count || 0, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message }, total: 0 };
    }
  },

  async getAllPembelianReturns(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    try {
      const sortBy = options?.sortBy || 'created_at';
      const isAscending = options?.sortDir === 'asc';

      let query = supabase
        .from('pembelian_return')
        .select('*, items:pembelian_return_items(harga_final, qty)', { count: 'exact' })
        .order(sortBy, { ascending: isAscending });

      if (options?.limit) query = query.limit(options.limit);
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      if (options?.search) query = query.or(`id.ilike.%${options.search}%,supplier_nama.ilike.%${options.search}%`);
      if (options?.startDate) query = query.gte('tanggal', options.startDate);
      if (options?.endDate) query = query.lte('tanggal', options.endDate);

      const result = await safeQuery<{ data: any[], count: number | null }>(async () => {
        const res = await query;
        return { data: { data: res.data as any[], count: res.count }, error: res.error as Error | null };
      });
      
      if (result.error) return { data: null, error: result.error, total: 0 };
      
      const transformedData = result.data?.data?.map(item => {
        const total = item.items?.reduce((sum: number, returnItem: any) => sum + (returnItem.harga_final * returnItem.qty), 0) || 0;
        return { ...item, total };
      });
      
      return { data: transformedData || null, total: result.data?.count || 0, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message }, total: 0 };
    }
  },

  async getPenjualanReturnDetail(returnId: string) {
    const headerResult = await safeQuery<any>(async () => {
      const result = await supabase.from('penjualan_return').select('*').eq('id', returnId).single();
      return { data: result.data, error: result.error as Error | null };
    });
    const itemsResult = await safeQuery<any[]>(async () => {
      const result = await supabase.from('penjualan_return_items').select('*').eq('penjualan_return_id', returnId);
      return { data: result.data, error: result.error as Error | null };
    });

    return {
      data: {
        ...headerResult?.data,
        items: itemsResult?.data
      },
      error: headerResult.error || itemsResult.error
    };
  }
};