import { supabase } from './client';
import { safeQuery } from './utils';
import { stringSimilarity } from '@/lib/utils';
import { InventoryItem } from '@/types/inventory';

export const inventoryApi = {
  async getAll() {
    return safeQuery<InventoryItem[]>(async () => {
      const result = await supabase
        .from('inventory')
        .select('*, id_kategori:id_kategori(*)')
        .order('nama_barang')
        .limit(1000);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getByIds(ids: string[]) {
    if (!ids || ids.length === 0) return { data: [], error: null };
    return safeQuery<InventoryItem[]>(async () => {
      const result = await supabase
        .from('inventory')
        .select('*, id_kategori:id_kategori(*)')
        .in('id', ids);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getPaginated(options: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    categoryName?: string;
    lowStockOnly?: boolean;
    activeStatus?: 'all' | 'active' | 'discontinued';
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const sortBy = options.sortBy || 'nama_barang';
    const isAscending = options.sortDir !== 'desc'; // default is ascending

    let query;

    if (options.lowStockOnly) {
      query = supabase
        .rpc('get_low_stock_items', {}, { count: 'exact' })
        .select('*, id_kategori:id_kategori(*)');
    } else {
      query = supabase
        .from('inventory')
        .select('*, id_kategori:id_kategori(*)', { count: 'exact' });
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: isAscending }).range(offset, offset + limit - 1);

    if (options.search) {
      const safeQueryString = options.search.replace(/%/g, '').toLowerCase();
      const orCondition = `nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`;
      query = query.or(orCondition);
    }

    if (options.activeStatus === 'active') {
      query = query.eq('is_discontinued', false);
    } else if (options.activeStatus === 'discontinued') {
      query = query.eq('is_discontinued', true);
    }

    let resolvedCategoryId = options.categoryId;
    
    // Fallback to query by categoryName if categoryId is not provided
    if (!resolvedCategoryId && options.categoryName) {
      const catResult = await supabase
        .from('kategori')
        .select('id')
        .eq('nama', options.categoryName)
        .maybeSingle();
      if (catResult.data) {
        resolvedCategoryId = catResult.data.id;
      }
    }

    if (resolvedCategoryId) {
      query = query.eq('id_kategori', resolvedCategoryId);
    }

    const { data, count, error } = await query;

    if (error)
      return { data: [], total: 0, page, limit, hasMore: false, error: error as Error };

    const total = count || 0;
    const items = data as InventoryItem[];

    return {
      data: items,
      total,
      page,
      limit,
      hasMore: offset + items.length < total,
      error: null,
    };
  },

  async getLowStockCount(options: { search?: string; categoryId?: string; categoryName?: string } = {}) {
    let countQuery = supabase.rpc(
      'get_low_stock_items',
      {},
      { count: 'exact', head: true },
    );

    if (options.search) {
      const safeQueryString = options.search.replace(/%/g, '').toLowerCase();
      const orCondition = `nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`;
      countQuery = countQuery.or(orCondition);
    }

    let resolvedCategoryId = options.categoryId;
    if (!resolvedCategoryId && options.categoryName) {
      const catResult = await supabase
        .from('kategori')
        .select('id')
        .eq('nama', options.categoryName)
        .maybeSingle();
      if (catResult.data) {
        resolvedCategoryId = catResult.data.id;
      }
    }

    if (resolvedCategoryId) {
      countQuery = countQuery.eq('id_kategori', resolvedCategoryId);
    }

    const { count, error } = await countQuery;
    if (error) {
      console.error('Error fetching low stock count:', error);
      return 0;
    }
    return count || 0;
  },

  async getByBarcode(barcode: string) {
    return safeQuery<InventoryItem>(async () => {
      const result = await supabase
        .from('inventory')
        .select('*')
        .eq('kode_barcode', barcode)
        .maybeSingle();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async search(query: string, includeDiscontinued = false) {
    const safeQueryString = query.replace(/%/g, '').toLowerCase();

    let queryBuilder = supabase
      .from('inventory')
      .select('*, id_kategori:id_kategori(*)')
      .or(`nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`)
      .order('nama_barang');

    if (!includeDiscontinued) {
      queryBuilder = queryBuilder.eq('is_discontinued', false);
    }

    return safeQuery<InventoryItem[]>(async () => {
      const result = await queryBuilder.limit(100);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async fuzzySearch(query: string, _inventoryList?: any[], limit = 20) {
    const queryLower = query.toLowerCase().trim();
    if (queryLower.length < 2) return { data: [], error: null };

    return safeQuery<Array<InventoryItem & { similarity: number }>>(async () => {
      const result = await supabase.rpc('search_inventory', {
        search_query: queryLower,
        limit_val: limit,
      });
      return { data: result.data as Array<InventoryItem & { similarity: number }>, error: result.error as Error | null };
    });
  },

  async getByExactBarcode(barcode: string) {
    const normalizedBarcode = barcode.toUpperCase().trim();
    if (!normalizedBarcode) return { data: null, error: null };

    return safeQuery<InventoryItem>(async () => {
      const result = await supabase
        .from('inventory')
        .select('*, id_kategori:id_kategori(*)')
        .eq('kode_barcode', normalizedBarcode)
        .maybeSingle();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async update(id: string, data: Record<string, unknown>) {
    const query = supabase
      .from('inventory')
      .update(data)
      .eq('id', id)
      .select('*, id_kategori:id_kategori(*)')
      .single();
    return safeQuery<InventoryItem>(
      async () => {
        const result = await query;
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async create(data: {
    nama_barang: string;
    kode_barcode?: string;
    id_kategori?: string;
    kategori?: string;
    harga_beli_terakhir?: number;
    harga_jual?: number;
    diskon?: number;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    return safeQuery<InventoryItem>(
      async () => {
        const result = await supabase
          .from('inventory')
          .insert({
            nama_barang: data.nama_barang,
            kode_barcode: data.kode_barcode || null,
            id_kategori: data.id_kategori || null,
            created_by: user.id,
            harga_beli_terakhir: data.harga_beli_terakhir ?? 0,
            harga_jual: data.harga_jual ?? 0,
            diskon: data.diskon ?? 0,
            stok: 0,
            minimum_stock: 0,
            unit: 'pcs',
          })
          .select('*, id_kategori:id_kategori(*)')
          .single();
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async delete(id: string) {
    return safeQuery<void>(
      async () => {
        const result = await supabase.from('inventory').delete().eq('id', id);
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async toggleDiscontinued(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    return safeQuery<InventoryItem>(
      async () => {
        const result = await supabase
          .rpc('toggle_discontinued', { p_id: id, p_user: user.id })
          .single();
        return { data: result.data as InventoryItem, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async snoozeLowStock(id: string, days: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return safeQuery<InventoryItem>(
      async () => {
        const result = await supabase
          .rpc('snooze_low_stock_item', { p_id: id, p_days: days, p_user: user.id })
          .single();
        return { data: result.data as InventoryItem, error: result.error as Error | null };
      },
      { isMutation: true }
    );
  },

  async snoozeLowStockBulk(ids: string[], days: number) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    return safeQuery<any>(
      async () => {
        const result = await supabase
          .from('inventory')
          .update({
            snoozed_until: snoozedUntil,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .in('id', ids);
        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true }
    );
  },

  async getPurchaseHistory(inventory_id: string, options: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    return safeQuery<{ data: any[]; count: number; page: number; totalPages: number }>(async () => {
      const query = supabase
        .from('pembelian_items')
        .select(
          `
          id,
          qty,
          harga_beli,
          pembelian!inner (
            tanggal,
            supplier_nama
          )
        `,
          { count: 'exact' },
        )
        .eq('inventory_id', inventory_id)
        .range(offset, offset + limit - 1);

      // Using foreignTable for ordering if supported, fallback applied if error
      const result = await (query as any).order('tanggal', {
        referencedTable: 'pembelian',
        ascending: false,
      });

      const totalPages = Math.ceil((result.count || 0) / limit);

      const formattedData = (result.data || []).map((item: any) => ({
        id: item.id,
        qty: item.qty,
        harga_beli: item.harga_beli,
        tanggal: item.pembelian?.tanggal,
        supplier_nama: item.pembelian?.supplier_nama,
      }));

      // In case ordering by foreign table doesn't work perfectly, we ensure it's sorted here
      formattedData.sort((a: any, b: any) => {
        return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      });

      return {
        data: {
          data: formattedData,
          count: result.count || 0,
          page,
          totalPages,
        },
        error: result.error as Error | null,
      };
    });
  },

  async checkBatchExistence(
    names: string[],
    inventoryList: InventoryItem[],
  ): Promise<{ existing: InventoryItem[]; missing: string[]; error: Error | null }> {
    if (!names || names.length === 0) return { existing: [], missing: [], error: null };
    if (!inventoryList || inventoryList.length === 0)
      return { existing: [], missing: names, error: null };

    const existing: InventoryItem[] = [];
    const missing: string[] = [];

    const inventoryMap = new Map();
    inventoryList.forEach((item) => {
      inventoryMap.set(item.nama_barang.toLowerCase().trim(), item);
    });

    for (const name of names) {
      const lowerName = name.toLowerCase().trim();
      if (inventoryMap.has(lowerName)) {
        existing.push(inventoryMap.get(lowerName));
      } else {
        missing.push(name);
      }
    }

    const uniqueMissing = Array.from(new Set(missing));
    return { existing, missing: uniqueMissing, error: null };
  },

  async createBatch(
    items: {
      nama_barang: string;
      kode_barcode?: string;
      id_kategori?: string;
      harga_jual: number;
      harga_beli: number;
    }[],
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    return safeQuery<InventoryItem[]>(
      async () => {
        const payload = items.map((item, index) => ({
          nama_barang: item.nama_barang,
          kode_barcode: item.kode_barcode || 'AUTO-' + Date.now() + index,
          id_kategori: item.id_kategori || null,
          created_by: user.id,
          harga_beli_terakhir: item.harga_beli,
          harga_jual: item.harga_jual,
          diskon: 0,
          stok: 0,
          minimum_stock: 0,
          unit: 'pcs',
        }));

        const result = await supabase
          .from('inventory')
          .insert(payload)
          .select('*, id_kategori:id_kategori(*)');

        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },

  async upsertBatch(
    items: {
      nama_barang: string;
      kode_barcode?: string;
      id_kategori?: string;
      harga_jual: number;
      harga_beli: number;
      stok?: number;
      diskon?: number;
    }[],
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    return safeQuery<InventoryItem[]>(
      async () => {
        const payload = items.map((item, index) => {
          return {
            nama_barang: item.nama_barang.trim(),
            kode_barcode: item.kode_barcode || null,
            id_kategori: item.id_kategori || null,
            created_by: user.id,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
            harga_beli_terakhir: item.harga_beli || 0,
            harga_jual: item.harga_jual || 0,
            diskon: item.diskon || 0,
            stok: item.stok || 0,
            minimum_stock: 0,
            unit: 'pcs',
          };
        });

        const result = await supabase
          .from('inventory')
          .upsert(payload, { onConflict: 'nama_barang', ignoreDuplicates: false })
          .select('*, id_kategori:id_kategori(*)');

        return { data: result.data, error: result.error as Error | null };
      },
      { isMutation: true },
    );
  },
};
