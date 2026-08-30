-- Migration: Add RETUR_PENJUALAN to ledger_sumber and record expenses & returns on shift close
-- Description: Records gross sales, operational withdrawals, and returns separately into buku_besar when shift closes.

-- 1. Tambah nilai baru ke ENUM ledger_sumber
ALTER TYPE ledger_sumber ADD VALUE IF NOT EXISTS 'RETUR_PENJUALAN';

-- 2. Perbarui Fungsi record_shift_to_ledger
CREATE OR REPLACE FUNCTION record_shift_to_ledger(p_shift_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_penjualan NUMERIC;
    v_total_pengeluaran NUMERIC;
    v_total_retur NUMERIC;
    v_shift_record RECORD;
    v_shift_date DATE;
    v_kasir_name TEXT;
BEGIN
    -- Ambil info shift
    SELECT * INTO v_shift_record FROM public.shift_sessions WHERE id = p_shift_id;
    
    IF v_shift_record IS NULL THEN
        RETURN;
    END IF;

    -- Tentukan tanggal shift dalam zona waktu WIB (Asia/Jakarta)
    v_shift_date := (COALESCE(v_shift_record.end_time, v_shift_record.start_time, NOW()) AT TIME ZONE 'Asia/Jakarta')::DATE;

    -- Ambil nama kasir jika kosong
    v_kasir_name := COALESCE(v_shift_record.kasir_name, 'Kasir');
    IF v_kasir_name = 'Kasir' OR v_kasir_name IS NULL THEN
        SELECT COALESCE(nama, 'Kasir') INTO v_kasir_name 
        FROM public.profiles 
        WHERE id = v_shift_record.kasir_id;
    END IF;

    -- A. Hitung total penjualan kotor yang sukses (status 'paid' atau 'LUNAS')
    SELECT COALESCE(SUM(total), 0) INTO v_total_penjualan
    FROM public.penjualan
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND status IN ('paid', 'LUNAS');

    -- B. Hitung total penarikan kas operasional kasir (TARIK)
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_pengeluaran
    FROM public.kas_log
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND tipe = 'TARIK';

    -- C. Hitung total pengembalian uang retur kasir (RETURN)
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_retur
    FROM public.kas_log
    WHERE (created_by = v_shift_record.kasir_id OR created_by IS NULL)
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND tipe = 'RETURN';

    -- Idempotensi: Bersihkan entri lama jika shift ini sudah pernah dicatat sebelumnya
    DELETE FROM public.buku_besar 
    WHERE referensi_id = p_shift_id 
      AND sumber IN ('PENJUALAN_SHIFT', 'BIAYA_OPERASIONAL', 'RETUR_PENJUALAN');

    -- 1. Catat ke buku_besar: Pemasukan Penjualan Kotor
    IF v_total_penjualan > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            v_shift_date, 'PEMASUKAN', 'PENJUALAN_SHIFT', p_shift_id,
            'Pendapatan Penjualan (Shift Kasir: ' || v_kasir_name || ')',
            v_total_penjualan, v_shift_record.kasir_id
        );
    END IF;

    -- 2. Catat ke buku_besar: Pengeluaran Operasional Kasir
    IF v_total_pengeluaran > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            v_shift_date, 'PENGELUARAN', 'BIAYA_OPERASIONAL', p_shift_id,
            'Pengeluaran Operasional (Shift Kasir: ' || v_kasir_name || ')',
            v_total_pengeluaran, v_shift_record.kasir_id
        );
    END IF;

    -- 3. Catat ke buku_besar: Retur Penjualan
    IF v_total_retur > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            v_shift_date, 'PENGELUARAN', 'RETUR_PENJUALAN', p_shift_id,
            'Retur Penjualan (Shift Kasir: ' || v_kasir_name || ')',
            v_total_retur, v_shift_record.kasir_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
