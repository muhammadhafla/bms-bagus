import { format } from 'date-fns';
import { supabase } from './client';
import { safeQuery } from './utils';

export interface StockOpname {
  id: string;
  opname_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  note: string | null;
  gudang_id: string | null;
  created_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  gudang?: {
    id: string;
    kode_gudang: string;
    nama: string;
    tipe: string;
  } | null;
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
  async getAll(options?: { gudangId?: string }) {
    const result = await safeQuery<StockOpname[]>(async () => {
      let query = supabase
        .from('stock_opname')
        .select('*, gudang:gudang_id(id, kode_gudang, nama, tipe), stock_opname_items(id, difference)')
        .order('created_at', { ascending: false });

      if (options?.gudangId) {
        query = query.eq('gudang_id', options.gudangId);
      }

      const result = await query;
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

  async getPaginated(options: { page?: number; limit?: number; gudangId?: string }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const result = await safeQuery<{
      data: StockOpnameWithProfile[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    }>(async () => {
      let countQuery = supabase
        .from('stock_opname')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('stock_opname')
        .select('*, gudang:gudang_id(id, kode_gudang, nama, tipe), stock_opname_items(id, difference)');

      if (options.gudangId) {
        countQuery = countQuery.eq('gudang_id', options.gudangId);
        dataQuery = dataQuery.eq('gudang_id', options.gudangId);
      }

      const countResult = await countQuery;
      if (countResult.error) throw countResult.error;
      const total = countResult.count || 0;

      const dataResult = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dataResult.error) throw dataResult.error;

      const opnames = dataResult.data || [];
      const uniqueUserIds = [...new Set(opnames.map((o) => o.created_by).filter(Boolean))];

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

      const opnamesWithCreator: StockOpnameWithProfile[] = opnames.map((opname: any) => {
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

      return {
        data: {
          data: opnamesWithCreator,
          total,
          page,
          limit,
          hasMore: offset + opnamesWithCreator.length < total,
        },
        error: null,
      };
    });

    if (result.error) {
      return { data: [], total: 0, page, limit, hasMore: false, error: result.error };
    }

    return { ...(result.data as any), error: null };
  },

  async getById(id: string) {
    const result = await safeQuery<StockOpnameWithProfile>(async () => {
      const result = await supabase
        .from('stock_opname')
        .select(
          `
          *,
          gudang:gudang_id (id, kode_gudang, nama, tipe),
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

  async create(params?: { gudang_id?: string; note?: string; opname_date?: string }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    let targetGudangId = params?.gudang_id;
    if (!targetGudangId) {
      const profileRes = await supabase
        .from('profiles')
        .select('default_gudang_id')
        .eq('id', user.id)
        .maybeSingle();
      targetGudangId = profileRes.data?.default_gudang_id;
      if (!targetGudangId) {
        const defGudang = await supabase
          .from('gudang')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();
        targetGudangId = defGudang.data?.id;
      }
    }

    const today = params?.opname_date || format(new Date(), 'yyyy-MM-dd');

    const opnameResult = await safeQuery<StockOpname>(
      async () => {
        const result = await supabase
          .from('stock_opname')
          .insert({
            opname_date: today,
            status: 'draft',
            gudang_id: targetGudangId || null,
            note: params?.note || null,
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
    const opnameRes = await safeQuery<{ gudang_id: string | null }>(async () => {
      const result = await supabase
        .from('stock_opname')
        .select('gudang_id')
        .eq('id', opnameId)
        .single();
      return { data: result.data as any, error: result.error as Error | null };
    });

    const gudangId = opnameRes.data?.gudang_id;

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

    let currentStock = invResult.data.stok || 0;
    if (gudangId) {
      const stockRes = await safeQuery<{ stok: number }>(async () => {
        const result = await supabase
          .from('inventory_stocks')
          .select('stok')
          .eq('inventory_id', inventoryId)
          .eq('gudang_id', gudangId)
          .maybeSingle();
        return { data: result.data as any, error: result.error as Error | null };
      });
      if (stockRes.data) {
        currentStock = stockRes.data.stok ?? 0;
      } else {
        currentStock = 0;
      }
    }

    const insertResult = await safeQuery<StockOpnameItem>(
      async () => {
        const result = await supabase
          .from('stock_opname_items')
          .insert({
            stock_opname_id: opnameId,
            inventory_id: invResult.data.id,
            system_stock: currentStock,
            physical_stock: currentStock,
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

