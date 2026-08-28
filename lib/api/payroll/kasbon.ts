import { supabase } from '../client';
import { safeQuery } from '../utils';

export interface Kasbon {
  id: string;
  user_id: string;
  tanggal: string;
  nominal: number;
  keterangan: string | null;
  status: 'pending' | 'disetujui' | 'ditolak';
  created_at: string;
  updated_at: string;
  // join
  profiles?: {
    nama: string;
    vw_payroll_saldo?: { total_saldo: number }[];
  } | null;
}

export interface GetKasbonParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface KasbonPaginatedResponse {
  data: Kasbon[] | null;
  total: number;
  error: { message: string } | null;
}

export const kasbonApi = {
  /**
   * Mengambil riwayat kasbon/penarikan saya (Untuk Karyawan)
   */
  async getMine(params: GetKasbonParams = {}): Promise<KasbonPaginatedResponse> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const {
        page = 1,
        limit = 20,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortDir = 'desc',
        startDate,
        endDate
      } = params;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('payroll_mutasi')
        .select(`*`, { count: 'exact' })
        .eq('user_id', userId)
        .eq('jenis', 'debit');

      if (status && status !== 'all') query = query.eq('status', status);
      if (startDate) query = query.gte('tanggal', startDate);
      if (endDate) query = query.lte('tanggal', endDate);
      if (search) query = query.ilike('keterangan', `%${search}%`);

      query = query.order(sortBy, { ascending: sortDir === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const result = await safeQuery(async () => {
        const res = await query;
        return { data: { items: res.data as Kasbon[], total: res.count || 0 } as any, error: res.error as Error | null };
      });
      return { data: result.data?.items || [], total: result.data?.total || 0, error: result.error };
    } catch (err: any) {
      return { data: null, total: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Mengambil semua kasbon/penarikan (Untuk Admin, bisa filter pending)
   */
  async getAll(params: GetKasbonParams = {}): Promise<KasbonPaginatedResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortDir = 'desc',
        startDate,
        endDate
      } = params;
      const offset = (page - 1) * limit;

      // Use inner join on profiles if searching by profile name
      let query = supabase
        .from('payroll_mutasi')
        .select(`*, profiles!inner(nama)`, { count: 'exact' })
        .eq('jenis', 'debit');
      
      if (status && status !== 'all') query = query.eq('status', status);
      if (startDate) query = query.gte('tanggal', startDate);
      if (endDate) query = query.lte('tanggal', endDate);
      if (search) {
        query = query.or(`keterangan.ilike.%${search}%,profiles.nama.ilike.%${search}%`);
      }

      query = query.order(sortBy, { ascending: sortDir === 'asc' });
      query = query.range(offset, offset + limit - 1);

      const result = await safeQuery(async () => {
        const res = await query;
        return { data: { items: res.data as Kasbon[], total: res.count || 0 } as any, error: res.error as Error | null };
      });
      
      let data = result.data?.items || [];
      
      // Fetch balances for the users in the result
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      if (userIds.length > 0) {
        const { data: balancesData } = await supabase
          .from('vw_payroll_saldo')
          .select('user_id, total_saldo')
          .in('user_id', userIds);
          
        if (balancesData) {
          const balancesMap = new Map(balancesData.map((b) => [b.user_id, b.total_saldo]));
          data = data.map((d: any) => {
            if (d.profiles) {
              return {
                ...d,
                profiles: {
                  ...d.profiles,
                  vw_payroll_saldo: [{ total_saldo: balancesMap.get(d.user_id) || 0 }]
                }
              };
            }
            return d;
          });
        }
      }

      return { data, total: result.data?.total || 0, error: result.error };
    } catch (err: any) {
      return { data: null, total: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Mengajukan kasbon baru (Karyawan)
   */
  async ajukanKasbon(nominal: number, keterangan: string) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const payload = {
        user_id: userId,
        jenis: 'debit',
        kategori: 'kasbon',
        nominal,
        keterangan,
        status: 'pending'
      };

      const result = await safeQuery(
        async () => {
          const res = await supabase.from('payroll_mutasi').insert([payload]).select().single();
          return { data: res.data as Kasbon, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Membuat kasbon langsung (Admin)
   */
  async createAdmin(userId: string, nominal: number, keterangan: string, status: 'pending' | 'disetujui' = 'disetujui') {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminId = authData.user?.id;
      if (!adminId) throw new Error('Not authenticated');

      const payload = {
        user_id: userId,
        jenis: 'debit',
        kategori: 'kasbon',
        nominal,
        keterangan,
        status
      };

      const result = await safeQuery(
        async () => {
          const res = await supabase.from('payroll_mutasi').insert([payload]).select().single();
          return { data: res.data as Kasbon, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Memperbarui status kasbon (Untuk Admin)
   */
  async updateStatus(id: string, status: 'disetujui' | 'ditolak') {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminId = authData.user?.id;
      if (!adminId) throw new Error('Not authenticated');

      const payload = {
        status
      };

      const result = await safeQuery(
        async () => {
          const res = await supabase.from('payroll_mutasi').update(payload).eq('id', id).select().single();
          return { data: res.data as Kasbon, error: res.error as Error | null };
        },
        { isMutation: true }
      );
      return result;
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};
