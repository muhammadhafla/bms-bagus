import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

export interface StockOpnameWithProfile extends StockOpname {
  profiles?: { nama: string } | null;
}

export interface InventoryBasic {
  id: string;
  nama_barang: string;
  kode_barcode: string;
  unit: string;
}

export interface StockOpnameItemWithInventory extends StockOpnameItem {
  inventory?: {
    nama_barang: string;
    kode_barcode: string;
    unit: string;
  } | null;
}

export interface StockOpnameItem {
  id: string;
  stock_opname_id: string;
  inventory_id: string;
  system_stock: number;
  physical_stock: number;
  difference: number;
  reason?: 'salah_input' | 'rusak' | 'hilang' | 'kadaluarsa' | 'salah_hitung' | 'lainnya' | null;
  note?: string | null;
  adjusted: boolean;
  created_at: string;
  updated_at: string;
  inventory?: {
    nama_barang: string;
    kode_barcode: string;
    unit: string;
  };
}

export const stockOpnameApi = {
  async getAll() {
    const result = await safeQuery<any[]>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .select('*')
          .order('created_at', { ascending: false })
      )
    );

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || result.data.length === 0) {
      return { data: [], error: null };
    }

    const uniqueUserIds = [...new Set(result.data.map(o => o.created_by).filter(Boolean))];
    
    let profilesMap: Record<string, { nama: string }> = {};
    if (uniqueUserIds.length > 0) {
      const profilesResult = await safeQuery<{ id: string; nama: string }[]>(
        queryToPromise(
          supabase
            .from('profiles')
            .select('id, nama')
            .in('id', uniqueUserIds)
        )
      );
      if (profilesResult.data) {
        profilesResult.data.forEach(p => {
          profilesMap[p.id] = { nama: p.nama };
        });
      }
    }

    const opnamesWithCreator = result.data.map(opname => ({
      ...opname,
      profiles: opname.created_by ? profilesMap[opname.created_by] : null
    }));

    return { data: opnamesWithCreator, error: null };
  },

  async getById(id: string) {
    const result = await safeQuery<any>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .select('*')
          .eq('id', id)
          .single()
      )
    );

    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }

    if (result.data.created_by) {
      const profileResult = await safeQuery<any>(
        queryToPromise(
          supabase
            .from('profiles')
            .select('nama')
            .eq('id', result.data.created_by)
            .single()
        )
      );
      return { data: { ...result.data, profiles: profileResult.data }, error: null };
    }

    return { data: result.data, error: null };
  },

  async getItems(opnameId: string) {
    const result = await safeQuery<any[]>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .select('*')
          .eq('stock_opname_id', opnameId)
          .order('created_at')
      )
    );

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || result.data.length === 0) {
      return { data: [], error: null };
    }

    const uniqueInventoryIds = [...new Set(result.data.map(i => i.inventory_id).filter(Boolean))];
    
    let inventoryMap: Record<string, { nama_barang: string; kode_barcode: string; unit: string }> = {};
    if (uniqueInventoryIds.length > 0) {
      const invResult = await safeQuery<{ id: string; nama_barang: string; kode_barcode: string; unit: string }[]>(
        queryToPromise(
          supabase
            .from('inventory')
            .select('id, nama_barang, kode_barcode, unit')
            .in('id', uniqueInventoryIds)
        )
      );
      if (invResult.data) {
        invResult.data.forEach(inv => {
          inventoryMap[inv.id] = { nama_barang: inv.nama_barang, kode_barcode: inv.kode_barcode, unit: inv.unit };
        });
      }
    }

    const itemsWithInventory = result.data.map(item => ({
      ...item,
      inventory: item.inventory_id ? inventoryMap[item.inventory_id] : null
    }));

    return { data: itemsWithInventory, error: null };
  },

  async create() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const today = new Date().toISOString().split('T')[0];
    
    const opnameResult = await safeQuery<StockOpname>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .insert({
            opname_date: today,
            status: 'draft',
            created_by: user.id
          })
          .select()
          .single()
      )
    );

    if (opnameResult.error || !opnameResult.data) {
      return opnameResult;
    }

    return opnameResult;
  },

  async updateItem(itemId: string, data: Partial<{ physical_stock: number; reason: string; note: string }>) {
    const itemResult = await safeQuery<any>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .select('system_stock')
          .eq('id', itemId)
          .single()
      )
    );

    if (!itemResult.data) {
      return { data: null, error: new Error('Item not found') };
    }

    const difference = (data.physical_stock ?? itemResult.data.system_stock) - itemResult.data.system_stock;

    return safeQuery<StockOpnameItem>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .update({
            ...data,
            difference,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .select()
          .single()
      )
    );
  },

  async submitForApproval(opnameId: string) {
    const itemsResult = await safeQuery<any[]>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .select('difference, reason')
          .eq('stock_opname_id', opnameId)
      )
    );

    if (itemsResult.data) {
      const hasDifferenceWithoutReason = itemsResult.data.some(
        item => item.difference !== 0 && !item.reason
      );

      if (hasDifferenceWithoutReason) {
        return { 
          data: null, 
          error: new Error('Semua item dengan selisih harus memiliki alasan') 
        };
      }
    }

    return safeQuery<StockOpname>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', opnameId)
          .select()
          .single()
      )
    );
  },

  async approve(opnameId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const profileResult = await safeQuery<any>(
      queryToPromise(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
      )
    );

    if (!profileResult.data || profileResult.data.role !== 'admin') {
      return { data: null, error: new Error('Hanya admin yang dapat melakukan approval') };
    }

    return safeQuery<StockOpname>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .update({
            status: 'approved',
            approved_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', opnameId)
          .select()
          .single()
      )
    );
  },

  async reject(opnameId: string, note: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const profileResult = await safeQuery<any>(
      queryToPromise(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
      )
    );

    if (!profileResult.data || profileResult.data.role !== 'admin') {
      return { data: null, error: new Error('Hanya admin yang dapat melakukan approval') };
    }

    return safeQuery<StockOpname>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .update({
            status: 'rejected',
            approved_by: user.id,
            note,
            updated_at: new Date().toISOString()
          })
          .eq('id', opnameId)
          .select()
          .single()
      )
    );
  },

  async delete(opnameId: string) {
    return safeQuery<void>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .delete()
          .eq('id', opnameId)
      )
    );
  },

  async addItem(opnameId: string, inventoryId: string) {
    const invResult = await safeQuery<any>(
      queryToPromise(
        supabase
          .from('inventory')
          .select('id, nama_barang, stok, kode_barcode, unit')
          .eq('id', inventoryId)
          .single()
      )
    );

    if (!invResult.data) {
      return { data: null, error: new Error('Inventory not found') };
    }

    const insertResult = await safeQuery<StockOpnameItem>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .insert({
            stock_opname_id: opnameId,
            inventory_id: invResult.data.id,
            system_stock: invResult.data.stok || 0,
            physical_stock: invResult.data.stok || 0,
            difference: 0,
            adjusted: false
          })
          .select()
          .single()
      )
    );

    if (insertResult.error || !insertResult.data) {
      return insertResult;
    }

    return {
      data: { ...insertResult.data, inventory: invResult.data },
      error: null
    };
  },

  async deleteItem(itemId: string) {
    return safeQuery<void>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .delete()
          .eq('id', itemId)
      )
    );
  }
};