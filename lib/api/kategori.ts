import { supabase } from './client';
import { safeQuery } from './utils';

export interface Kategori {
  id: string;
  nama: string;
  created_at: string;
}

export const kategoriApi = {
  async getAll() {
    return safeQuery<Kategori[]>(async () => {
      const result = await supabase.from('kategori').select('*').order('nama');
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getByName(nama: string) {
    return safeQuery<Kategori>(async () => {
      const result = await supabase.from('kategori').select('*').eq('nama', nama).single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async create(nama: string) {
    return safeQuery<Kategori>(async () => {
      const result = await supabase
        .from('kategori')
        .insert({ nama: nama.trim() })
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getOrCreate(nama: string) {
    const existing = await this.getByName(nama);
    if (existing.data) {
      return existing;
    }
    return this.create(nama);
  }
};
