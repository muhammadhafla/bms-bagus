import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

export interface StockOpname {
  id: string;
  opname_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  note: string | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { nama: string } | null;
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

    const opnamesWithCreator: any[] = await Promise.all(
      result.data.map(async (opname) => {
        if (opname.created_by) {
          const profileResult = await safeQuery<any>(
            queryToPromise(
              supabase
                .from('profiles')
                .select('nama')
                .eq('id', opname.created_by)
                .single()
            )
          );
          return { ...opname, profiles: profileResult.data };
        }
        return opname;
      })
    );

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

    const itemsWithInventory: any[] = await Promise.all(
      result.data.map(async (item) => {
        if (item.inventory_id) {
          const invResult = await safeQuery<any>(
            queryToPromise(
              supabase
                .from('inventory')
                .select('nama_barang, kode_barcode, unit')
                .eq('id', item.inventory_id)
                .single()
            )
          );
          return { ...item, inventory: invResult.data };
        }
        return item;
      })
    );

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