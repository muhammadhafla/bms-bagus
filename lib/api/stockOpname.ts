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
  total_items?: number;
  total_selisih?: number;
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
        .select('*, stock_opname_items(id, difference)')
        .order('created_at', { ascending: false });
      return { data: result.data, error: result.error as Error | null };
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    if (!result.data || result.data.length === 0) {
      return { data: [], error: null };
    }

    const uniqueUserIds = [...new Set(result.data.map((o) => o.created_by).filter(Boolean))];

    let profilesMap: Record<string, { nama: string }> = {};
    if (uniqueUserIds.length > 0) {
      const profilesResult = await safeQuery<{ id: string; nama: string }[]>(async () => {
        const result = await supabase.from('profiles').select('id, nama').in('id', uniqueUserIds);
        return { data: result.data, error: result.error as Error | null };
      });
      if (profilesResult.data) {
        profilesResult.data.forEach((p) => {
          profilesMap[p.id] = { nama: p.nama };
        });
      }
    }

    const opnamesWithCreator: StockOpnameWithProfile[] = result.data.map((opname: any) => {
      const items = opname.stock_opname_items || [];
      const total_items = items.length;
      const total_selisih = items.reduce(
        (sum: number, item: any) => sum + (item.difference || 0),
        0,
      );

      const { stock_opname_items, ...rest } = opname;
      return {
        ...rest,
        profiles: rest.created_by ? profilesMap[rest.created_by] : null,
        total_items,
        total_selisih,
      };
    });

    return { data: opnamesWithCreator, error: null };
  },

  async getById(id: string) {
    const result = await safeQuery<StockOpnameWithProfile>(async () => {
      const result = await supabase
        .from('stock_opname')
        .select(
          `
          *,
          profiles:created_by (nama)
        `,
        )
        .eq('id', id)
        .single();
      return { data: result.data as any, error: result.error as Error | null };
    });

    return result;
  },

  async getItems(opnameId: string) {
    return await safeQuery<StockOpnameItemWithInventory[]>(async () => {
      const result = await supabase
        .from('stock_opname_items')
        .select(
          `
          *,
          inventory:inventory_id (
            id,
            nama_barang,
            kode_barcode,
            unit
          )
        `,
        )
        .eq('stock_opname_id', opnameId)
        .order('created_at');

      return { data: result.data as any, error: result.error as Error | null };
    });
  },

  async create() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const today = new Date().toISOString().split('T')[0];

    const opnameResult = await safeQuery<StockOpname>(
      async () => {
        const result = await supabase
          .from('stock_opname')
          .insert({
            opname_date: today,
            status: 'draft',
            created_by: user.id,
          })
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );

    if (opnameResult.error || !opnameResult.data) {
      return opnameResult;
    }

    return opnameResult;
  },

  async updateItem(
    itemId: string,
    data: Partial<{ physical_stock: number; system_stock: number; reason: string; note: string }>,
  ) {
    const difference = (data.physical_stock ?? 0) - (data.system_stock ?? 0);

    return safeQuery<StockOpnameItem>(
      async () => {
        const result = await supabase
          .from('stock_opname_items')
          .update({
            physical_stock: data.physical_stock,
            reason: data.reason,
            note: data.note,
            difference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
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
        (item) => item.difference !== 0 && !item.reason,
      );

      if (hasDifferenceWithoutReason) {
        return {
          data: null,
          error: new Error('Semua item dengan selisih harus memiliki alasan'),
        };
      }
    }

    return safeQuery<StockOpname>(
      async () => {
        const result = await supabase
          .from('stock_opname')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', opnameId)
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async approve(opnameId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    return safeQuery<StockOpname>(
      async () => {
        const result = await supabase
          .from('stock_opname')
          .update({
            status: 'approved',
            approved_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', opnameId)
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async reject(opnameId: string, note: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    return safeQuery<StockOpname>(
      async () => {
        const result = await supabase
          .from('stock_opname')
          .update({
            status: 'rejected',
            approved_by: user.id,
            note,
            updated_at: new Date().toISOString(),
          })
          .eq('id', opnameId)
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async delete(opnameId: string) {
    return safeQuery<void>(
      async () => {
        const result = await supabase.from('stock_opname').delete().eq('id', opnameId);
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
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

    const insertResult = await safeQuery<StockOpnameItem>(
      async () => {
        const result = await supabase
          .from('stock_opname_items')
          .insert({
            stock_opname_id: opnameId,
            inventory_id: invResult.data.id,
            system_stock: invResult.data.stok || 0,
            physical_stock: invResult.data.stok || 0,
            difference: 0,
            adjusted: false,
          })
          .select()
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );

    if (insertResult.error || !insertResult.data) {
      return insertResult;
    }

    return {
      data: { ...insertResult.data, inventory: invResult.data },
      error: null,
    };
  },

  async deleteItem(itemId: string) {
    return safeQuery<void>(
      async () => {
        const result = await supabase.from('stock_opname_items').delete().eq('id', itemId);
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },
};
