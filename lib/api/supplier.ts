import { supabase } from './client';
import { safeQuery } from './utils';

export interface Supplier {
  id: string;
  nama: string;
  kontak?: string;
  alamat?: string;
  created_at: string;
}

export const supplierApi = {
  async getAll() {
    return safeQuery<Supplier[]>(async () => {
      const result = await supabase.from('supplier').select('*').order('nama');
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getByName(nama: string) {
    return safeQuery<Supplier>(async () => {
      const result = await supabase.from('supplier').select('*').eq('nama', nama).single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async create(data: { nama: string; kontak?: string; alamat?: string }) {
    return safeQuery<Supplier>(async () => {
      const result = await supabase.from('supplier').insert(data).select().single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getOrCreate(nama: string) {
    const existing = await this.getByName(nama);
    if (existing.data) {
      return existing;
    }
    return this.create({ nama });
  }
};