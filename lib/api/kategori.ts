import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

export interface Kategori {
  id: string;
  nama: string;
  created_at: string;
}

export const kategoriApi = {
  async getAll() {
    return safeQuery<Kategori[]>(
      queryToPromise(
        supabase.from('kategori').select('*').order('nama')
      )
    );
  },

  async getByName(nama: string) {
    return safeQuery<Kategori>(
      queryToPromise(
        supabase.from('kategori').select('*').eq('nama', nama).single()
      )
    );
  },

  async create(nama: string) {
    return safeQuery<Kategori>(
      queryToPromise(
        supabase
          .from('kategori')
          .insert({ nama: nama.trim() })
          .select()
          .single()
      )
    );
  },

  async getOrCreate(nama: string) {
    const existing = await this.getByName(nama);
    if (existing.data) {
      return existing;
    }
    return this.create(nama);
  }
};
