import { supabase } from './client';
import { safeQuery } from './utils';

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
  total_cash: number;
  total_qris: number;
  total_items: number;
  transaction_count: number;
}

export interface ProfitSummary {
  date: string;
  total_modal: number;
  total_penjualan: number;
  total_profit: number;
  margin_percentage: number;
}

export interface TopSellingItem {
  inventory_id: string;
  nama_barang: string;
  total_qty: number;
  total_profit: number;
  total_sales: number;
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

    let countQuery = supabase.from('stock_movements').select('*', { count: 'exact', head: true });
    if (startDate) countQuery = countQuery.gte('created_at', startDate);
    if (endDate) countQuery = countQuery.lte('created_at', `${endDate} 23:59:59`);

    const { count, error: countError } = await countQuery;

    if (countError) {
      return { data: [], error: { message: countError.message }, total: 0, page: 1, limit: 50, hasMore: false };
    }

    const totalCount = count || 0;

    let dataQuery = supabase
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

    if (startDate) dataQuery = dataQuery.gte('created_at', startDate);
    if (endDate) dataQuery = dataQuery.lte('created_at', `${endDate} 23:59:59`);

    const result = await safeQuery<any[]>(async () => {
      const res = await dataQuery;
      return { data: res.data, error: res.error as Error | null };
    });

    if (result.error) {
      return { 
        data: [], 
        error: { message: result.error.message },
        total: count,
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
      total: totalCount,
      page,
      limit,
      hasMore: offset + mapped.length < totalCount
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

    const totalCount = count || 0;

    const result = await safeQuery<any[]>(async () => {
      const result = await supabase
        .from('inventory')
        .select('*, id_kategori:id_kategori(nama)')
        .order('nama_barang')
        .range(offset, offset + limit - 1);
      return { data: result.data, error: result.error as Error | null };
    });

    if (result.error) return { data: null, error: { message: result.error.message } };

    const values: InventoryValue[] = (result.data || []).map(item => ({
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
      total: totalCount,
      page,
      limit,
      hasMore: offset + values.length < totalCount
    };
  },

  async getSalesReport(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    pagination?: PaginationOptions
  ) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);

    // Gunakan RPC get_sales_report — server-side aggregation, tidak tarik semua rows ke client
    const result = await safeQuery<any[]>(async () => {
      const res = await supabase.rpc('get_sales_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_id: categoryId || null,
        p_page: page,
        p_limit: limit,
      });
      return { data: res.data, error: res.error as Error | null };
    });

    if (result.error) return { data: null, error: { message: result.error.message } };

    const rows = result.data || [];
    const totalCount = rows[0]?.total_count ?? 0;

    const summary: SalesSummary[] = rows.map(row => ({
      date: String(row.report_date),
      total_sales: Number(row.total_sales),
      total_cash: Number(row.total_cash),
      total_qris: Number(row.total_qris),
      total_items: Number(row.total_items),
      transaction_count: Number(row.transaction_count),
    }));

    return {
      data: summary,
      error: null,
      total: Number(totalCount),
      page,
      limit,
      hasMore: (page - 1) * limit + rows.length < Number(totalCount),
    };
  },

