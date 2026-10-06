import { supabase } from './client';
import { safeQuery } from './utils';

export interface StockAdjustment {
  id: string;
  stock_opname_item_id: string | null;
  inventory_id: string;
  adjustment_qty: number;
  adjustment_type: 'increase' | 'decrease';
  reason: string;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface StockAdjustmentWithInventory extends StockAdjustment {
  inventory?: { nama_barang: string } | null;
}

export const stockAdjustmentApi = {
  async getAll() {
    const result = await safeQuery<StockAdjustment[]>(async () => {
      const result = await supabase
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: result.data, error: result.error as Error | null };
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || result.data.length === 0) {
      return { data: [], error: null };
    }

    const uniqueInventoryIds = [...new Set(result.data.map((a) => a.inventory_id).filter(Boolean))];

    let inventoryMap: Record<string, { nama_barang: string }> = {};
    if (uniqueInventoryIds.length > 0) {
      const invResult = await safeQuery<{ id: string; nama_barang: string }[]>(async () => {
        const result = await supabase
          .from('inventory')
          .select('id, nama_barang')
          .in('id', uniqueInventoryIds);
        return { data: result.data, error: result.error as Error | null };
      });
      if (invResult.data) {
        invResult.data.forEach((inv) => {
          inventoryMap[inv.id] = { nama_barang: inv.nama_barang };
        });
      }
    }

    const adjustmentsWithInventory: StockAdjustmentWithInventory[] = result.data.map((adj) => ({
      ...adj,
      inventory: adj.inventory_id ? inventoryMap[adj.inventory_id] : null,
    }));

    return { data: adjustmentsWithInventory, error: null };
  },

  async processOpnameAdjustments(opnameId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    // Gunakan RPC untuk atomic transaction — semua insert/update berjalan dalam satu DB transaction
    // Jika salah satu langkah gagal, seluruh operasi di-rollback otomatis oleh PostgreSQL
    return safeQuery<{ success: boolean; processed_items: number; opname_id: string }>(
      async () => {
        const result = await supabase.rpc('process_opname_adjustments', {
          p_opname_id: opnameId,
          p_user_id: user.id,
        });
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },
};
