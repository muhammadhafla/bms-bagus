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
    const query = supabase.from('inventory').update(data).eq('id', id).select().single();
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
  }
};