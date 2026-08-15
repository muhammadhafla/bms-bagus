import { supabase } from './client';
import { safeQuery } from './utils';
import { InventoryItem } from '@/types/inventory';

export interface Promo {
  id: string;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PromoItem {
  id: string;
  promosi_id: string;
  inventory_id: string;
  diskon_nominal: number;
  created_at: string;
  inventory?: InventoryItem;
}

export const promoApi = {
  async getAll() {
    return safeQuery<Promo[]>(async () => {
      const result = await supabase
        .from('promosi')
        .select('*')
        .order('tanggal_mulai', { ascending: false });
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getById(id: string) {
    return safeQuery<{ promo: Promo; items: PromoItem[] }>(async () => {
      const promoResult = await supabase.from('promosi').select('*').eq('id', id).single();
      if (promoResult.error) return { data: null, error: promoResult.error as Error };

      const itemsResult = await supabase
        .from('promosi_items')
        .select('*, inventory:inventory_id(*)')
        .eq('promosi_id', id);

      if (itemsResult.error) return { data: null, error: itemsResult.error as Error };

      return {
        data: {
          promo: promoResult.data,
          items: itemsResult.data,
        },
        error: null,
      };
    });
  },

  async upsert(promo: Partial<Promo>, items: { inventory_id: string; diskon_nominal: number }[]) {
    return safeQuery<Promo>(async () => {
      let promoId = promo.id;

      if (promoId) {
        const { error } = await supabase
          .from('promosi')
          .update({
            nama: promo.nama,
            tanggal_mulai: promo.tanggal_mulai,
            tanggal_selesai: promo.tanggal_selesai,
            status: promo.status || 'aktif',
          })
          .eq('id', promoId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('promosi')
          .insert({
            nama: promo.nama,
            tanggal_mulai: promo.tanggal_mulai,
            tanggal_selesai: promo.tanggal_selesai,
            status: promo.status || 'aktif',
          })
          .select('id')
          .single();
        if (error) throw error;
        promoId = data.id;
      }

      if (promoId) {
        const { error: delError } = await supabase
          .from('promosi_items')
          .delete()
          .eq('promosi_id', promoId);
        if (delError) throw delError;

        if (items && items.length > 0) {
          const insertData = items.map((i) => ({
            promosi_id: promoId,
            inventory_id: i.inventory_id,
            diskon_nominal: i.diskon_nominal,
          }));
          const { error: insError } = await supabase.from('promosi_items').insert(insertData);
          if (insError) throw insError;
        }
      }

      const { data: finalPromo } = await supabase
        .from('promosi')
        .select('*')
        .eq('id', promoId)
        .single();
      return { data: finalPromo, error: null };
    });
  },

  async delete(id: string) {
    return safeQuery(async () => {
      const { error } = await supabase.from('promosi').delete().eq('id', id);
      return { data: null, error: error as Error | null };
    });
  },

  async getActivePromosMap(): Promise<Record<string, number>> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promosi_items')
      .select('inventory_id, diskon_nominal, promosi!inner(status, tanggal_mulai, tanggal_selesai)')
      .eq('promosi.status', 'aktif')
      .lte('promosi.tanggal_mulai', now)
      .gte('promosi.tanggal_selesai', now);

    if (error) {
      console.error('Error fetching active promos:', error);
      return {};
    }

    const map: Record<string, number> = {};
    if (data) {
      for (const item of data) {
        map[item.inventory_id] = item.diskon_nominal;
      }
    }
    return map;
  },
};
