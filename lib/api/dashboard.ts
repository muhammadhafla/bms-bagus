import { supabase } from './client';
import { queryToPromise } from './utils';

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

    const [inventoryResult, salesResult, purchasesResult, lowStockResult] = await Promise.all([
      supabase.from('inventory').select('stok, harga_beli_terakhir'),
      supabase.from('penjualan').select('total').eq('tanggal', today),
      supabase.from('pembelian').select('total_sistem, tanggal').eq('tanggal', today),
      supabase.from('inventory').select('id, nama_barang, stok, minimum_stock'),
    ]);

    if (inventoryResult.error || salesResult.error || purchasesResult.error || lowStockResult.error) {
      return {
        data: null,
        error: inventoryResult.error || salesResult.error || purchasesResult.error || lowStockResult.error,
      };
    }

    const totalInventoryValue = (inventoryResult.data || []).reduce(
      (sum, item) => sum + (item.stok * (item.harga_beli_terakhir || 0)),
      0
    );

    const todaySales = (salesResult.data || []).reduce((sum, t) => sum + (t.total || 0), 0);
    const todayPurchases = (purchasesResult.data || []).reduce((sum, t) => sum + (t.total_sistem || 0), 0);

    const lowStockCount = (lowStockResult.data || []).filter(
      item => item.minimum_stock != null && item.stok < item.minimum_stock && !(item as any).is_discontinued
    ).length;

    return {
      data: {
        totalInventoryValue,
        totalItems: inventoryResult.data?.length || 0,
        todaySales,
        todayPurchases,
        todayProfit: todaySales - todayPurchases,
        lowStockItems: lowStockCount,
        todayTransactions: (salesResult.data?.length || 0) + (purchasesResult.data?.length || 0),
      },
      error: null,
    };
  },

  async getLowStockItems(): Promise<{ data: LowStockItem[]; error: unknown }> {
    const result = await supabase
      .from('inventory')
      .select('id, nama_barang, stok, minimum_stock')
      .eq('is_discontinued', false)
      .order('stok', { ascending: true })
      .limit(10);

    if (result.error) {
      return { data: [], error: result.error };
    }

    const filtered = (result.data || []).filter(
      item => item.minimum_stock != null && item.stok < item.minimum_stock
    ) as LowStockItem[];

    return {
      data: filtered,
      error: null,
    };
  },

  async get7DayTrend(): Promise<{ data: TrendData[]; error: unknown }> {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const [pembelianResult, penjualanResult] = await Promise.all([
      supabase.from('pembelian').select('tanggal, total_sistem').gte('tanggal', dates[0]),
      supabase.from('penjualan').select('tanggal, total').gte('tanggal', dates[0]),
    ]);

    if (pembelianResult.error || penjualanResult.error) {
      return { data: [], error: pembelianResult.error || penjualanResult.error };
    }

    const trend: TrendData[] = dates.map((date) => {
      const totalPembelian = (pembelianResult.data || [])
        .filter((p) => p.tanggal === date)
        .reduce((sum, p) => sum + (p.total_sistem || 0), 0);

      const totalPenjualan = (penjualanResult.data || [])
        .filter((p) => p.tanggal === date)
        .reduce((sum, p) => sum + (p.total || 0), 0);

      return {
        date,
        pembelian: totalPembelian,
        penjualan: totalPenjualan,
        profit: totalPenjualan - totalPembelian,
      };
    });

    return { data: trend, error: null };
  },

  async getRecentTransactions(): Promise<{ data: RecentTransaction[]; error: unknown }> {
    const [penjualan, pembelian] = await Promise.all([
      supabase
        .from('penjualan')
        .select('id, total, tanggal, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('pembelian')
        .select('id, total_sistem, tanggal, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const transactions: RecentTransaction[] = [
      ...(penjualan.data || []).map((t) => ({ ...t, type: 'penjualan' as const })),
      ...(pembelian.data || []).map((t) => ({ 
        ...t, 
        total: t.total_sistem || 0,
        type: 'pembelian' as const 
      })),
    ];

    transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      data: transactions.slice(0, 5),
      error: null,
    };
  },
};