  async getProfitReport(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    pagination?: PaginationOptions
  ) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);

    // Gunakan RPC get_profit_report — profit akurat berdasarkan cost_at_sale
    const result = await safeQuery<any[]>(async () => {
      const res = await supabase.rpc('get_profit_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_id: categoryId || null,
        p_page: page,
        p_limit: limit,
      });
      return { data: res.data, error: res.error as Error | null };
    });

    if (result.error) return { data: null, error: { message: result.error.message } };

    const rows = result.data || [];
    const totalCount = rows[0]?.total_count ?? 0;

    const summary: ProfitSummary[] = rows.map(row => ({
      date: String(row.report_date),
      total_modal: Number(row.total_modal),
      total_penjualan: Number(row.total_penjualan),
      total_profit: Number(row.total_profit),
      margin_percentage: Number(row.margin_percentage),
    }));

    return {
      data: summary,
      error: null,
      total: Number(totalCount),
      page,
      limit,
      hasMore: (page - 1) * limit + rows.length < Number(totalCount),
    };
  },
  
  async getTopSellingItems(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    limitItems: number = 10
  ) {
    // Gunakan RPC get_top_selling_items — server-side aggregation
    const result = await safeQuery<TopSellingItem[]>(async () => {
      const res = await supabase.rpc('get_top_selling_items', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_id: categoryId || null,
        p_limit: limitItems,
      });
      const mapped = (res.data || []).map((row: {
        inventory_id: string;
        nama_barang: string;
        total_qty: number;
        total_sales: number;
        total_profit: number;
      }) => ({
        inventory_id: row.inventory_id,
        nama_barang: row.nama_barang,
        total_qty: Number(row.total_qty),
        total_sales: Number(row.total_sales),
        total_profit: Number(row.total_profit),
      }));
      return { data: mapped, error: res.error as Error | null };
    });

    if (result.error) return { data: [], error: { message: result.error.message } };
    return { data: result.data || [], error: null };
  },

  async exportStockMutations(startDate?: string, endDate?: string) {
    let dataQuery = supabase
      .from('stock_movements')
      .select(`
        *,
        inventory:inventory_id (id, nama_barang, kode_barcode)
      `)
      .order('created_at', { ascending: false });

    if (startDate) dataQuery = dataQuery.gte('created_at', startDate);
    if (endDate) dataQuery = dataQuery.lte('created_at', `${endDate} 23:59:59`);

    const result = await safeQuery<any[]>(async () => {
      const res = await dataQuery;
      return { data: res.data, error: res.error as Error | null };
    });

    if (result.error) return { data: [], error: { message: result.error.message } };

    const mapped = (result.data || []).map((item: any): StockMutation => ({
      id: item.id as string,
      inventory_id: item.inventory_id as string,
      barcode: item.inventory?.kode_barcode || '',
      nama_barang: item.inventory?.nama_barang || '',
      type: item.tipe === 'IN' ? 'in' : 'out',
      tipe: item.tipe,
      qty: item.qty,
      qty_mutation: item.tipe === 'IN' ? item.qty : -item.qty,
      transaction_type: item.referensi || '-',
      referensi: item.referensi,
      created_at: item.created_at,
    }));
    return { data: mapped, error: null };
  },

  async exportSalesReport(startDate?: string, endDate?: string, categoryId?: string) {
    let query = supabase.from('penjualan_items').select(`penjualan_id, qty, harga_final, penjualan!inner(tanggal, cash_amount, qris_amount), inventory!inner(id_kategori)`);
    if (startDate) query = query.gte('penjualan.tanggal', startDate);
    if (endDate) query = query.lte('penjualan.tanggal', endDate);
    if (categoryId) query = query.eq('inventory.id_kategori', categoryId);

    const result = await safeQuery<any[]>(async () => {
      const res = await query;
      return { data: res.data, error: res.error as Error | null };
    });
    if (result.error) return { data: null, error: { message: result.error.message } };

    const grouped: Record<string, any> = {};
    (result.data || []).forEach((item: any) => {
      const date = item.penjualan?.tanggal;
      const tx_id = item.penjualan_id;
      if (!date) return;
      if (!grouped[date]) grouped[date] = { total: 0, total_cash: 0, total_qris: 0, items: 0, count: new Set(), processed_tx: new Set() };
      grouped[date].total += (item.harga_final || 0) * (item.qty || 0);
      grouped[date].items += (item.qty || 0);
      grouped[date].count.add(tx_id || Math.random().toString());
      if (tx_id && !grouped[date].processed_tx.has(tx_id)) {
        grouped[date].processed_tx.add(tx_id);
        grouped[date].total_cash += Number(item.penjualan?.cash_amount || 0);
        grouped[date].total_qris += Number(item.penjualan?.qris_amount || 0);
      }
    });
    const summary: SalesSummary[] = Object.entries(grouped).map(([date, data]) => ({
      date, total_sales: data.total, total_cash: data.total_cash, total_qris: data.total_qris, total_items: data.items, transaction_count: data.count.size,
    }));
    summary.sort((a, b) => b.date.localeCompare(a.date));
    return { data: summary, error: null };
  },

  async exportProfitReport(startDate?: string, endDate?: string, categoryId?: string) {
    let query = supabase.from('penjualan_items').select(`qty, harga_final, cost_at_sale, penjualan!inner(tanggal), inventory!inner(id_kategori)`);
    if (startDate) query = query.gte('penjualan.tanggal', startDate);
    if (endDate) query = query.lte('penjualan.tanggal', endDate);
    if (categoryId) query = query.eq('inventory.id_kategori', categoryId);

    const result = await safeQuery<any[]>(async () => {
      const res = await query;
      return { data: res.data, error: res.error as Error | null };
    });
    if (result.error) return { data: null, error: { message: result.error.message } };

    const summaryMap: Record<string, ProfitSummary> = {};
    (result.data || []).forEach((item: any) => {
      const date = item.penjualan?.tanggal;
      if (!date) return;
      if (!summaryMap[date]) summaryMap[date] = { date, total_modal: 0, total_penjualan: 0, total_profit: 0, margin_percentage: 0 };
      const modal = (item.cost_at_sale || 0) * (item.qty || 0);
      const penjualan = (item.harga_final || 0) * (item.qty || 0);
      summaryMap[date].total_modal += modal;
      summaryMap[date].total_penjualan += penjualan;
      summaryMap[date].total_profit += (penjualan - modal);
    });
    const summary = Object.values(summaryMap).map(s => {
      s.margin_percentage = s.total_penjualan > 0 ? (s.total_profit / s.total_penjualan) * 100 : 0;
      return s;
    }).sort((a, b) => b.date.localeCompare(a.date));
    return { data: summary, error: null };
  },
};