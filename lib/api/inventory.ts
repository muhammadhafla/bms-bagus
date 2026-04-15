import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';
import { stringSimilarity } from '@/lib/utils';
import { InventoryItem } from '@/types/inventory';

export const inventoryApi = {
  async getAll() {
    return safeQuery<InventoryItem[]>(queryToPromise(supabase.from('inventory').select('*, id_kategori:id_kategori(*)').order('nama_barang').limit(1000)));
  },

  async getByBarcode(barcode: string) {
    return safeQuery<InventoryItem>(queryToPromise(supabase.from('inventory').select('*').eq('kode_barcode', barcode).single()));
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

    return safeQuery<InventoryItem[]>(queryToPromise(queryBuilder.limit(100)));
  },

  async fuzzySearch(query: string) {
    const result = await this.getAll();
    if (result.error || !result.data) return result;
    
    const safeQuery = query.toLowerCase().trim();
    
    const scoredItems = result.data
      .map(item => ({
        ...item,
        similarity: Math.max(
          stringSimilarity(safeQuery, item.nama_barang.toLowerCase()),
          stringSimilarity(safeQuery, (item.kode_barcode || '').toLowerCase())
        )
      }))
      .filter(item => item.similarity >= 50)
      .sort((a, b) => b.similarity - a.similarity);
    
    return { data: scoredItems.slice(0, 5), error: null };
  },

  async update(id: string, data: Partial<{ harga_jual: number; diskon: number; minimum_stock: number; harga_beli_terakhir: number }>) {
    return safeQuery<InventoryItem>(queryToPromise(supabase.from('inventory').update(data).eq('id', id).select().single()));
  },

  async create(data: { nama_barang: string; kode_barcode?: string; id_kategori?: string; kategori?: string; harga_beli_terakhir?: number; harga_jual?: number; diskon?: number }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }
    
    // Generate unique slug from nama_barang
    const slug = data.nama_barang.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    
    return safeQuery<InventoryItem>(
      queryToPromise(
        supabase
          .from('inventory')
          .insert({ 
            nama_barang: data.nama_barang,
            slug: slug,
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
          .single()
      )
    );
  },

  async delete(id: string) {
    return safeQuery<void>(queryToPromise(supabase.from('inventory').delete().eq('id', id)));
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

    return safeQuery<InventoryItem>(
      queryToPromise(
        supabase
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
          .single()
      )
    );
  }
};