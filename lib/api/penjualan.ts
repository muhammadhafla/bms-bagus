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
  idempotency_key?: string | null;
  tanggal: string;
  items: PenjualanItem[];
  total: number;
  subtotal_sebelum_diskon?: number | null;
  diskon_nominal?: number | null;
  diskon_persen?: number | null;
  discount_member_amount?: number | null;
  payment_method?: string | null;
  cash_amount?: number | null;
  qris_amount?: number | null;
  kembalian?: number | null;
  member_id?: string | null;
  points_earned?: number | null;
  points_redeemed?: number | null;
  status?: string;
  paid_at?: string | null;
  created_by?: string | null;
  created_at: string;
  profiles?: {
    nama?: string | null;
    username?: string | null;
  } | null;
  members?: {
    name?: string | null;
    phone?: string | null;
    member_code?: string | null;
  } | null;
}

export const penjualanApi = {
  async getAll(options?: {
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
        .from('penjualan')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: isAscending });

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      if (options?.search) {
        // Asumsi penjualan memiliki id (atau kolom lain) yang bisa dicari.
        query = query.ilike('id', `%${options.search}%`);
      }
      if (options?.startDate) {
        query = query.gte('tanggal', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('tanggal', options.endDate);
      }

      const result = await safeQuery<{ data: any[]; count: number | null }>(async () => {
        const res = await query;
        return {
          data: { data: res.data as any[], count: res.count },
          error: res.error as Error | null,
        };
      });

      if (result.error) {
        return { data: null, total: 0, error: { message: result.error.message } };
      }

      return { data: result.data?.data || [], total: result.data?.count || 0, error: null };
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      return { data: null, total: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  async getCount(options?: { search?: string; startDate?: string; endDate?: string }) {
    try {
      let query = supabase.from('penjualan').select('*', { count: 'exact', head: true });

      if (options?.search) {
        query = query.ilike('id', `%${options.search}%`);
      }
      if (options?.startDate) {
        query = query.gte('tanggal', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('tanggal', options.endDate);
      }

      // head: true → data selalu null, count ada di response.count
      const { count, error } = await query;

      if (error) {
        return { data: 0, error: { message: error.message } };
      }

      return { data: count ?? 0, error: null };
    } catch (err: any) {
      return { data: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  async getById(id: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const saleResult = await safeQuery<any>(async () => {
        const result = await supabase
          .from('penjualan')
          .select(`
            *,
            profiles:created_by (
              nama,
              username
            ),
            members:member_id (
              name,
              phone,
              member_code
            )
          `)
          .eq('id', id)
          .abortSignal(controller.signal)
          .single();
        return { data: result.data, error: result.error as Error | null };
      });

      if (saleResult.error) {
        clearTimeout(timeoutId);
        return { data: null, error: { message: saleResult.error.message } };
      }

      const itemsResult = await safeQuery<any[]>(async () => {
        const result = await supabase
          .from('penjualan_items')
          .select('*')
          .eq('penjualan_id', id)
          .abortSignal(controller.signal);
        return { data: result.data, error: result.error as Error | null };
      });

      clearTimeout(timeoutId);

      return {
        data: {
          ...saleResult.data,
          items: itemsResult.data || [],
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error fetching sale detail:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  async submit(data: { tanggal: string; items: PenjualanItem[]; idempotency_key?: string }) {
    const idempotencyKey = data.idempotency_key || generateIdempotencyKey();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const total = data.items.reduce((sum, item) => sum + item.subtotal, 0);

    const payload = {
      p_idempotency_key: idempotencyKey,
      p_tanggal: data.tanggal,
      p_created_by: user?.id ?? null,
      p_total: total,
      p_items: data.items.map((item) => ({
        inventory_id: item.inventory_id,
        nama_barang: item.nama_barang,
        qty: item.qty,
        harga_jual: item.harga_jual,
        diskon: item.diskon,
        harga_final: item.harga_final,
        cost_at_sale: item.cost_at_sale,
      })),
    };

    return safeQuery(
      async () => {
        const result = await supabase.rpc('create_penjualan', payload);
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },
};
