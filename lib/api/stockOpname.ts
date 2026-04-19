import { supabase } from './client';
import { safeQuery } from './utils';

export interface StockOpname {
  id: string;
  opname_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  note: string | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockOpnameWithProfile extends StockOpname {
  profiles?: { nama: string } | null;
}

export interface InventoryBasic {
  id: string;
  nama_barang: string;
  kode_barcode: string;
  unit: string;
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
  } | null;
}

export interface StockOpnameItemWithInventory extends StockOpnameItem {
  inventory: {
    nama_barang: string;
    kode_barcode: string;
    unit: string;
  } | null;
}

export const stockOpnameApi = {
  async getAll() {
    const result = await safeQuery<StockOpname[]>(async () => {
      const result = await supabase
        .from('stock_opname')
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

    const uniqueUserIds = [...new Set(result.data.map(o => o.created_by).filter(Boolean))];
    
    let profilesMap: Record<string, { nama: string }> = {};
    if (uniqueUserIds.length > 0) {
      const profilesResult = await safeQuery<{ id: string; nama: string }[]>(async () => {
        const result = await supabase
          .from('profiles')
          .select('id, nama')
          .in('id', uniqueUserIds);
        return { data: result.data, error: result.error as Error | null };
      });
      if (profilesResult.data) {
        profilesResult.data.forEach(p => {
          profilesMap[p.id] = { nama: p.nama };
        });
      }
    }

    const opnamesWithCreator: StockOpnameWithProfile[] = result.data.map(opname => ({
      ...opname,
      profiles: opname.created_by ? profilesMap[opname.created_by] : null
    }));

    return { data: opnamesWithCreator, error: null };
  },

  async getById(id: string) {
    const result = await safeQuery<StockOpname>(async () => {
      const result = await supabase
        .from('stock_opname')
        .select('*')
        .eq('id', id)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }

    if (result.data.created_by) {
      const profileResult = await safeQuery<{ nama: string }>(async () => {
        const profileRes = await supabase
          .from('profiles')
          .select('nama')
          .eq('id', result.data!.created_by)
          .single();
        return { data: profileRes.data, error: profileRes.error as Error | null };
      });
      return { data: { ...result.data, profiles: profileResult.data }, error: null };
    }

    return { data: result.data, error: null };
  },

  async getItems(opnameId: string) {
    const result = await safeQuery<StockOpnameItem[]>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .select('*')
        .eq('stock_opname_id', opnameId)
        .order('created_at');
      return { data: result.data, error: result.error as Error | null };
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || result.data.length === 0) {
      return { data: [], error: null };
    }

    const uniqueInventoryIds = [...new Set(result.data.map(i => i.inventory_id).filter(Boolean))];
    
    let inventoryMap: Record<string, InventoryBasic> = {};
    if (uniqueInventoryIds.length > 0) {
      const invResult = await safeQuery<InventoryBasic[]>(async () => {
        const result = await supabase
          .from('inventory')
          .select('id, nama_barang, kode_barcode, unit')
          .in('id', uniqueInventoryIds);
        return { data: result.data, error: result.error as Error | null };
      });
      if (invResult.data) {
        invResult.data.forEach(inv => {
          inventoryMap[inv.id] = { id: inv.id, nama_barang: inv.nama_barang, kode_barcode: inv.kode_barcode, unit: inv.unit };
        });
      }
    }

    const itemsWithInventory: StockOpnameItemWithInventory[] = result.data.map(item => ({
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
    
    const opnameResult = await safeQuery<StockOpname>(async () => {
      const result = await supabase
        .from('stock_opname')
        .insert({
          opname_date: today,
          status: 'draft',
          created_by: user.id
        })
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (opnameResult.error || !opnameResult.data) {
      return opnameResult;
    }

    return opnameResult;
  },

  async updateItem(itemId: string, data: Partial<{ physical_stock: number; reason: string; note: string }>) {
    const itemResult = await safeQuery<any>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .select('system_stock')
        .eq('id', itemId)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (!itemResult.data) {
      return { data: null, error: new Error('Item not found') };
    }

    const difference = (data.physical_stock ?? itemResult.data.system_stock) - itemResult.data.system_stock;

    return safeQuery<StockOpnameItem>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .update({
          ...data,
          difference,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async submitForApproval(opnameId: string) {
    const itemsResult = await safeQuery<any[]>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .select('difference, reason')
        .eq('stock_opname_id', opnameId);
      return { data: result.data, error: result.error as Error | null };
    });

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

    return safeQuery<StockOpname>(async () => {
      const result = await supabase
        .from('stock_opname')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', opnameId)
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async approve(opnameId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const profileResult = await safeQuery<any>(async () => {
      const result = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (!profileResult.data || profileResult.data.role !== 'admin') {
      return { data: null, error: new Error('Hanya admin yang dapat melakukan approval') };
    }

    return safeQuery<StockOpname>(async () => {
      const result = await supabase
        .from('stock_opname')
        .update({
          status: 'approved',
          approved_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', opnameId)
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async reject(opnameId: string, note: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const profileResult = await safeQuery<any>(async () => {
      const result = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (!profileResult.data || profileResult.data.role !== 'admin') {
      return { data: null, error: new Error('Hanya admin yang dapat melakukan approval') };
    }

    return safeQuery<StockOpname>(async () => {
      const result = await supabase
        .from('stock_opname')
        .update({
          status: 'rejected',
          approved_by: user.id,
          note,
          updated_at: new Date().toISOString()
        })
        .eq('id', opnameId)
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async delete(opnameId: string) {
    return safeQuery<void>(async () => {
      const result = await supabase
        .from('stock_opname')
        .delete()
        .eq('id', opnameId);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async addItem(opnameId: string, inventoryId: string) {
    const invResult = await safeQuery<any>(async () => {
      const result = await supabase
        .from('inventory')
        .select('id, nama_barang, stok, kode_barcode, unit')
        .eq('id', inventoryId)
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (!invResult.data) {
      return { data: null, error: new Error('Inventory not found') };
    }

    const insertResult = await safeQuery<StockOpnameItem>(async () => {
      const result = await supabase
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
        .single();
      return { data: result.data, error: result.error as Error | null };
    });

    if (insertResult.error || !insertResult.data) {
      return insertResult;
    }

    return {
      data: { ...insertResult.data, inventory: invResult.data },
      error: null
    };
  },

  async deleteItem(itemId: string) {
    return safeQuery<void>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .delete()
        .eq('id', itemId);
      return { data: result.data, error: result.error as Error | null };
    });
  }
};