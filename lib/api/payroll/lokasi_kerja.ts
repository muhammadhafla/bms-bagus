import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface LokasiKerja {
  id: string;
  nama: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const lokasiKerjaApi = {
  /**
   * Get all active lokasi_kerja
   */
  async getActive() {
    try {
      const result = await safeQuery(async () => {
        const res = await supabase
          .from('lokasi_kerja')
          .select('*')
          .eq('is_active', true)
          .order('nama', { ascending: true });
        return { data: res.data as LokasiKerja[], error: res.error as Error | null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Admin: Get all lokasi_kerja
   */
  async getAll() {
    try {
      const result = await safeQuery(async () => {
        const res = await supabase
          .from('lokasi_kerja')
          .select('*')
          .order('nama', { ascending: true });
        return { data: res.data as LokasiKerja[], error: res.error as Error | null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Admin: Create lokasi_kerja
   */
  async create(payload: Omit<LokasiKerja, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.from('lokasi_kerja').insert([payload]).select().single();
          return { data: res.data as LokasiKerja, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Admin: Update lokasi_kerja
   */
  async update(id: string, payload: Partial<LokasiKerja>) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.from('lokasi_kerja').update(payload).eq('id', id).select().single();
          return { data: res.data as LokasiKerja, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};
