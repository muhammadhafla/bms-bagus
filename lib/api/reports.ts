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
  grandTotal?: any;
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
  async getStockMutations(startDate?: string, endDate?: string, pagination?: PaginationOptions) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);
    const offset = (page - 1) * limit;

    let dataQuery = supabase
      .from('stock_movements')
      .select(
        `
        *,
        inventory:inventory_id (
          id,
          nama_barang,
          kode_barcode
        )
      `,
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit); // request 1 extra item to check hasMore

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
        total: 0,
        page,
        limit,
        hasMore: false,
      };
    }

    const resData = result.data || [];
    const hasMore = resData.length > limit;
    if (hasMore) {
      resData.pop(); // remove the extra item
    }

    const mapped = resData.map((item: Record<string, unknown>): StockMutation => ({
      id: item.id as string,
      inventory_id: item.inventory_id as string,
      barcode: ((item.inventory as Record<string, unknown> | null)?.kode_barcode as string) || '',
      nama_barang:
        ((item.inventory as Record<string, unknown> | null)?.nama_barang as string) || '',
      type: (item.tipe as string) === 'IN' ? 'in' : 'out',
      tipe: item.tipe as 'IN' | 'OUT',
      qty: item.qty as number,
      qty_mutation: (item.tipe as string) === 'IN' ? (item.qty as number) : -(item.qty as number),
      transaction_type: (item.referensi as string) || '-',
      referensi: item.referensi as string | undefined,
      created_at: item.created_at as string,
    }));

    return {
      data: mapped,
      error: null,
      total: 0, // total omitted for performance
      page,
      limit,
      hasMore,
    };
  },

  async getInventoryValue(pagination?: PaginationOptions) {
    const { page, limit } = calculatePagination(pagination?.page, pagination?.limit);
    const offset = (page - 1) * limit;

    const [summaryResult, listResult] = await Promise.all([
      safeQuery<any[]>(async () => {
        const res = await supabase.rpc('get_inventory_summary');
        return { data: res.data, error: res.error as Error | null };
      }),
      safeQuery<any[]>(async () => {
        const result = await supabase
          .from('inventory')
          .select('*, id_kategori:id_kategori(nama)')
          .order('nama_barang')
          .range(offset, offset + limit); // +1 to check hasMore
        return { data: result.data, error: result.error as Error | null };
      }),
    ]);

    if (listResult.error) return { data: null, error: { message: listResult.error.message } };

    const resData = listResult.data || [];
    const hasMore = resData.length > limit;
    if (hasMore) {
      resData.pop();
    }

    const values: InventoryValue[] = resData.map((item) => ({
      id: item.id,
      barcode: item.kode_barcode || '',
      nama_barang: item.nama_barang,
      kategori: item.id_kategori?.nama || '-',
      stok: item.stok,
      harga_beli: item.harga_beli_terakhir || 0,
      harga_jual: item.harga_jual,
      total_value: item.stok * (item.harga_beli_terakhir || 0),
    }));

    const summaryData = summaryResult.data?.[0];
    const grandTotal = summaryData ? {
      totalItems: Number(summaryData.total_items),
      totalStok: Number(summaryData.total_stok),
      totalValue: Number(summaryData.total_value),
    } : undefined;

    return {
      data: values,
      error: null,
      total: grandTotal?.totalItems || 0,
      page,
      limit,
      hasMore,
      grandTotal,
    };
  },

  async getSalesReport(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    pagination?: PaginationOptions,
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
    
    const grandTotal = rows.length > 0 ? {
      sales: Number(rows[0].grand_total_sales || 0),
      cash: Number(rows[0].grand_total_cash || 0),
      qris: Number(rows[0].grand_total_qris || 0),
    } : null;

    const summary: SalesSummary[] = rows.map((row) => ({
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
      grandTotal,
    };
  },

  async getProfitReport(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    pagination?: PaginationOptions,
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

    const grandTotal = rows.length > 0 ? {
      modal: Number(rows[0].grand_total_modal || 0),
      penjualan: Number(rows[0].grand_total_penjualan || 0),
      profit: Number(rows[0].grand_total_profit || 0),
    } : null;

    const summary: ProfitSummary[] = rows.map((row) => ({
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
      grandTotal,
    };
  },

  async getTopSellingItems(
    startDate?: string,
    endDate?: string,
    categoryId?: string,
    limitItems: number = 10,
  ) {
    // Gunakan RPC get_top_selling_items — server-side aggregation
    const result = await safeQuery<TopSellingItem[]>(async () => {
      const res = await supabase.rpc('get_top_selling_items', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_id: categoryId || null,
        p_limit: limitItems,
      });
      const mapped = (res.data || []).map(
        (row: {
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
        }),
      );
      return { data: mapped, error: res.error as Error | null };
    });

    if (result.error) return { data: [], error: { message: result.error.message } };
    return { data: result.data || [], error: null };
  },

  async exportStockMutations(startDate?: string, endDate?: string) {
    let dataQuery = supabase
      .from('stock_movements')
      .select(
        `
        *,
        inventory:inventory_id (id, nama_barang, kode_barcode)
      `,
      )
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
    const result = await safeQuery<any[]>(async () => {
      const res = await supabase.rpc('export_sales_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_id: categoryId || null,
      });
      return { data: res.data, error: res.error as Error | null };
    });

    if (result.error) return { data: null, error: { message: result.error.message } };

    const summary: SalesSummary[] = (result.data || []).map((row) => ({
      date: String(row.report_date),
      total_sales: Number(row.total_sales),
      total_cash: Number(row.total_cash),
      total_qris: Number(row.total_qris),
      total_items: Number(row.total_items),
      transaction_count: Number(row.transaction_count),
    }));

    return { data: summary, error: null };
  },

  async exportProfitReport(startDate?: string, endDate?: string, categoryId?: string) {
    const result = await safeQuery<any[]>(async () => {
      const res = await supabase.rpc('export_profit_report', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_category_id: categoryId || null,
      });
      return { data: res.data, error: res.error as Error | null };
    });

    if (result.error) return { data: null, error: { message: result.error.message } };

    const summary: ProfitSummary[] = (result.data || []).map((row) => ({
      date: String(row.report_date),
      total_modal: Number(row.total_modal),
      total_penjualan: Number(row.total_penjualan),
      total_profit: Number(row.total_profit),
      margin_percentage: Number(row.margin_percentage),
    }));

    return { data: summary, error: null };
  },
};
