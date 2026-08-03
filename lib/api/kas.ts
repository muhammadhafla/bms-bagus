import { supabase } from './client';
import { safeQuery } from './utils';

export interface KasLogItem {
  id: string;
  tipe: 'JUAL' | 'TARIK' | 'RETURN' | 'SETOR' | 'TUTUP_SHIFT';
  jumlah: number;
  referensi_id: string | null;
  catatan: string | null;
  created_by: string;
  created_at: string;
  payment_method: string;
  // relasi (jika dijoin dengan profiles)
  profiles?: {
    nama: string;
  } | null;
}

export const kasApi = {
  /**
   * Mengambil riwayat kas log secara paginasi dengan filter
   */
  async getPaginated(options: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    userId?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const offset = (page - 1) * limit;
      const sortBy = options.sortBy || 'created_at';
      const isAscending = options.sortDir === 'asc';

      let query = supabase
        .from('kas_log')
        .select(`
          *,
          profiles!kas_log_created_by_fkey (nama)
        `, { count: 'exact' })
        .order(sortBy, { ascending: isAscending })
        .range(offset, offset + limit - 1);

      if (options.startDate) {
        query = query.gte('created_at', options.startDate + 'T00:00:00+07:00');
      }
      if (options.endDate) {
        query = query.lte('created_at', options.endDate + 'T23:59:59+07:00');
      }
      if (options.type && options.type !== 'all') {
        query = query.eq('tipe', options.type);
      }
      if (options.userId) {
        query = query.eq('created_by', options.userId);
      }

      const result = await safeQuery(async () => {
        const res = await query;
        return { data: { data: res.data as KasLogItem[], count: res.count }, error: res.error as Error | null };
      });

      if (result.error) {
        return { data: [], total: 0, error: result.error };
      }

      return { data: result.data?.data || [], total: result.data?.count || 0, error: null };
    } catch (err: any) {
      console.error('Error fetching kas log:', err);
      return { data: [], total: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Menghitung total pemasukan, pengeluaran, dan saldo berdasarkan filter
   */
  async getSummary(options: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) {
    try {
      let query = supabase
        .from('kas_log')
        .select('tipe, jumlah');

      if (options.startDate) {
        query = query.gte('created_at', options.startDate + 'T00:00:00+07:00');
      }
      if (options.endDate) {
        query = query.lte('created_at', options.endDate + 'T23:59:59+07:00');
      }
      if (options.userId) {
        query = query.eq('created_by', options.userId);
      }

      const { data, error } = await safeQuery(async () => {
        const res = await query;
        return { data: res.data as { tipe: string, jumlah: number }[], error: res.error as Error | null };
      });

      if (error || !data) {
        return { pemasukan: 0, pengeluaran: 0, saldo: 0, error };
      }

      let pemasukan = 0;
      let pengeluaran = 0;

      data.forEach((row) => {
        if (row.tipe === 'JUAL' || row.tipe === 'SETOR') {
          pemasukan += Number(row.jumlah);
        } else if (row.tipe === 'TARIK' || row.tipe === 'RETURN') {
          pengeluaran += Number(row.jumlah);
        }
        // TUTUP_SHIFT diabaikan dalam kalkulasi saldo karena jumlahnya 0 atau tidak mempengaruhi cash flow
      });

      return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, error: null };
    } catch (err: any) {
      console.error('Error calculating kas summary:', err);
      return { pemasukan: 0, pengeluaran: 0, saldo: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Mendapatkan ringkasan shift berdasarkan tanggal dan opsional user
   * Digunakan oleh Admin untuk melihat rangkuman shift per user
   */
  async getShiftSummary(date: string, userId?: string) {
    try {
      // Ambil seluruh log di hari tersebut
      let query = supabase
        .from('kas_log')
        .select(`
          tipe, jumlah, created_by, created_at,
          profiles!kas_log_created_by_fkey (nama)
        `)
        .gte('created_at', date + 'T00:00:00+07:00')
        .lte('created_at', date + 'T23:59:59+07:00')
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await safeQuery(async () => {
        const res = await query;
        return { data: res.data as any[], error: res.error as Error | null };
      });

      if (error || !data) return { data: [], error };

      // Kelompokkan data per user
      const userShifts: Record<string, {
        userId: string;
        userName: string;
        pemasukan: number;
        pengeluaran: number;
        saldo: number;
        lastActivity: string;
        shiftClosed: boolean;
      }> = {};

      data.forEach(row => {
        const uid = row.created_by;
        if (!userShifts[uid]) {
          userShifts[uid] = {
            userId: uid,
            userName: row.profiles?.nama || 'Unknown',
            pemasukan: 0,
            pengeluaran: 0,
            saldo: 0,
            lastActivity: row.created_at,
            shiftClosed: false
          };
        }

        userShifts[uid].lastActivity = row.created_at;

        if (row.tipe === 'JUAL' || row.tipe === 'SETOR') {
          userShifts[uid].pemasukan += Number(row.jumlah);
        } else if (row.tipe === 'TARIK' || row.tipe === 'RETURN') {
          userShifts[uid].pengeluaran += Number(row.jumlah);
        } else if (row.tipe === 'TUTUP_SHIFT') {
          userShifts[uid].shiftClosed = true;
        }
      });

      // Hitung saldo final
      Object.values(userShifts).forEach(shift => {
        shift.saldo = shift.pemasukan - shift.pengeluaran;
      });

      return { data: Object.values(userShifts), error: null };
    } catch (err: any) {
      console.error('Error fetching shift summary:', err);
      return { data: [], error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Menghitung saldo shift berjalan untuk user aktif.
   * Dihitung sejak TUTUP_SHIFT terakhir.
   */
  async getCurrentShiftBalance(userId: string) {
    try {
      // 1. Cari TUTUP_SHIFT terakhir
      const lastTutup = await supabase
        .from('kas_log')
        .select('created_at')
        .eq('created_by', userId)
        .eq('tipe', 'TUTUP_SHIFT')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // 2. Ambil semua log sejak saat itu
      let query = supabase
        .from('kas_log')
        .select('tipe, jumlah')
        .eq('created_by', userId);

      if (lastTutup.data?.created_at) {
        query = query.gt('created_at', lastTutup.data.created_at);
      }

      const { data, error } = await safeQuery(async () => {
        const res = await query;
        return { data: res.data as { tipe: string, jumlah: number }[], error: res.error as Error | null };
      });

      if (error || !data) return { pemasukan: 0, pengeluaran: 0, saldo: 0, error };

      let pemasukan = 0;
      let pengeluaran = 0;

      data.forEach((row) => {
        if (row.tipe === 'JUAL' || row.tipe === 'SETOR') {
          pemasukan += Number(row.jumlah);
        } else if (row.tipe === 'TARIK' || row.tipe === 'RETURN') {
          pengeluaran += Number(row.jumlah);
        }
      });

      return { pemasukan, pengeluaran, saldo: pemasukan - pengeluaran, error: null };
    } catch (err: any) {
      console.error('Error calculating current shift balance:', err);
      return { pemasukan: 0, pengeluaran: 0, saldo: 0, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  },

  /**
   * Mencatat kas manual (SETOR atau TARIK)
   */
  async addManualEntry(data: {
    tipe: 'SETOR' | 'TARIK';
    jumlah: number;
    catatan: string;
    payment_method?: string;
  }) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (!userId) throw new Error('User tidak ditemukan');

      const payload = {
        tipe: data.tipe,
        jumlah: data.jumlah,
        catatan: data.catatan,
        created_by: userId,
        payment_method: data.payment_method || 'CASH'
      };

      const result = await safeQuery(async () => {
        const res = await supabase
          .from('kas_log')
          .insert([payload])
          .select()
          .single();
        return { data: res.data as KasLogItem, error: res.error as Error | null };
      }, { isMutation: true });

      return result;
    } catch (err: any) {
      console.error('Error adding manual kas entry:', err);
      return { data: null, error: { message: err.message || 'Terjadi kesalahan' } };
    }
  }
};
