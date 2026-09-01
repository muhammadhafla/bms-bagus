import { format } from 'date-fns';
import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface Kehadiran {
  id: string;
  user_id: string;
  tanggal: string;
  waktu_masuk: string | null;
  waktu_pulang: string | null;
  waktu_pulang_aktual?: string | null;
  status_hadir: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'off';
  menit_kerja: number;
  menit_telat: number;
  menit_lembur_aktual: number;
  menit_lembur_disetujui: number | null;
  status_lembur: 'tidak_ada' | 'pending' | 'disetujui' | 'ditolak';
  status_pulang_awal?: 'tidak_ada' | 'pending' | 'disetujui_penuh' | 'disetujui_durasi' | 'ditolak';
  alasan_pulang_awal?: string | null;
  menit_pulang_awal?: number;
  created_at: string;
  lat_masuk?: number | null;
  lng_masuk?: number | null;
  accuracy_masuk?: number | null;
  lat_pulang?: number | null;
  lng_pulang?: number | null;
  accuracy_pulang?: number | null;
  lokasi_masuk_id?: string | null;
  lokasi_pulang_id?: string | null;
  lokasi_masuk?: {
    id: string;
    nama: string;
  } | null;
  lokasi_pulang?: {
    id: string;
    nama: string;
  } | null;
  profiles?: {
    nama: string;
  } | null;
}

export interface TodaySummary {
  tanggal: string;
  total_aktif: number;
  hadir_tepat: number;
  hadir_telat: number;
  total_hadir: number;
  izin: number;
  sakit: number;
  off: number;
  pending_lembur: number;
  pending_pulang_awal?: number;
  total_pulang_awal?: number;
  belum_hadir: number;
}

