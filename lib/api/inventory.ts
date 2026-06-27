import { supabase } from './client';
import { safeQuery } from './utils';
import { stringSimilarity } from '@/lib/utils';
import { InventoryItem } from '@/types/inventory';

let inventoryCache: InventoryItem[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getInventoryWithCache() {
  const now = Date.now();
  
  if (inventoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return { data: inventoryCache, error: null };
  }
  
  const result = await safeQuery<InventoryItem[]>(
      async () => {
        const result = await supabase
          .from('inventory')
          .select('*, id_kategori:id_kategori(*)')
          .order('nama_barang')
          .limit(200);
        return { data: result.data, error: result.error as Error | null };
      }
    );
  
  if (!result.error && result.data) {
    inventoryCache = result.data;
    cacheTimestamp = now;
  }
  
  return result;
}

export function clearInventoryCache() {
  inventoryCache = null;
  cacheTimestamp = 0;
}

export async function preloadInventoryCache() {
  await getInventoryWithCache();
}

export const inventoryApi = {
  async getAll() {
    return safeQuery<InventoryItem[]>(async () => {
      const result = await supabase.from('inventory').select('*, id_kategori:id_kategori(*)').order('nama_barang').limit(1000);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getPaginated(options: { page?: number; limit?: number; search?: string; categoryName?: string; lowStockOnly?: boolean }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    // If lowStockOnly is true, we fallback to client-side filtering because Supabase REST 
    // doesn't natively support comparing two columns (stok <= minimum_stock) without RPC.
    if (options.lowStockOnly) {
      const query = supabase.from('inventory').select('*, id_kategori:id_kategori(*)').order('nama_barang');
      if (options.search) {
        const safeQueryString = options.search.replace(/%/g, '').toLowerCase();
        query.or(`nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`);
      }
      const result = await query;
      if (result.error) return { data: [], total: 0, page, limit, hasMore: false, error: result.error as Error };
      
      let filtered = result.data as InventoryItem[];
      filtered = filtered.filter(item => item.minimum_stock != null && item.stok <= item.minimum_stock);
      if (options.categoryName) {
        filtered = filtered.filter(item => item.id_kategori?.nama === options.categoryName);
      }
      
      const total = filtered.length;
      const paginatedData = filtered.slice(offset, offset + limit);
      return { data: paginatedData, total, page, limit, hasMore: offset + paginatedData.length < total, error: null };
    }

    let categoryId = null;
    if (options.categoryName) {
      const catResult = await supabase.from('kategori').select('id').eq('nama', options.categoryName).single();
      if (catResult.data) {
        categoryId = catResult.data.id;
      }
    }

    const countQuery = supabase.from('inventory').select('*', { count: 'exact', head: true });
    let dataQuery = supabase.from('inventory').select('*, id_kategori:id_kategori(*)').order('nama_barang').range(offset, offset + limit - 1);

    if (options.search) {
      const safeQueryString = options.search.replace(/%/g, '').toLowerCase();
      const orCondition = `nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`;
      countQuery.or(orCondition);
      dataQuery.or(orCondition);
    }

    if (categoryId) {
      countQuery.eq('id_kategori', categoryId);
      dataQuery.eq('id_kategori', categoryId);
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

  async getByBarcode(barcode: string) {
    return safeQuery<InventoryItem>(async () => {
      const result = await supabase.from('inventory').select('*').eq('kode_barcode', barcode).single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async search(query: string, includeDiscontinued = false) {
    const safeQueryString = query.replace(/%/g, '').toLowerCase();
    
    const queryBuilder = supabase
      .from('inventory')
      .select('*, id_kategori:id_kategori(*)')
      .or(`nama_barang.ilike.%${safeQueryString}%,kode_barcode.ilike.%${safeQueryString}%`)
      .order('nama_barang');

    if (!includeDiscontinued) {
      queryBuilder.eq('is_discontinued', false);
    }

    return safeQuery<InventoryItem[]>(async () => {
      const result = await queryBuilder.limit(100);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async fuzzySearch(query: string, limit = 20) {
    const queryLower = query.toLowerCase().trim();
    if (queryLower.length < 2) return { data: [], error: null };

    const result = await getInventoryWithCache();
    if (result.error || !result.data) return { data: [], error: result.error };
    
    const scoredItems: Array<InventoryItem & { similarity: number }> = result.data
      .map((item: InventoryItem) => ({
        ...item,
        similarity: Math.max(
          stringSimilarity(queryLower, item.nama_barang.toLowerCase()),
          stringSimilarity(queryLower, (item.kode_barcode || '').toLowerCase())
        )
      }))
      .filter((item: InventoryItem & { similarity: number }) => item.similarity >= 50)
      .sort((a, b) => b.similarity - a.similarity);
    
    return { data: scoredItems.slice(0, limit), error: null };
  },

  async getByExactBarcode(barcode: string) {
    const normalizedBarcode = barcode.toUpperCase().trim();
    if (!normalizedBarcode) return { data: null, error: null };
    
    return safeQuery<InventoryItem>(async () => {
      const result = await supabase
        .from('inventory')
        .select('*, id_kategori:id_kategori(*)')
        .eq('kode_barcode', normalizedBarcode)
        .single();
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

  async checkBatchExistence(names: string[]) {
    if (!names || names.length === 0) return { existing: [], missing: [] };
    
    const result = await getInventoryWithCache();

    if (result.error || !result.data) {
      return { existing: [], missing: names, error: result.error };
    }

    const existing: InventoryItem[] = [];
    const missing: string[] = [];

    const inventoryMap = new Map();
    result.data.forEach(item => {
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
        
      if (!result.error) {
        clearInventoryCache();
      }
        
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
        
      if (!result.error) {
        clearInventoryCache();
      }
        
      return { data: result.data, error: result.error as Error | null };
    });
  }
};