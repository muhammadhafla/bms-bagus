import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';
import { inventoryApi } from './inventory';

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
    return safeQuery<StockOpname[]>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .select('*, profiles:profiles(nama)')
          .order('created_at', { ascending: false })
      )
    );
  },

  async getById(id: string) {
    return safeQuery<StockOpname>(
      queryToPromise(
        supabase
          .from('stock_opname')
          .select('*')
          .eq('id', id)
          .single()
      )
    );
  },

  async getItems(opnameId: string) {
    return safeQuery<StockOpnameItem[]>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .select('*, inventory:nama_barang, inventory:kode_barcode, inventory:unit')
          .eq('stock_opname_id', opnameId)
          .order('created_at')
      )
    );
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

    return opnameResult;
  },

  async updateItem(itemId: string, data: Partial<{ physical_stock: number; reason: string; note: string }>) {
    const { data: item } = await supabase
      .from('stock_opname_items')
      .select('system_stock')
      .eq('id', itemId)
      .single();

    if (!item) {
      return { data: null, error: new Error('Item not found') };
    }

    const difference = (data.physical_stock ?? item.system_stock) - item.system_stock;

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
    const { data: items } = await supabase
      .from('stock_opname_items')
      .select('difference, reason')
      .eq('stock_opname_id', opnameId);

    if (items) {
      const hasDifferenceWithoutReason = items.some(
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { data: null, error: new Error('Hanya admin yang dapat melakukan approval') };
    }

    const { data: opname } = await supabase
      .from('stock_opname')
      .select('created_by')
      .eq('id', opnameId)
      .single();

    if (opname && opname.created_by === user.id) {
      return { data: null, error: new Error('Tidak dapat approve opname yang dibuat sendiri') };
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
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
    const { data: inventory } = await supabase
      .from('inventory')
      .select('id, nama_barang, stok, kode_barcode, unit')
      .eq('id', inventoryId)
      .single();

    if (!inventory) {
      return { data: null, error: new Error('Inventory not found') };
    }

    return safeQuery<StockOpnameItem>(
      queryToPromise(
        supabase
          .from('stock_opname_items')
          .insert({
            stock_opname_id: opnameId,
            inventory_id: inventory.id,
            system_stock: inventory.stok || 0,
            physical_stock: inventory.stok || 0,
            difference: 0,
            adjusted: false
          })
          .select('*')
          .single()
      )
    );
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