export interface PaginatedKehadiranParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  statusHadir?: string;
  lokasiId?: string;
  statusLembur?: string;
  statusPulangAwal?: string;
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
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      const result = await safeQuery(async () => {
        const res = await supabase
          .from('kehadiran')
          .select(`
            *,
            lokasi_masuk:lokasi_kerja!kehadiran_lokasi_masuk_id_fkey(id, nama),
            lokasi_pulang:lokasi_kerja!kehadiran_lokasi_pulang_id_fkey(id, nama)
          `)
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
   * Absen Masuk dengan validasi GPS & Timezone WIB
   */
  async absenMasuk(lat: number, lng: number, accuracy?: number | null, status_hadir: 'hadir' | 'izin' | 'sakit' | 'alpha' | 'off' = 'hadir') {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('absen_masuk_with_gps', {
            p_lat: lat,
            p_lng: lng,
            p_accuracy: accuracy ?? null,
            p_status_hadir: status_hadir
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
   * Absen Pulang dengan validasi GPS & Kalkulasi Server-Side
   */
  async absenPulang(id: string, lat: number, lng: number, accuracy?: number | null, alasanPulangAwal?: string | null) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('absen_pulang_with_gps', {
            p_kehadiran_id: id,
            p_lat: lat,
            p_lng: lng,
            p_accuracy: accuracy ?? null,
            p_alasan_pulang_awal: alasanPulangAwal ?? null
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
          .select(`
            *,
            lokasi_masuk:lokasi_kerja!kehadiran_lokasi_masuk_id_fkey(id, nama),
            lokasi_pulang:lokasi_kerja!kehadiran_lokasi_pulang_id_fkey(id, nama)
          `)
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
          .select(`
            *,
            lokasi_masuk:lokasi_kerja!kehadiran_lokasi_masuk_id_fkey(id, nama),
            lokasi_pulang:lokasi_kerja!kehadiran_lokasi_pulang_id_fkey(id, nama)
          `)
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
   * Ambil daftar pulang awal yang butuh tinjauan (Admin)
   */
  async getPendingPulangAwal() {
    try {
      const result = await safeQuery(async () => {
        const res = await supabase
          .from('kehadiran')
          .select(`
            *,
            lokasi_masuk:lokasi_kerja!kehadiran_lokasi_masuk_id_fkey(id, nama),
            lokasi_pulang:lokasi_kerja!kehadiran_lokasi_pulang_id_fkey(id, nama)
          `)
          .eq('status_pulang_awal', 'pending')
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
   * Review Pulang Awal (Admin: 'hitung_penuh' | 'sesuai_durasi')
   */
  async reviewPulangAwal(id: string, keputusan: 'hitung_penuh' | 'sesuai_durasi', catatan?: string) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('review_pulang_awal', {
            p_kehadiran_id: id,
            p_keputusan: keputusan,
            p_catatan_admin: catatan ?? null
          });
          if (res.error) throw res.error;
          return { data: res.data as Kehadiran, error: null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan saat mereview kepulangan awal' } };
    }
  },

  /**
   * Bulk Review Pulang Awal (Admin)
   */
  async bulkReviewPulangAwal(ids: string[], keputusan: 'hitung_penuh' | 'sesuai_durasi') {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('bulk_review_pulang_awal', {
            p_ids: ids,
            p_keputusan: keputusan
          });
          if (res.error) throw res.error;
          return { data: res.data as number, error: null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan saat mereview massal' } };
    }
  },

  /**
   * Approve Lembur Single (Admin)
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
   * Bulk Approve Lembur (Admin)
   */
  async bulkApproveLembur(ids: string[]) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('bulk_approve_lembur', { p_ids: ids });
          if (res.error) throw res.error;
          return { data: res.data as number, error: null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan saat approve lembur massal' } };
    }
  },

  /**
   * Ambil ringkasan statistik kehadiran hari ini (Live Summary Admin)
   */
  async getTodaySummary() {
    try {
      const result = await safeQuery(async () => {
        const res = await supabase.rpc('get_today_kehadiran_summary');
        if (res.error) throw res.error;
        return { data: res.data as TodaySummary, error: null };
      });
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan saat memuat ringkasan' } };
    }
  },

  /**
   * Ambil data kehadiran dengan Server-Side Pagination & Filtering (Admin)
   */
  async getPaginated(params: PaginatedKehadiranParams) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        startDate,
        endDate,
        statusHadir,
        lokasiId,
        statusLembur,
        statusPulangAwal
      } = params;

      const result = await safeQuery(async () => {
        let userIdsFilter: string[] | null = null;

        // Jika ada pencarian nama, cari dulu user_id yang cocok di profiles
        if (search && search.trim() !== '') {
          const { data: matchedProfiles } = await supabase
            .from('profiles')
            .select('id')
            .ilike('nama', `%${search.trim()}%`);
          
          if (matchedProfiles && matchedProfiles.length > 0) {
            userIdsFilter = matchedProfiles.map((p) => p.id);
          } else {
            return { data: { list: [], total: 0 }, error: null };
          }
        }

        let query = supabase
          .from('kehadiran')
          .select(
            `
              *,
              lokasi_masuk:lokasi_kerja!kehadiran_lokasi_masuk_id_fkey(id, nama),
              lokasi_pulang:lokasi_kerja!kehadiran_lokasi_pulang_id_fkey(id, nama)
            `,
            { count: 'exact' }
          )
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false });

        if (userIdsFilter !== null) {
          query = query.in('user_id', userIdsFilter);
        }

        if (startDate && endDate) {
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        } else if (startDate) {
          query = query.gte('tanggal', startDate);
        } else if (endDate) {
          query = query.lte('tanggal', endDate);
        }

        if (statusHadir && statusHadir !== 'all') {
          query = query.eq('status_hadir', statusHadir);
        }

        if (statusLembur && statusLembur !== 'all') {
          query = query.eq('status_lembur', statusLembur);
        }

        if (statusPulangAwal && statusPulangAwal !== 'all') {
          query = query.eq('status_pulang_awal', statusPulangAwal);
        }

        if (lokasiId && lokasiId !== 'all') {
          query = query.or(`lokasi_masuk_id.eq.${lokasiId},lokasi_pulang_id.eq.${lokasiId}`);
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const res = await query.range(from, to);

        if (res.error) return { data: null, error: res.error as Error };

        let listData = (res.data || []) as Kehadiran[];

        if (listData.length > 0) {
          const userIds = [...new Set(listData.map((d: any) => d.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nama')
            .in('id', userIds);

          if (profiles) {
            const profileMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p;
              return acc;
            }, {});

            listData = listData.map((d: any) => ({
              ...d,
              profiles: profileMap[d.user_id] || null
            }));
          }
        }

        return {
          data: {
            list: listData,
            total: res.count || 0
          },
          error: null
        };
      });

      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Ambil semua data kehadiran berdasarkan rentang tanggal untuk Ekspor (Admin)
   */
  async getAll(startDate?: string, endDate?: string, lokasiId?: string, statusHadir?: string, statusPulangAwal?: string) {
    try {
      const result = await safeQuery(async () => {
        let query = supabase
          .from('kehadiran')
          .select(`
            *,
            lokasi_masuk:lokasi_kerja!kehadiran_lokasi_masuk_id_fkey(id, nama),
            lokasi_pulang:lokasi_kerja!kehadiran_lokasi_pulang_id_fkey(id, nama)
          `)
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false });

        if (startDate && endDate) {
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        } else if (startDate) {
          query = query.gte('tanggal', startDate);
        } else if (endDate) {
          query = query.lte('tanggal', endDate);
        }

        if (statusHadir && statusHadir !== 'all') {
          query = query.eq('status_hadir', statusHadir);
        }

        if (statusPulangAwal && statusPulangAwal !== 'all') {
          query = query.eq('status_pulang_awal', statusPulangAwal);
        }

        if (lokasiId && lokasiId !== 'all') {
          query = query.or(`lokasi_masuk_id.eq.${lokasiId},lokasi_pulang_id.eq.${lokasiId}`);
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
