import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

export interface Supplier {
  id: string;
  nama: string;
  kontak?: string;
  alamat?: string;
  created_at: string;
}

export const supplierApi = {
  async getAll() {
    return safeQuery<Supplier[]>(queryToPromise(supabase.from('supplier').select('*').order('nama')));
  },

  async getByName(nama: string) {
    return safeQuery<Supplier>(
      queryToPromise(
        supabase.from('supplier').select('*').eq('nama', nama).single()
      )
    );
  },

  async create(data: { nama: string; kontak?: string; alamat?: string }) {
    return safeQuery<Supplier>(queryToPromise(supabase.from('supplier').insert(data).select().single()));
  },

  async getOrCreate(nama: string) {
    const existing = await this.getByName(nama);
    if (existing.data) {
      return existing;
    }
    return this.create({ nama });
  }
};