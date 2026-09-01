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
    kategori?: string,
    gudangId?: string
  ) {
    let query = supabase
      .from('pengeluaran_operasional')
      .select('*, profiles(nama), gudang:gudang_id(id, nama, kode_gudang)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', endDate);
    if (kategori) query = query.eq('kategori', kategori);
    if (gudangId) query = query.eq('gudang_id', gudangId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Menambahkan Pengeluaran Operasional Baru
  async insertPengeluaranOperasional(
    payload: Omit<PengeluaranOperasional, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ) {
    let targetGudangId = payload.gudang_id;
    if (!targetGudangId) {
      const { data: defGudang } = await supabase
        .from('gudang')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();
      targetGudangId = defGudang?.id || null;
    }

    const { data, error } = await supabase
      .from('pengeluaran_operasional')
      .insert([{ ...payload, gudang_id: targetGudangId }])
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
  async getOpeningBalance(startDate?: string, gudangId?: string): Promise<number> {
    if (!startDate) return 0;
    
    const { data, error } = await supabase.rpc('get_ledger_opening_balance', {
      p_start_date: startDate,
      p_gudang_id: gudangId || null
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
    search?: string,
    gudangId?: string
  ) {
    let query = supabase
      .from('buku_besar')
      .select('*, profiles(nama), gudang:gudang_id(id, nama, kode_gudang)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('tanggal', startDate);
    if (endDate) query = query.lte('tanggal', endDate);
    if (tipe) query = query.eq('tipe_transaksi', tipe);
    if (sumber) query = query.eq('sumber', sumber);
    if (gudangId) query = query.eq('gudang_id', gudangId);
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
    gudang_id?: string;
  }) {
    let targetGudangId = params.gudang_id;
    if (!targetGudangId) {
      const { data: defGudang } = await supabase
        .from('gudang')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();
      targetGudangId = defGudang?.id || null;
    }

    const { data, error } = await supabase
      .from('buku_besar')
      .insert([{
        tipe_transaksi: params.tipe,
        sumber: params.sumber || 'MODAL',
        nominal: params.nominal,
        keterangan: params.keterangan,
        tanggal: params.tanggal || format(new Date(), 'yyyy-MM-dd'),
        gudang_id: targetGudangId,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Set Saldo Awal Buku Besar (Backward compatibility)
  async insertSaldoAwalBukuBesar(nominal: number, keterangan: string, gudang_id?: string) {
    return this.insertPenyesuaianSaldo({
      nominal,
      tipe: 'PEMASUKAN',
      sumber: 'MODAL',
      keterangan,
      gudang_id,
    });
  }
};
