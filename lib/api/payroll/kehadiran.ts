import { format } from 'date-fns';
import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface Kehadiran {
  id: string;
  user_id: string;
  tanggal: string;
  waktu_masuk: string;
  waktu_pulang: string | null;
  status_hadir: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'off';
  menit_kerja: number;
  menit_telat: number;
  menit_lembur_aktual: number;
  menit_lembur_disetujui: number | null;
  status_lembur: 'tidak_ada' | 'pending' | 'disetujui' | 'ditolak';
  created_at: string;
  profiles?: {
    nama: string;
  } | null;
}

export const kehadiranApi = {
  /**
   * Cek status absensi hari ini (Apakah sudah absen masuk?)
   */
  async getTodayStatus() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      // Ambil tanggal lokal hari ini format YYYY-MM-DD
      // Penting: karena timezone, lebih aman query >= awal hari
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      const result = await safeQuery(async () => {
        const res = await supabase
          .from('kehadiran')
          .select('*')
          .eq('user_id', userId)
          .eq('tanggal', dateStr)
          .maybeSingle();
        return { data: res.data as Kehadiran | null, error: res.error as Error | null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Absen Masuk
   */
  async absenMasuk(status_hadir: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'off' = 'hadir') {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const dateStr = format(new Date(), 'yyyy-MM-dd');

      // Hitung keterlambatan (Opsional: bisa dihitung dari frontend atau di backend/database. 
      // Untuk MVP kita taruh 0 dulu, akan dihitung akurat saat integrasi date-fns)
      
      const payload = {
        user_id: userId,
        tanggal: dateStr,
        waktu_masuk: new Date().toISOString(),
        status_hadir
      };

      const result = await safeQuery(
        async () => {
          const res = await supabase.from('kehadiran').insert([payload]).select().single();
          return { data: res.data as Kehadiran, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Absen Pulang
   */
  async absenPulang(id: string, menit_kerja: number, menit_telat: number, menit_lembur_aktual: number) {
    try {
      // Logic status lembur
      const isLembur = menit_lembur_aktual > 30; // Aturan grace period 30m
      const status_lembur = isLembur ? 'pending' : 'tidak_ada';
      // Aturan telat grace period 30m
      const final_telat = menit_telat > 30 ? menit_telat : 0;

      const payload = {
        waktu_pulang: new Date().toISOString(),
        menit_kerja,
        menit_telat: final_telat,
        menit_lembur_aktual,
        status_lembur
      };

      const result = await safeQuery(
        async () => {
          const res = await supabase.from('kehadiran').update(payload).eq('id', id).select().single();
          return { data: res.data as Kehadiran, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Ambil histori pribadi 
   */
  async getMine(limit = 7) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const result = await safeQuery(async () => {
        const res = await supabase
          .from('kehadiran')
          .select('*')
          .eq('user_id', userId)
          .order('tanggal', { ascending: false })
          .limit(limit);
        return { data: res.data as Kehadiran[], error: res.error as Error | null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Ambil lembur butuh tinjauan (Admin)
   */
  async getPendingLembur() {
    try {
      const result = await safeQuery(async () => {
        const res = await supabase
          .from('kehadiran')
          .select('*')
          .eq('status_lembur', 'pending')
          .order('tanggal', { ascending: false });
          
        if (res.error) return { data: null, error: res.error as Error };
        
        if (res.data && res.data.length > 0) {
          const userIds = [...new Set(res.data.map((d: any) => d.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nama')
            .in('id', userIds);
            
          if (profiles) {
            const profileMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
            
            res.data = res.data.map((d: any) => ({
              ...d,
              profiles: profileMap[d.user_id] || null
            }));
          }
        }
        return { data: res.data as Kehadiran[], error: null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Approve Lembur (Admin)
   */
  async approveLembur(id: string, menit_disetujui: number) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase
            .from('kehadiran')
            .update({
              menit_lembur_disetujui: menit_disetujui,
              status_lembur: 'disetujui'
            })
            .eq('id', id)
            .select()
            .single();
          return { data: res.data as Kehadiran, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Ambil semua data kehadiran berdasarkan rentang tanggal (Admin)
   */
  async getAll(startDate?: string, endDate?: string) {
    try {
      const result = await safeQuery(async () => {
        let query = supabase
          .from('kehadiran')
          .select('*')
          .order('tanggal', { ascending: false });

        if (startDate && endDate) {
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        } else if (startDate) {
          query = query.gte('tanggal', startDate);
        } else if (endDate) {
          query = query.lte('tanggal', endDate);
        }

        const res = await query;
        if (res.error) return { data: null, error: res.error as Error };

        if (res.data && res.data.length > 0) {
          const userIds = [...new Set(res.data.map((d: any) => d.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nama')
            .in('id', userIds);
            
          if (profiles) {
            const profileMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});
            
            res.data = res.data.map((d: any) => ({
              ...d,
              profiles: profileMap[d.user_id] || null
            }));
          }
        }
        return { data: res.data as Kehadiran[], error: null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Update data kehadiran secara spesifik (Admin)
   */
  async updateKehadiran(id: string, payload: Partial<Kehadiran>) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase
            .from('kehadiran')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
          return { data: res.data as Kehadiran, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Buat entri kehadiran baru (Admin)
   */
  async createKehadiran(payload: Omit<Kehadiran, 'id' | 'created_at' | 'profiles'>) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase
            .from('kehadiran')
            .insert([payload])
            .select()
            .single();
          return { data: res.data as Kehadiran, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};
