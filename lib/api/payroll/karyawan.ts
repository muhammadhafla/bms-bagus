import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface Karyawan {
  id: string;
  user_id: string;
  jam_masuk: string;
  jam_pulang: string;
  gaji_harian: number;
  denda_telat_per_jam: number;
  lembur_per_jam: number;
  nama_bank: string | null;
  no_rekening: string | null;
  status_karyawan: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
  // join dengan profiles
  profiles?: {
    nama: string;
    email?: string;
  } | null;
}

export const karyawanApi = {
  /**
   * Mengambil semua data karyawan (Untuk Admin)
   */
  async getAll() {
    try {
      const result = await safeQuery(async () => {
        const res = await supabase
          .from('karyawan')
          .select(`*, profiles!karyawan_user_id_fkey(nama, email)`)
          .order('created_at', { ascending: false });
        return { data: res.data as Karyawan[], error: res.error as Error | null };
      });
      return result;
    } catch (err: any) {
      console.error('Error fetching karyawan:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Mengambil profil karyawan saat ini (Untuk Karyawan)
   */
  async getMine() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const result = await safeQuery(async () => {
        const res = await supabase
          .from('karyawan')
          .select(`*, profiles!karyawan_user_id_fkey(nama, email)`)
          .eq('user_id', userId)
          .single();
        return { data: res.data as Karyawan, error: res.error as Error | null };
      });
      return result;
    } catch (err: any) {
      console.error('Error fetching my karyawan profile:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Membuat atau Update data Karyawan (Hanya Admin)
   */
  async upsert(payload: Partial<Karyawan> & { user_id: string }) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase
            .from('karyawan')
            .upsert(payload, { onConflict: 'user_id' })
            .select()
            .single();
          return { data: res.data as Karyawan, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      console.error('Error upserting karyawan:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};
