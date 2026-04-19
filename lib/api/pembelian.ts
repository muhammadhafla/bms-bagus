import { supabase } from './client';
import { safeQuery } from './utils';

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

export interface PembelianWithDetails extends Pembelian {
  items: PembelianItem[];
  supplier_nama?: string;
  created_by_nama?: string;
}

export const purchasesApi = {
  async getAll(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      let query = supabase
        .from('pembelian')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      if (options?.search) {
        query = query.or(`nomor_nota.ilike.%${options.search}%,supplier_nama.ilike.%${options.search}%`);
      }
      if (options?.startDate) {
        query = query.gte('tanggal', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('tanggal', options.endDate);
      }

      const result = await safeQuery<any[]>(async () => {
        const result = await query;
        return { data: result.data, error: result.error as Error | null };
      });

      if (result.error) {
        return { data: null, error: { message: result.error.message } };
      }

      const formatted = (result.data || []).map((item: any) => ({
        id: item.id,
        idempotency_key: item.idempotency_key,
        supplier_id: item.supplier_id,
        tanggal: item.tanggal,
        total: item.total_sistem,
        total_supplier: item.total_supplier,
        selisih: item.total_sistem - item.total_supplier,
        created_at: item.created_at,
        nomor_nota: item.nomor_nota,
        supplier_nama: item.supplier_nama,
        note: item.note,
        created_by: item.created_by,
        created_by_nama: null,
      }));

      return { data: formatted, error: null };
    } catch (err: any) {
      console.error('Error fetching purchases:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  async getById(id: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const purchaseResult = await safeQuery<any>(async () => {
        const result = await supabase
          .from('pembelian')
          .select('*')
          .eq('id', id)
          .single();
        return { data: result.data, error: result.error as Error | null };
      });

      clearTimeout(timeoutId);

      if (purchaseResult.error) {
        return { data: null, error: { message: purchaseResult.error.message } };
      }

      const itemsResult = await safeQuery<any[]>(async () => {
        const result = await supabase
          .from('pembelian_items')
          .select('*')
          .eq('pembelian_id', id);
        return { data: result.data, error: result.error as Error | null };
      });

      if (itemsResult.error) {
        console.error('Items fetch error:', itemsResult.error);
      }

      return {
        data: {
          ...purchaseResult.data,
          items: itemsResult.data || [],
          total: purchaseResult.data?.total_sistem || 0,
          total_supplier: purchaseResult.data?.total_supplier || 0,
          selisih: (purchaseResult.data?.total_sistem || 0) - (purchaseResult.data?.total_supplier || 0),
          created_by_nama: null,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Error fetching purchase detail:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  async getCount(options?: {
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      let query = supabase.from('pembelian').select('*', { count: 'exact', head: true });

      if (options?.search) {
        query = query.or(`nomor_nota.ilike.%${options.search}%,supplier_nama.ilike.%${options.search}%`);
      }
      if (options?.startDate) {
        query = query.gte('tanggal', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('tanggal', options.endDate);
      }

      const result = await safeQuery<any[]>(async () => {
        const result = await query;
        return { data: result.data, error: result.error as Error | null };
      });

      if (result.error) {
        return { data: 0, error: { message: result.error.message } };
      }

      return { data: result.data?.length || 0, error: null };
    } catch (err: any) {
      return { data: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },
};

export const purchaseApi = {
  async submit(data: {
    supplier_id: string | null;
    supplier_nama?: string | null;
    tanggal: string;
    items: PembelianItem[];
    total_supplier: number;
    note?: string;
    nomor_nota?: string;
    idempotency_key?: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      if (!userId) {
        return { data: null, error: { message: 'User not authenticated' } };
      }

      // Validasi input dasar
      if (data.items.length === 0) {
        return { data: null, error: { message: 'Item pembelian tidak boleh kosong' } };
      }

      // Validasi setiap item
      for (const item of data.items) {
        if (!item.inventory_id && !item.barcode) {
          return { data: null, error: { message: `Item ${item.nama_barang} tidak memiliki ID/barcode valid` } };
        }
        if (!item.qty || item.qty <= 0) {
          return { data: null, error: { message: `Qty untuk ${item.nama_barang} harus lebih dari 0` } };
        }
        if (item.harga_final < 0) {
          return { data: null, error: { message: `Harga untuk ${item.nama_barang} tidak boleh negatif` } };
        }
      }
      
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
        p_user: userId,
        p_idempotency_key: data.idempotency_key
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