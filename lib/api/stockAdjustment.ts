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

    const uniqueInventoryIds = [...new Set(result.data.map(a => a.inventory_id).filter(Boolean))];
    
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
        invResult.data.forEach(inv => {
          inventoryMap[inv.id] = { nama_barang: inv.nama_barang };
        });
      }
    }

    const adjustmentsWithInventory: StockAdjustmentWithInventory[] = result.data.map(adj => ({
      ...adj,
      inventory: adj.inventory_id ? inventoryMap[adj.inventory_id] : null
    }));

    return { data: adjustmentsWithInventory, error: null };
  },

  async processOpnameAdjustments(opnameId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const opnameResult = await safeQuery<any>(async () => {
      const result = await supabase
        .from('stock_opname')
        .select('status')
        .eq('id', opnameId)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (!opnameResult.data || opnameResult.data.status !== 'approved') {
      return { data: null, error: new Error('Opname harus di-approve terlebih dahulu') };
    }

    const itemsResult = await safeQuery<any[]>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .select('*')
        .eq('stock_opname_id', opnameId)
        .eq('adjusted', false)
        .not('difference', 'eq', 0);
      return { data: result.data, error: result.error as Error | null };
    });

    if (!itemsResult.data || itemsResult.data.length === 0) {
      await safeQuery<any>(async () => {
        const result = await supabase
          .from('stock_opname')
          .update({ status: 'completed' })
          .eq('id', opnameId);
        return { data: result.data, error: result.error as Error | null };
      });
      return { data: [], error: null };
    }

    const adjustments: any[] = [];
    const movementInserts: any[] = [];
    const inventoryUpdates: any[] = [];

    for (const item of itemsResult.data) {
      const adjustmentType = item.difference > 0 ? 'increase' : 'decrease';
      const adjustmentQty = Math.abs(item.difference);

      adjustments.push({
        stock_opname_item_id: item.id,
        inventory_id: item.inventory_id,
        adjustment_qty: adjustmentQty,
        adjustment_type: adjustmentType,
        reason: item.reason || 'lainnya',
        note: item.note,
        created_by: user.id
      });

      movementInserts.push({
        inventory_id: item.inventory_id,
        tipe: 'ADJUSTMENT',
        qty: adjustmentQty,
        referensi: opnameId
      });

      inventoryUpdates.push({
        id: item.inventory_id,
        stok: item.physical_stock
      });
    }

    try {
      if (adjustments.length > 0) {
        await safeQuery<any>(async () => {
          const result = await supabase.from('stock_adjustments').insert(adjustments);
          return { data: result.data, error: result.error as Error | null };
        });
      }

      if (movementInserts.length > 0) {
        await safeQuery<any>(async () => {
          const result = await supabase.from('stock_movements').insert(movementInserts);
          return { data: result.data, error: result.error as Error | null };
        });
      }

      for (const update of inventoryUpdates) {
        await safeQuery<any>(async () => {
          const result = await supabase
            .from('inventory')
            .update({ stok: update.stok })
            .eq('id', update.id);
          return { data: result.data, error: result.error as Error | null };
        });
      }

      await safeQuery<any>(async () => {
        const result = await supabase
          .from('stock_opname_items')
          .update({ adjusted: true })
          .eq('stock_opname_id', opnameId);
        return { data: result.data, error: result.error as Error | null };
      });

      await safeQuery<any>(async () => {
        const result = await supabase
          .from('stock_opname')
          .update({ status: 'completed' })
          .eq('id', opnameId);
        return { data: result.data, error: result.error as Error | null };
      });

      return { data: adjustments, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async createManualAdjustment(inventoryId: string, adjustmentQty: number, adjustmentType: 'increase' | 'decrease', reason: string, note?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const invResult = await safeQuery<any>(async () => {
      const result = await supabase
        .from('inventory')
        .select('stok')
        .eq('id', inventoryId)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (!invResult.data) {
      return { data: null, error: new Error('Inventory not found') };
    }

    const newStock = adjustmentType === 'increase' 
      ? invResult.data.stok + adjustmentQty 
      : invResult.data.stok - adjustmentQty;

    if (newStock < 0) {
      return { data: null, error: new Error('Stok tidak bisa negatif') };
    }

    try {
      const adjustment = await safeQuery<StockAdjustment>(async () => {
        const result = await supabase
          .from('stock_adjustments')
          .insert({
            inventory_id: inventoryId,
            adjustment_qty: adjustmentQty,
            adjustment_type: adjustmentType,
            reason,
            note,
            created_by: user.id
          })
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      });

      if (adjustment.error) throw adjustment.error;

      await supabase
        .from('inventory')
        .update({ stok: newStock })
        .eq('id', inventoryId);

      await supabase
        .from('stock_movements')
        .insert({
          inventory_id: inventoryId,
          tipe: 'ADJUSTMENT',
          qty: adjustmentQty,
          referensi: adjustment.data?.id
        });

      return adjustment;
    } catch (error) {
      return { data: null, error };
    }
  }
};