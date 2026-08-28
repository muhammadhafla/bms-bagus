import { format } from 'date-fns';
import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface Kehadiran {
  id: string;
  user_id: string;
  tanggal: string;
  waktu_masuk: string | null;
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
   * Absen Masuk dengan validasi GPS
   */
  async absenMasuk(lat: number, lng: number, status_hadir: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'off' = 'hadir') {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('absen_masuk_with_gps', {
            p_user_id: userId,
            p_status_hadir: status_hadir,
            p_lat: lat,
            p_lng: lng
          });
          
          if (res.error) throw res.error;
          return { data: res.data as Kehadiran, error: null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan atau di luar area kerja' } };
    }
  },

  /**
   * Absen Pulang dengan validasi GPS
   */
  async absenPulang(id: string, menit_kerja: number, menit_telat: number, menit_lembur_aktual: number, lat: number, lng: number) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('absen_pulang_with_gps', {
            p_kehadiran_id: id,
            p_menit_kerja: menit_kerja,
            p_menit_telat: menit_telat,
            p_menit_lembur: menit_lembur_aktual,
            p_lat: lat,
            p_lng: lng
          });
          
          if (res.error) throw res.error;
          return { data: res.data as Kehadiran, error: null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan atau di luar area kerja' } };
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
