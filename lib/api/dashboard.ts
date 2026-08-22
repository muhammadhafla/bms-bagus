import { supabase } from './client';
import { safeQuery } from './utils';

export interface DashboardStats {
  totalInventoryValue: number;
  totalItems: number;
  todaySales: number;
  todayPurchases: number;
  todayProfit: number;
  lowStockItems: number;
  todayTransactions: number;
}

export interface LowStockItem {
  id: string;
  nama_barang: string;
  stok: number;
  minimum_stock: number;
}

export interface TrendData {
  date: string;
  penjualan: number;
  pembelian: number;
  profit: number;
}

export interface RecentTransaction {
  id: string;
  type: 'penjualan' | 'pembelian';
  total: number;
  tanggal: string;
  created_at: string;
}

export const dashboardApi = {
  async getStats(): Promise<{ data: DashboardStats | null; error: unknown }> {
    const today = new Date().toISOString().split('T')[0];

    const [statsResult, todayProfitResult] = await Promise.all([
      safeQuery<{ total_inventory_value: number; total_items: number; low_stock_items: number }>(
        async () => {
          const result = await supabase.rpc('get_dashboard_stats').single();
          return {
            data: result.data as {
              total_inventory_value: number;
              total_items: number;
              low_stock_items: number;
            } | null,
            error: result.error as Error | null,
          };
        },
      ),
      // Gunakan RPC get_today_profit — profit benar berdasarkan cost_at_sale (HPP)
      safeQuery<{
        today_sales: number;
        today_cogs: number;
        today_profit: number;
        today_purchases: number;
        today_transactions: number;
      }>(async () => {
        const result = await supabase.rpc('get_today_profit', { p_date: today }).single();
        return {
          data: result.data as {
            today_sales: number;
            today_cogs: number;
            today_profit: number;
            today_purchases: number;
            today_transactions: number;
          } | null,
          error: result.error as Error | null,
        };
      }),
    ]);

    if (statsResult.error || todayProfitResult.error) {
      return {
        data: null,
        error: statsResult.error || todayProfitResult.error,
      };
    }

    return {
      data: {
        totalInventoryValue: statsResult.data?.total_inventory_value || 0,
        totalItems: statsResult.data?.total_items || 0,
        todaySales: todayProfitResult.data?.today_sales || 0,
        todayPurchases: todayProfitResult.data?.today_purchases || 0,
        // Profit = revenue - cost_at_sale (HPP), bukan penjualan - pembelian hari ini
        todayProfit: todayProfitResult.data?.today_profit || 0,
        lowStockItems: statsResult.data?.low_stock_items || 0,
        todayTransactions: todayProfitResult.data?.today_transactions || 0,
      },
      error: null,
    };
  },

  async getLowStockItems(): Promise<{ data: LowStockItem[]; error: unknown }> {
    const result = await safeQuery<LowStockItem[]>(async () => {
      const result = await supabase
        .rpc('get_low_stock_items', { p_search: null })
        .select('id, nama_barang, stok, minimum_stock')
        .order('stok', { ascending: true })
        .limit(10);
      return { data: result.data as LowStockItem[] | null, error: result.error as Error | null };
    });

    if (result.error) {
      return { data: [], error: result.error };
    }

    return {
      data: result.data || [],
      error: null,
    };
  },

  async get7DayTrend(): Promise<{ data: TrendData[]; error: unknown }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Gunakan RPC get_7day_trend_v2 — profit benar berdasarkan cost_at_sale
    const result = await safeQuery<TrendData[]>(async () => {
      const res = await supabase.rpc('get_7day_trend_v2', { p_start_date: startDateStr });
      // Mapping nama kolom dari RPC ke TrendData interface
      const mapped = (res.data || []).map(
        (row: { trend_date: string; penjualan: number; pembelian: number; profit: number }) => ({
          date: row.trend_date,
          penjualan: row.penjualan,
          pembelian: row.pembelian,
          profit: row.profit,
        }),
      );
      return { data: mapped, error: res.error as Error | null };
    });

    if (result.error) {
      return { data: [], error: result.error };
    }

    return { data: result.data || [], error: null };
  },

  async getRecentTransactions(): Promise<{ data: RecentTransaction[]; error: unknown }> {
    const result = await safeQuery<RecentTransaction[]>(async () => {
      const res = await supabase
        .from('v_recent_transactions')
        .select('id, type, total, tanggal, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      return { data: res.data as RecentTransaction[] | null, error: res.error as Error | null };
    });

    if (result.error) {
      return { data: [], error: result.error };
    }

    return {
      data: result.data || [],
      error: null,
    };
  },
};
