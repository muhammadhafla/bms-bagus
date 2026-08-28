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
      .order('tanggal', { ascending: false });

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

  // Menghapus Pengeluaran Operasional (koreksi)
  async deletePengeluaranOperasional(id: string) {
    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return data;
  },

  // Mengambil Data Buku Besar
  async getBukuBesar(
    startDate?: string,
    endDate?: string,
    tipe?: LedgerTipe,
    sumber?: LedgerSumber
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

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Set Saldo Awal Buku Besar
  async insertSaldoAwalBukuBesar(nominal: number, keterangan: string) {
    const { data, error } = await supabase
      .from('buku_besar')
      .insert([{
        tipe_transaksi: 'PEMASUKAN',
        sumber: 'MODAL',
        nominal,
        keterangan,
        tanggal: format(new Date(), 'yyyy-MM-dd'),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

