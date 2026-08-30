import { format } from 'date-fns';
import { supabase } from './client';
import { Database } from '@/types/supabase';

export type LedgerTipe = Database['public']['Enums']['ledger_tipe'];
export type LedgerSumber = Database['public']['Enums']['ledger_sumber'];

export type PengeluaranOperasional = Database['public']['Tables']['pengeluaran_operasional']['Row'];
export type BukuBesar = Database['public']['Tables']['buku_besar']['Row'];

export const ledgerApi = {
  // Mengambil daftar Pengeluaran Operasional
  async getPengeluaranOperasional(
    startDate?: string,
    endDate?: string,
    kategori?: string
  ) {
    let query = supabase
      .from('pengeluaran_operasional')
      .select('*, profiles(nama)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', endDate);
    if (kategori) query = query.eq('kategori', kategori);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Menambahkan Pengeluaran Operasional Baru
  async insertPengeluaranOperasional(
    payload: Omit<PengeluaranOperasional, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ) {
    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mengubah Pengeluaran Operasional
  async updatePengeluaranOperasional(
    id: string,
    payload: Partial<Omit<PengeluaranOperasional, 'id' | 'created_at' | 'updated_at' | 'created_by'>>
  ) {
    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Menghapus Pengeluaran Operasional (koreksi)
  async deletePengeluaranOperasional(id: string) {
    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return data;
  },

  // Mengambil Saldo Awal Kumulatif sebelum tanggal tertentu
  async getOpeningBalance(startDate?: string): Promise<number> {
    if (!startDate) return 0;
    
    const { data, error } = await supabase.rpc('get_ledger_opening_balance', {
      p_start_date: startDate
    });

    if (error) {
      console.error('Error fetching ledger opening balance:', error);
      return 0;
    }
    return Number(data) || 0;
  },

  // Mengambil Data Buku Besar dengan filter lengkap
  async getBukuBesar(
    startDate?: string,
    endDate?: string,
    tipe?: LedgerTipe,
    sumber?: LedgerSumber,
    search?: string
  ) {
    let query = supabase
      .from('buku_besar')
      .select('*, profiles(nama)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', endDate);
    if (tipe) query = query.eq('tipe_transaksi', tipe);
    if (sumber) query = query.eq('sumber', sumber);
    if (search && search.trim() !== '') {
      query = query.ilike('keterangan', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Penyesuaian Saldo Kas Manual (Dua Arah: Tambah Modal / Tarik Modal / Selisih Kas)
  async insertPenyesuaianSaldo(params: {
    nominal: number;
    tipe: LedgerTipe;
    sumber?: LedgerSumber;
    keterangan: string;
    tanggal?: string;
  }) {
    const { data, error } = await supabase
      .from('buku_besar')
      .insert([{
        tipe_transaksi: params.tipe,
        sumber: params.sumber || 'MODAL',
        nominal: params.nominal,
        keterangan: params.keterangan,
        tanggal: params.tanggal || format(new Date(), 'yyyy-MM-dd'),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Set Saldo Awal Buku Besar (Backward compatibility)
  async insertSaldoAwalBukuBesar(nominal: number, keterangan: string) {
    return this.insertPenyesuaianSaldo({
      nominal,
      tipe: 'PEMASUKAN',
      sumber: 'MODAL',
      keterangan
    });
  }
};
