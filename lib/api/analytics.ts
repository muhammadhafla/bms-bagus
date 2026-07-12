import { supabase } from './client';
import { safeQuery } from './utils';

export interface BusiestHour {
  hour_of_day: number;
  transaction_count: number;
  total_revenue: number;
}

export interface SalesTrend {
  label_waktu: string;
  transaction_count: number;
  total_revenue: number;
}

export interface CategoryPerformance {
  category_name: string;
  total_revenue: number;
  total_items: number;
}

export interface PaymentMethods {
  total_cash: number;
  total_qris: number;
  transaction_count: number;
}

export interface StockVelocity {
  inventory_id: string;
  nama_barang: string;
  total_sold: number;
  sales_velocity: number;
  current_stock: number;
}

export interface Profitability {
  inventory_id: string;
  nama_barang: string;
  total_sold: number;
  total_profit: number;
  profit_margin: number;
}

export interface Atv {
  avg_transaction_value: number;
  items_per_ticket: number;
}

export interface ReturnAnalytics {
  kpi: {
    total_revenue_returned: number;
    total_transactions: number;
  };
  top_items: {
    inventory_id: string;
    nama_barang: string;
    total_qty: number;
    total_value: number;
  }[];
  reasons: {
    reason: string;
    count: number;
  }[];
}

export const analyticsApi = {
  async getBusiestHours(startDate?: string, endDate?: string) {
    const result = await safeQuery<BusiestHour[]>(async () => {
      const res = await supabase.rpc('get_analytics_busiest_hours', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      });
      const mapped = (res.data || []).map((row: any) => ({
        hour_of_day: Number(row.hour_of_day),
        transaction_count: Number(row.transaction_count),
        total_revenue: Number(row.total_revenue),
      }));
      return { data: mapped, error: res.error as Error | null };
    });
    return { data: result.data || [], error: result.error };
  },

  async getSalesTrend(startDate?: string, endDate?: string, groupBy: 'hour' | 'day' | 'date' = 'hour') {
    const result = await safeQuery<SalesTrend[]>(async () => {
      const res = await supabase.rpc('get_analytics_sales_trend', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
        p_group_by: groupBy,
      });
      const mapped = (res.data || []).map((row: any) => {
        let label = row.label_waktu.trim();
        if (groupBy === 'day') {
          const daysMap: Record<string, string> = {
            'Monday': 'Senin',
            'Tuesday': 'Selasa',
            'Wednesday': 'Rabu',
            'Thursday': 'Kamis',
            'Friday': 'Jumat',
            'Saturday': 'Sabtu',
            'Sunday': 'Minggu'
          };
          label = daysMap[label] || label;
        }
        
        return {
          label_waktu: label,
          transaction_count: Number(row.transaction_count),
          total_revenue: Number(row.total_revenue),
        };
      });
      return { data: mapped, error: res.error as Error | null };
    });
    return { data: result.data || [], error: result.error };
  },

  async getCategoryPerformance(startDate?: string, endDate?: string) {
    const result = await safeQuery<CategoryPerformance[]>(async () => {
      const res = await supabase.rpc('get_analytics_categories', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      });
      const mapped = (res.data || []).map((row: any) => ({
        category_name: row.category_name,
        total_revenue: Number(row.total_revenue),
        total_items: Number(row.total_items),
      }));
      return { data: mapped, error: res.error as Error | null };
    });
    return { data: result.data || [], error: result.error };
  },

  async getPaymentMethods(startDate?: string, endDate?: string) {
    const result = await safeQuery<PaymentMethods>(async () => {
      const res = await supabase.rpc('get_analytics_payment_methods', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      }).single();
      
      const mapped = {
        total_cash: Number((res.data as any)?.total_cash || 0),
        total_qris: Number((res.data as any)?.total_qris || 0),
        transaction_count: Number((res.data as any)?.transaction_count || 0),
      };
      return { data: mapped, error: res.error as Error | null };
    });
    return { 
      data: result.data || { total_cash: 0, total_qris: 0, transaction_count: 0 }, 
      error: result.error 
    };
  },

  async getStockVelocity(startDate?: string, endDate?: string) {
    const result = await safeQuery<StockVelocity[]>(async () => {
      const res = await supabase.rpc('get_analytics_stock_velocity', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      });
      const mapped = (res.data || []).map((row: any) => ({
        inventory_id: row.inventory_id,
        nama_barang: row.nama_barang,
        total_sold: Number(row.total_sold),
        sales_velocity: Number(row.sales_velocity),
        current_stock: Number(row.current_stock),
      }));
      return { data: mapped, error: res.error as Error | null };
    });
    return { data: result.data || [], error: result.error };
  },

  async getProfitability(startDate?: string, endDate?: string) {
    const result = await safeQuery<Profitability[]>(async () => {
      const res = await supabase.rpc('get_analytics_profitability', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      });
      const mapped = (res.data || []).map((row: any) => ({
        inventory_id: row.inventory_id,
        nama_barang: row.nama_barang,
        total_sold: Number(row.total_sold),
        total_profit: Number(row.total_profit),
        profit_margin: Number(row.profit_margin),
      }));
      return { data: mapped, error: res.error as Error | null };
    });
    return { data: result.data || [], error: result.error };
  },

  async getAtv(startDate?: string, endDate?: string) {
    const result = await safeQuery<Atv>(async () => {
      const res = await supabase.rpc('get_analytics_atv', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      }).single();
      const mapped = {
        avg_transaction_value: Number((res.data as any)?.avg_transaction_value || 0),
        items_per_ticket: Number((res.data as any)?.items_per_ticket || 0),
      };
      return { data: mapped, error: res.error as Error | null };
    });
    return { 
      data: result.data || { avg_transaction_value: 0, items_per_ticket: 0 }, 
      error: result.error 
    };
  },

  async getReturnAnalytics(startDate?: string, endDate?: string) {
    const result = await safeQuery<ReturnAnalytics>(async () => {
      const res = await supabase.rpc('get_analytics_returns', {
        p_start_date: startDate ? `${startDate}T00:00:00Z` : null,
        p_end_date: endDate ? `${endDate}T23:59:59Z` : null,
      });
      return { data: res.data as ReturnAnalytics, error: res.error as Error | null };
    });
    return { data: result.data || { kpi: { total_revenue_returned: 0, total_transactions: 0 }, top_items: [], reasons: [] }, error: result.error };
  }
};
