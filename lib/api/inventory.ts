import { supabase } from './client';
import { safeQuery } from './utils';
import { stringSimilarity } from '@/lib/utils';
import { InventoryItem } from '@/types/inventory';
import Fuse from 'fuse.js';

let cachedFuse: Fuse<InventoryItem> | null = null;
let cachedInventoryList: InventoryItem[] | null = null;

export const inventoryApi = {
  async getAll() {
    return safeQuery<InventoryItem[]>(async () => {
      const result = await supabase.from('inventory').select('*, id_kategori:id_kategori(*)').order('nama_barang').limit(1000);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getByIds(ids: string[]) {
    if (!ids || ids.length === 0) return { data: [], error: null };
    return safeQuery<InventoryItem[]>(async () => {
      const result = await supabase.from('inventory').select('*, id_kategori:id_kategori(*)').in('id', ids);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getPaginated(options: { page?: number; limit?: number; search?: string; categoryName?: string; lowStockOnly?: boolean; activeStatus?: 'all' | 'active' | 'discontinued'; sortBy?: string; sortDir?: 'asc' | 'desc' }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const sortBy = options.sortBy || 'nama_barang';
    const isAscending = options.sortDir !== 'desc'; // default is ascending

    let countQuery;
    let dataQuery;

    if (options.lowStockOnly) {
      const p_search = options.search ? options.search.replace(/%/g, '').toLowerCase() : null;
      countQuery = supabase.rpc('get_low_stock_items', { p_search }, { count: 'exact', head: true });
      dataQuery = supabase.rpc('get_low_stock_items', { p_search }).select('*, id_kategori:id_kategori(*)').order(sortBy, { ascending: isAscending }).range(offset, offset + limit - 1);
    } else {
      countQuery = supabase.from('inventory').select('*', { count: 'exact', head: true });
      dataQuery = supabase.from('inventory').select('*, id_kategori:id_kategori(*)').order(sortBy, { ascending: isAscending }).range(offset, offset + limit - 1);

      if (options.search) {
        const safeQueryString = options.search.replace(/%/g, '').toLowerCase();
        const orCondition = `nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`;
        countQuery = countQuery.or(orCondition);
        dataQuery = dataQuery.or(orCondition);
      }

      if (options.activeStatus === 'active') {
        countQuery = countQuery.eq('is_discontinued', false);
        dataQuery = dataQuery.eq('is_discontinued', false);
      } else if (options.activeStatus === 'discontinued') {
        countQuery = countQuery.eq('is_discontinued', true);
        dataQuery = dataQuery.eq('is_discontinued', true);
      }
    }

    let categoryId = null;
    if (options.categoryName) {
      const catResult = await supabase.from('kategori').select('id').eq('nama', options.categoryName).single();
      if (catResult.data) {
        categoryId = catResult.data.id;
        countQuery = countQuery.eq('id_kategori', categoryId);
        dataQuery = dataQuery.eq('id_kategori', categoryId);
      }
    }

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) return { data: [], total: 0, page, limit, hasMore: false, error: countResult.error as Error };
    if (dataResult.error) return { data: [], total: 0, page, limit, hasMore: false, error: dataResult.error as Error };

    const total = countResult.count || 0;
    const data = dataResult.data as InventoryItem[];

    return {
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
      error: null
    };
  },

  async getLowStockCount(options: { search?: string; categoryName?: string } = {}) {
    const p_search = options.search ? options.search.replace(/%/g, '').toLowerCase() : null;
    let countQuery = supabase.rpc('get_low_stock_items', { p_search }, { count: 'exact', head: true });

    if (options.categoryName) {
      const catResult = await supabase.from('kategori').select('id').eq('nama', options.categoryName).single();
      if (catResult.data) {
        countQuery = countQuery.eq('id_kategori', catResult.data.id);
      }
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
      const result = await supabase.from('inventory').select('*').eq('kode_barcode', barcode).maybeSingle();
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

  async fuzzySearch(query: string, inventoryList: InventoryItem[], limit = 20) {
    const queryLower = query.toLowerCase().trim();
    if (queryLower.length < 2) return { data: [], error: null };

    if (!inventoryList || inventoryList.length === 0) return { data: [], error: null };
    // Tier 1 & 2: Exact matches and Starts With
    const exactMatches: Array<InventoryItem & { similarity: number }> = [];
    const startsWithMatches: Array<InventoryItem & { similarity: number }> = [];
    
    for (const item of inventoryList) {
      const barcodeLower = (item.kode_barcode || '').toLowerCase();
      const nameLower = (item.nama_barang || '').toLowerCase();
      
      if (barcodeLower === queryLower) {
        exactMatches.push({ ...item, similarity: 100 });
      } else if (nameLower === queryLower) {
        exactMatches.push({ ...item, similarity: 99 });
      } else if (nameLower.startsWith(queryLower)) {
        startsWithMatches.push({ ...item, similarity: 95 });
      }
    }

    // Tier 3: Fuzzy Search
    const options = {
      keys: [
        { name: 'nama_barang', weight: 2.5 },
        { name: 'kode_barcode', weight: 1.0 }
      ],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    };
    
    let fuse: Fuse<InventoryItem>;
    if (cachedFuse && cachedInventoryList === inventoryList) {
      fuse = cachedFuse;
    } else {
      fuse = new Fuse(inventoryList, options);
      cachedFuse = fuse;
      cachedInventoryList = inventoryList;
    }
    
    const results = fuse.search(queryLower);
    
    const fuseMatches = results.map(result => ({
      ...result.item,
      similarity: Math.round((1 - (result.score || 0)) * 100)
    }));

    // Combine all tiers and deduplicate
    const combined = [...exactMatches, ...startsWithMatches, ...fuseMatches];
    
    const seen = new Set();
    const uniqueResults: Array<InventoryItem & { similarity: number }> = [];
    
    for (const item of combined) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueResults.push(item);
      }
    }
    
    // Sort strictly by similarity (Tier 1 > Tier 2 > Tier 3)
    uniqueResults.sort((a, b) => b.similarity - a.similarity);
    
    return { data: uniqueResults.slice(0, limit), error: null };
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
    const query = supabase.from('inventory').update(data).eq('id', id).select('*, id_kategori:id_kategori(*)').single();
    return safeQuery<InventoryItem>(async () => {
      const result = await query;
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async create(data: { nama_barang: string; kode_barcode?: string; id_kategori?: string; kategori?: string; harga_beli_terakhir?: number; harga_jual?: number; diskon?: number }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }
    
    return safeQuery<InventoryItem>(async () => {
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
          unit: 'pcs'
        })
        .select('*, id_kategori:id_kategori(*)')
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async delete(id: string) {
    return safeQuery<void>(async () => {
      const result = await supabase.from('inventory').delete().eq('id', id);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async toggleDiscontinued(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const current = await supabase
      .from('inventory')
      .select('is_discontinued')
      .eq('id', id)
      .single();

    if (current.error) return { data: null, error: current.error };

    const newStatus = !current.data.is_discontinued;

    return safeQuery<InventoryItem>(async () => {
      const result = await supabase
        .from('inventory')
        .update({
          is_discontinued: newStatus,
          discontinued_at: newStatus ? new Date().toISOString() : null,
          discontinued_by: newStatus ? user.id : null,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getPurchaseHistory(inventory_id: string, options: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const offset = (page - 1) * limit;

    return safeQuery<{ data: any[], count: number, page: number, totalPages: number }>(async () => {
      const query = supabase
        .from('pembelian_items')
        .select(`
          id,
          qty,
          harga_beli,
          pembelian!inner (
            tanggal,
            supplier_nama
          )
        `, { count: 'exact' })
        .eq('inventory_id', inventory_id)
        .range(offset, offset + limit - 1);

      // Using foreignTable for ordering if supported, fallback applied if error
      const result = await (query as any).order('tanggal', { referencedTable: 'pembelian', ascending: false });

      const totalPages = Math.ceil((result.count || 0) / limit);

      const formattedData = (result.data || []).map((item: any) => ({
        id: item.id,
        qty: item.qty,
        harga_beli: item.harga_beli,
        tanggal: item.pembelian?.tanggal,
        supplier_nama: item.pembelian?.supplier_nama
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
          totalPages
        }, 
        error: result.error as Error | null 
      };
    });
  },

  async checkBatchExistence(names: string[], inventoryList: InventoryItem[]): Promise<{ existing: InventoryItem[], missing: string[], error: Error | null }> {
    if (!names || names.length === 0) return { existing: [], missing: [], error: null };
    if (!inventoryList || inventoryList.length === 0) return { existing: [], missing: names, error: null };

    const existing: InventoryItem[] = [];
    const missing: string[] = [];

    const inventoryMap = new Map();
    inventoryList.forEach(item => {
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

  async createBatch(items: { nama_barang: string; kode_barcode?: string; id_kategori?: string; harga_jual: number; harga_beli: number }[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }
    
    return safeQuery<InventoryItem[]>(async () => {
      const payload = items.map((item, index) => ({
        nama_barang: item.nama_barang,
        kode_barcode: item.kode_barcode || ('AUTO-' + Date.now() + index),
        id_kategori: item.id_kategori || null,
        created_by: user.id,
        harga_beli_terakhir: item.harga_beli,
        harga_jual: item.harga_jual,
        diskon: 0,
        stok: 0,
        minimum_stock: 0,
        unit: 'pcs'
      }));

      const result = await supabase
        .from('inventory')
        .insert(payload)
        .select('*, id_kategori:id_kategori(*)');
        
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async upsertBatch(items: { 
    nama_barang: string; 
    kode_barcode?: string; 
    id_kategori?: string; 
    harga_jual: number; 
    harga_beli: number;
    stok?: number;
    diskon?: number;
  }[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }
    
    return safeQuery<InventoryItem[]>(async () => {
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
          unit: 'pcs'
        };
      });

      const result = await supabase
        .from('inventory')
        .upsert(payload, { onConflict: 'nama_barang', ignoreDuplicates: false })
        .select('*, id_kategori:id_kategori(*)');
        
      return { data: result.data, error: result.error as Error | null };
    });
  }
};