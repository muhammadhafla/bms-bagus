import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

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

export const stockAdjustmentApi = {
  async getAll() {
    const { data, error } = await queryToPromise(
      supabase
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false })
    );

    if (error) {
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    const adjustmentsWithInventory: any[] = await Promise.all(
      data.map(async (adj) => {
        if (adj.inventory_id) {
          const { data: inventory } = await supabase
            .from('inventory')
            .select('nama_barang')
            .eq('id', adj.inventory_id)
            .single();
          return { ...adj, inventory: inventory };
        }
        return adj;
      })
    );

    return { data: adjustmentsWithInventory, error: null };
  },

  async processOpnameAdjustments(opnameId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data: opname } = await supabase
      .from('stock_opname')
      .select('status')
      .eq('id', opnameId)
      .single();

    if (!opname || opname.status !== 'approved') {
      return { data: null, error: new Error('Opname harus di-approve terlebih dahulu') };
    }

    const { data: items } = await supabase
      .from('stock_opname_items')
      .select('*')
      .eq('stock_opname_id', opnameId)
      .eq('adjusted', false)
      .not('difference', 'eq', 0);

    if (!items || items.length === 0) {
      await supabase
        .from('stock_opname')
        .update({ status: 'completed' })
        .eq('id', opnameId);
      
      return { data: [], error: null };
    }

    const adjustments = [];
    const movementInserts = [];
    const inventoryUpdates = [];

    for (const item of items) {
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
        await supabase.from('stock_adjustments').insert(adjustments);
      }

      if (movementInserts.length > 0) {
        await supabase.from('stock_movements').insert(movementInserts);
      }

      for (const update of inventoryUpdates) {
        await supabase
          .from('inventory')
          .update({ stok: update.stok })
          .eq('id', update.id);
      }

      await supabase
        .from('stock_opname_items')
        .update({ adjusted: true })
        .eq('stock_opname_id', opnameId);

      await supabase
        .from('stock_opname')
        .update({ status: 'completed' })
        .eq('id', opnameId);

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

    const { data: inventory } = await supabase
      .from('inventory')
      .select('stok')
      .eq('id', inventoryId)
      .single();

    if (!inventory) {
      return { data: null, error: new Error('Inventory not found') };
    }

    const newStock = adjustmentType === 'increase' 
      ? inventory.stok + adjustmentQty 
      : inventory.stok - adjustmentQty;

    if (newStock < 0) {
      return { data: null, error: new Error('Stok tidak bisa negatif') };
    }

    try {
      const adjustment = await safeQuery<StockAdjustment>(
        queryToPromise(
          supabase
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
            .single()
        )
      );

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
