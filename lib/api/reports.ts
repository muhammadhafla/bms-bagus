import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

export interface StockMutation {
  id: string;
  inventory_id: string;
  barcode?: string;
  nama_barang?: string;
  type: 'in' | 'out';
  tipe: 'IN' | 'OUT';
  qty: number;
  qty_mutation: number;
  transaction_type: string;
  referensi?: string;
  created_at: string;
}

export interface InventoryValue {
  id: string;
  barcode: string;
  nama_barang: string;
  kategori: string;
  stok: number;
  harga_beli: number;
  harga_jual: number;
  total_value: number;
}

export interface SalesSummary {
  date: string;
  total_sales: number;
  total_items: number;
  transaction_count: number;
}

export interface ProfitSummary {
  date: string;
  total_pembelian: number;
  total_penjualan: number;
  total_profit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function calculatePagination(page?: number, limit?: number) {
  const safePage = Math.max(1, page || 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, limit || DEFAULT_PAGE_SIZE));
  return { page: safePage, limit: safeLimit };
}

export const reportApi = {
  async getStockMutations(
    startDate?: string,
    endDate?: string,
    pagination?: PaginationOptions
  ) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true });

    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return { data: [], error: { message: countError.message }, total: 0, page: 1, limit: 50, hasMore: false };
    }

    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        inventory:inventory_id (
          id,
          nama_barang,
          kode_barcode
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const result = await query;
    
    if (result.error) {
      return { 
        data: [], 
        error: { message: result.error.message },
        total: count || 0,
        page,
        limit,
        hasMore: false 
      };
    }

    const mapped = (result.data || []).map((item: Record<string, unknown>): StockMutation => ({
      id: item.id as string,
      inventory_id: item.inventory_id as string,
      barcode: (item.inventory as Record<string, unknown> | null)?.kode_barcode as string || '',
      nama_barang: (item.inventory as Record<string, unknown> | null)?.nama_barang as string || '',
      type: (item.tipe as string) === 'IN' ? 'in' : 'out',
      tipe: item.tipe as 'IN' | 'OUT',
      qty: item.qty as number,
      qty_mutation: (item.tipe as string) === 'IN' ? item.qty as number : -(item.qty as number),
      transaction_type: (item.referensi as string) || '-',
      referensi: item.referensi as string | undefined,
      created_at: item.created_at as string,
    }));

    return { 
      data: mapped, 
      error: null,
      total: count || 0,
      page,
      limit,
      hasMore: offset + mapped.length < (count || 0)
    };
  },

  async getInventoryValue(pagination?: PaginationOptions) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);
    const offset = (page - 1) * limit;

    const { count, error: countError } = await supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return { data: null, error: { message: countError.message } };
    }

    const { data, error } = await supabase
      .from('inventory')
      .select('*, id_kategori:id_kategori(nama)')
      .order('nama_barang')
      .range(offset, offset + limit - 1);

    if (error) return { data: null, error: { message: error.message } };

    const values: InventoryValue[] = (data || []).map(item => ({
      id: item.id,
      barcode: item.kode_barcode || '',
      nama_barang: item.nama_barang,
      kategori: item.id_kategori?.nama || '-',
      stok: item.stok,
      harga_beli: item.harga_beli_terakhir || 0,
      harga_jual: item.harga_jual,
      total_value: item.stok * (item.harga_beli_terakhir || 0),
    }));

    return { 
      data: values, 
      error: null,
      total: count || 0,
      page,
      limit,
      hasMore: offset + values.length < (count || 0)
    };
  },

  async getSalesReport(
    startDate?: string,
    endDate?: string,
    pagination?: PaginationOptions
  ) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from('penjualan_transactions')
      .select('*', { count: 'exact', head: true });

    if (startDate) {
      countQuery = countQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte('tanggal', endDate);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return { data: null, error: { message: countError.message } };
    }

    let query = supabase
      .from('penjualan_transactions')
      .select('*')
      .order('tanggal', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      query = query.gte('tanggal', startDate);
    }
    if (endDate) {
      query = query.lte('tanggal', endDate);
    }

    const result = await query;

    if (result.error) return { data: null, error: { message: result.error.message } };

    const summary: SalesSummary[] = [];
    interface GroupedData { total: number; items: number; count: number; }
    const grouped: Record<string, GroupedData> = {};

    (result.data || []).forEach(t => {
      if (!grouped[t.tanggal]) {
        grouped[t.tanggal] = { total: 0, items: 0, count: 0 };
      }
      grouped[t.tanggal].total += t.total;
      grouped[t.tanggal].count += 1;
    });

    Object.entries(grouped).forEach(([date, data]) => {
      summary.push({
        date,
        total_sales: data.total,
        total_items: data.items,
        transaction_count: data.count,
      });
    });

    return { 
      data: summary, 
      error: null,
      total: count || 0,
      page,
      limit,
      hasMore: offset + summary.length < (count || 0)
    };
  },

  async getProfitReport(
    startDate?: string,
    endDate?: string,
    pagination?: PaginationOptions
  ) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from('pembelian_transactions')
      .select('*', { count: 'exact', head: true });

    if (startDate) {
      countQuery = countQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte('tanggal', endDate);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      return { data: null, error: { message: countError.message } };
    }

    let pembelianQuery = supabase
      .from('pembelian_transactions')
      .select('tanggal, total')
      .order('tanggal', { ascending: false })
      .range(offset, offset + limit - 1);

    let penjualanQuery = supabase
      .from('penjualan_transactions')
      .select('tanggal, total')
      .order('tanggal', { ascending: false })
      .range(offset, offset + limit - 1);

    if (startDate) {
      pembelianQuery = pembelianQuery.gte('tanggal', startDate);
      penjualanQuery = penjualanQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      pembelianQuery = pembelianQuery.lte('tanggal', endDate);
      penjualanQuery = penjualanQuery.lte('tanggal', endDate);
    }

    const [pembelianResult, penjualanResult] = await Promise.all([
      pembelianQuery,
      penjualanQuery,
    ]);

    if (pembelianResult.error || penjualanResult.error) {
      return { data: null, error: { message: (pembelianResult.error || penjualanResult.error)!.message } };
    }

    const pembelians = pembelianResult.data || [];
    const penjalanans = penjualanResult.data || [];

    const allDates = new Set([
      ...pembelians.map((p) => p.tanggal),
      ...penjalanans.map((p) => p.tanggal),
    ]);

    const summary: ProfitSummary[] = [];
    allDates.forEach(date => {
      const totalPembelian = pembelians
        .filter((p) => p.tanggal === date)
        .reduce((sum, p) => sum + (p.total || 0), 0);
      const totalPenjualan = penjalanans
        .filter((p) => p.tanggal === date)
        .reduce((sum, p) => sum + (p.total || 0), 0);

      summary.push({
        date,
        total_pembelian: totalPembelian,
        total_penjualan: totalPenjualan,
        total_profit: totalPenjualan - totalPembelian,
      });
    });

    summary.sort((a, b) => b.date.localeCompare(a.date));

    return { 
      data: summary, 
      error: null,
      total: count || 0,
      page,
      limit,
      hasMore: offset + summary.length < (count || 0)
    };
  },
};