import { supabase } from '../client';

export type PayrollMutasiJenis = 'kredit' | 'debit';
export type PayrollMutasiKategori = 'gaji' | 'kasbon' | 'pencairan' | 'lainnya';
export type PayrollMutasiStatus = 'pending' | 'disetujui' | 'ditolak';

export interface PayrollMutasi {
  id: string;
  user_id: string;
  tanggal: string;
  jenis: PayrollMutasiJenis;
  kategori: PayrollMutasiKategori;
  nominal: number;
  keterangan: string | null;
  status: PayrollMutasiStatus;
  referensi_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    nama: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

export interface PayrollSaldo {
  user_id: string;
  total_saldo: number;
}

export const mutasiApi = {
  // Get all mutasi for the current user
  async getMine(params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error, count } = await supabase
      .from('payroll_mutasi')
      .select('*, profiles(nama, avatar_url, role)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('tanggal', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data as PayrollMutasi[], total: count || 0 };
  },

  // Get current user mutasi by date range
  async getMyMutasiByRange(startDate: string, endDate: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('payroll_mutasi')
      .select('*')
      .eq('user_id', user.id)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false });

    if (error) throw error;
    return { data: data as PayrollMutasi[] };
  },

  // Get mutasi for a specific user (Admin only)
  async getByUserId(userId: string, params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('payroll_mutasi')
      .select('*, profiles(nama, avatar_url, role)', { count: 'exact' })
      .eq('user_id', userId)
      .order('tanggal', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data as PayrollMutasi[], total: count || 0 };
  },

  // Get current user's saldo
  async getMySaldo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('vw_payroll_saldo')
      .select('total_saldo')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return (data?.total_saldo as number) || 0;
  },

  // Get saldo for a specific user (Admin only)
  async getSaldoByUserId(userId: string) {
    const { data, error } = await supabase
      .from('vw_payroll_saldo')
      .select('total_saldo')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data?.total_saldo as number) || 0;
  },

  // Get all users' balances (Dashboard Admin)
  async getAllBalances(params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('profiles')
      .select('id, nama, role, avatar_url', { count: 'exact' });

    if (params?.search) {
      query = query.ilike('nama', `%${params.search}%`);
    }

    const { data, error, count } = await query
      .order('nama', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    
    // Fetch balances for these specific users
    const userIds = data.map((d: any) => d.id);
    let balancesMap: Record<string, number> = {};
    
    if (userIds.length > 0) {
      const { data: balancesData } = await supabase
        .from('vw_payroll_saldo')
        .select('user_id, total_saldo')
        .in('user_id', userIds);
        
      if (balancesData) {
        balancesData.forEach(b => {
          balancesMap[b.user_id] = b.total_saldo;
        });
      }
    }

    const formatJabatan = (roles?: string[]) => {
      if (!roles || roles.length === 0) return 'Staff';
      if (roles.includes('admin')) return 'Admin';
      const roleMap: Record<string, string> = {
        kepala_cabang: 'Kepala Cabang',
        kepala_gudang: 'Kepala Cabang',
        staff_gudang: 'Staf Gudang',
        kasir: 'Kasir',
        finance: 'Finance',
        staff: 'Staff',
      };
      return roles.map((r) => roleMap[r] || r).join(', ');
    };

    const mapped = data.map((d: any) => ({
      id: d.id,
      nama: d.nama,
      jabatan: formatJabatan(d.roles),
      avatar_url: d.avatar_url,
      total_saldo: balancesMap[d.id] || 0
    }));

    return { data: mapped, total: count || 0 };
  },

  // Submit withdrawal / kasbon (Non-Admin)
  async requestPenarikan(nominal: number, keterangan: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('payroll_mutasi')
      .insert({
        user_id: user.id,
        jenis: 'debit',
        kategori: 'kasbon',
        nominal,
        keterangan,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger push notification to admins
    if (data && typeof window !== 'undefined') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetch('/api/push/notify-kasbon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            kasbon_id: data.id,
            user_id: user.id,
            nominal: nominal,
          }),
        }).catch((err) => console.error('Failed sending kasbon push notice to admin:', err));
      });
    }

    return data;
  },

  // Approve withdrawal / pencairan (Admin)
  async approvePenarikan(id: string) {
    const { data, error } = await supabase
      .from('payroll_mutasi')
      .update({ status: 'disetujui' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  
  // Reject withdrawal
  async rejectPenarikan(id: string) {
    const { data, error } = await supabase
      .from('payroll_mutasi')
      .update({ status: 'ditolak' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Direct Payout / Kasbon by Admin
  async insertMutasi(args: {
    user_id: string;
    jenis: PayrollMutasiJenis;
    kategori: PayrollMutasiKategori;
    nominal: number;
    keterangan: string;
    status?: PayrollMutasiStatus;
  }) {
    const { data, error } = await supabase
      .from('payroll_mutasi')
      .insert({
        ...args,
        status: args.status || 'disetujui'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
