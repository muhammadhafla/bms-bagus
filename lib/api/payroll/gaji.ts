import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface SlipGaji {
  id: string;
  user_id: string;
  periode_bulan: string; // YYYY-MM
  total_hari_hadir: number;
  total_jam_telat: number;
  total_jam_lembur: number;
  total_gaji_harian: number;
  total_denda_telat: number;
  total_gaji_lembur: number;
  total_potongan_kasbon: number;
  tipe_gaji: 'harian' | 'bulanan';
  gaji_bulanan: number;
  total_hari_libur: number;
  total_potongan_libur: number;
  gaji_bersih: number;
  status_pembayaran: 'draft' | 'dibayar';
  dibayar_pada: string | null;
  created_at: string;
  profiles?: {
    nama: string;
  } | null;
}

export interface GetGajiParams {
  periode?: string; // used for admin mostly
  page?: number;
  limit?: number;
  search?: string;
  status_pembayaran?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface GajiPaginatedResponse {
  data: SlipGaji[] | null;
  total: number;
  error: { message: string } | null;
  isPreview?: boolean;
}

export const gajiApi = {
  /**
   * Ambil slip gaji saya (Untuk Karyawan)
   */
  async getMine(params: GetGajiParams = {}): Promise<GajiPaginatedResponse> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const {
        page = 1,
        limit = 12,
        sortBy = 'periode_bulan',
        sortDir = 'desc'
      } = params;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('slip_gaji')
        .select(`*, profiles(nama)`, { count: 'exact' })
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(offset, offset + limit - 1);

      const result = await safeQuery(async () => {
        const res = await query;
        return { data: { items: res.data as SlipGaji[], total: res.count || 0 } as any, error: res.error as Error | null };
      });
      return { data: result.data?.items || [], total: result.data?.total || 0, error: result.error };
    } catch (err: any) {
      return { data: null, total: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Ambil semua slip berdasarkan periode (Admin)
   */
  async getByPeriode(params: GetGajiParams): Promise<GajiPaginatedResponse> {
    try {
      const {
        periode,
        page = 1,
        limit = 20,
        search = '',
        status_pembayaran = 'all',
        sortBy = 'created_at',
        sortDir = 'desc'
      } = params;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('slip_gaji')
        .select(`*, profiles!inner(nama)`, { count: 'exact' });
      
      if (periode) {
        query = query.eq('periode_bulan', periode);
      }
      
      if (status_pembayaran && status_pembayaran !== 'all') {
        query = query.eq('status_pembayaran', status_pembayaran);
      }

      if (search) {
        query = query.ilike('profiles.nama', `%${search}%`);
      }

      query = query.order(sortBy, { ascending: sortDir === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const result = await safeQuery(async () => {
        const res = await query;
        return { data: { items: res.data as SlipGaji[], total: res.count || 0 } as any, error: res.error as Error | null };
      });
      
      let data = result.data?.items || [];
      let total = result.data?.total || 0;
      let isPreview = false;

      if (data.length === 0 && periode && (!status_pembayaran || status_pembayaran === 'all' || status_pembayaran === 'draft')) {
        const previewRes = await supabase.rpc('preview_gaji', { p_periode: periode });
        if (previewRes.data && previewRes.data.length > 0) {
           let previewData = previewRes.data as any[];
           
           if (search) {
              previewData = previewData.filter(d => d.nama?.toLowerCase().includes(search.toLowerCase()));
           }
           
           previewData = previewData.map(d => ({
              ...d,
              profiles: { nama: d.nama }
           }));

           previewData.sort((a, b) => {
             const valA = a[sortBy];
             const valB = b[sortBy];
             if (valA < valB) return sortDir === 'asc' ? -1 : 1;
             if (valA > valB) return sortDir === 'asc' ? 1 : -1;
             return 0;
           });

           total = previewData.length;
           data = previewData.slice(offset, offset + limit);
           isPreview = true;
        }
      }

      return { data, total, error: result.error, isPreview };
    } catch (err: any) {
      return { data: null, total: 0, error: { message: err.message || 'Terjadi kesalahan' }, isPreview: false };
    }
  },

  /**
   * Ambil atau generate slip gaji on-demand untuk karyawan tertentu (Admin)
   */
  async getOrGenerateSlip(userId: string, periode: string): Promise<{ data: SlipGaji | null; error: { message: string } | null }> {
    try {
      // 1. Cek apakah slip sudah ada di database dan sudah dibayar
      const { data: existing } = await supabase
        .from('slip_gaji')
        .select(`*, profiles(nama)`)
        .eq('user_id', userId)
        .eq('periode_bulan', periode)
        .maybeSingle();

      if (existing && existing.status_pembayaran === 'dibayar') {
        return { data: existing as SlipGaji, error: null };
      }

      // 2. Jika belum ada, panggil RPC preview_gaji untuk mendapatkan kalkulasi
      const previewRes = await supabase.rpc('preview_gaji', { p_periode: periode });
      if (previewRes.error) {
        throw new Error(previewRes.error.message || 'Gagal menghitung slip gaji');
      }

      const match = (previewRes.data as any[])?.find((item: any) => item.user_id === userId);
      if (!match) {
        throw new Error('Data slip gaji tidak ditemukan untuk karyawan ini pada periode tersebut.');
      }

      // 3. Auto-persist sebagai draft ke slip_gaji
      const insertPayload = {
        user_id: match.user_id,
        periode_bulan: match.periode_bulan,
        total_hari_hadir: match.total_hari_hadir,
        total_jam_telat: match.total_jam_telat,
        total_jam_lembur: match.total_jam_lembur,
        total_gaji_harian: match.total_gaji_harian,
        total_denda_telat: match.total_denda_telat,
        total_gaji_lembur: match.total_gaji_lembur,
        total_potongan_kasbon: match.total_potongan_kasbon,
        gaji_bersih: match.gaji_bersih,
        status_pembayaran: 'draft' as const,
      };

      const { data: savedSlip, error: insertError } = await supabase
        .from('slip_gaji')
        .upsert(insertPayload, { onConflict: 'user_id, periode_bulan' })
        .select(`*, profiles(nama)`)
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Gagal menyimpan draft slip gaji');
      }

      return { data: savedSlip as SlipGaji, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Simpan Slip (Draft) / Generate (Admin)
   */
  async upsertSlip(payload: Partial<SlipGaji> & { user_id: string, periode_bulan: string }) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase
            .from('slip_gaji')
            .upsert(payload, { onConflict: 'user_id, periode_bulan' })
            .select()
            .single();
          return { data: res.data as SlipGaji, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Update status pembayaran slip (Admin)
   */
  async updateStatus(id: string, status: 'draft' | 'dibayar') {
    try {
      const result = await safeQuery(
        async () => {
          const payload = {
            status_pembayaran: status,
            dibayar_pada: status === 'dibayar' ? new Date().toISOString() : null
          };
          const res = await supabase
            .from('slip_gaji')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
          return { data: res.data as SlipGaji, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Proses kalkulasi gaji otomatis via RPC (Admin)
   */
  async prosesKalkulasi(periode: string) {
    try {
      const result = await safeQuery(
        async () => {
          const res = await supabase.rpc('proses_gaji', { p_periode: periode });
          return { data: res.data, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};
