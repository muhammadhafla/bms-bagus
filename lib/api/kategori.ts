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
  },

  async update(id: string, nama: string) {
    return safeQuery<Kategori>(async () => {
      const result = await supabase
        .from('kategori')
        .update({ nama: nama.trim() })
        .eq('id', id)
        .select()
        .single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async delete(id: string) {
    return safeQuery<void>(async () => {
      const result = await supabase.from('kategori').delete().eq('id', id);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getOrCreateCategories(names: string[]) {
    const uniqueNames = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    if (uniqueNames.length === 0) return { data: [], error: null };

    // Get all existing categories
    const existingRes = await this.getAll();
    if (existingRes.error) return { data: null, error: existingRes.error };

    const existingMap = new Map<string, Kategori>();
    const allCategories = existingRes.data || [];

    allCategories.forEach((c) => {
      existingMap.set(c.nama.toLowerCase(), c);
    });

    const categoriesToReturn: Kategori[] = [];
    const missingNames: string[] = [];

    uniqueNames.forEach((name) => {
      const lowerName = name.toLowerCase();
      if (existingMap.has(lowerName)) {
        categoriesToReturn.push(existingMap.get(lowerName)!);
      } else {
        missingNames.push(name);
      }
    });

    // Create missing categories one by one
    for (const name of missingNames) {
      const newCatRes = await this.create(name);
      if (!newCatRes.error && newCatRes.data) {
        categoriesToReturn.push(newCatRes.data);
      }
    }

    return { data: categoriesToReturn, error: null };
  },
};
