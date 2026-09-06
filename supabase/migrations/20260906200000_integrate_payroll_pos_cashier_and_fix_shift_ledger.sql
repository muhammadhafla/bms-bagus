-- Migration: Integrate Payroll Cashier Disbursement & Fix Shift Ledger Double Counting
-- Description: 
-- 1. Adds 'kategori' column to kas_log to classify cash drawer movements.
-- 2. Updates record_shift_to_ledger to exclude salary/kasbon withdrawals from shift operational expenses.
-- 3. Creates RPC disburse_payroll_via_cashier for seamless one-click cash disbursement from active cashier drawer.
-- 4. Corrects today's and historical transactions.

-- 1. Tambah kolom kategori pada public.kas_log
ALTER TABLE public.kas_log 
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) DEFAULT 'OPERASIONAL';

CREATE INDEX IF NOT EXISTS idx_kas_log_tipe_kategori ON public.kas_log(tipe, kategori);

-- 2. Perbarui Fungsi record_shift_to_ledger
CREATE OR REPLACE FUNCTION public.record_shift_to_ledger(p_shift_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_penjualan NUMERIC;
    v_total_pengeluaran NUMERIC;
    v_total_retur NUMERIC;
    v_shift_record RECORD;
    v_shift_date DATE;
    v_kasir_name TEXT;
    v_gudang_id UUID;
    v_gudang_name TEXT;
    v_outlet_suffix TEXT := '';
BEGIN
    -- Ambil info shift
    SELECT * INTO v_shift_record FROM public.shift_sessions WHERE id = p_shift_id;
    IF v_shift_record IS NULL THEN
        RETURN;
    END IF;

    -- Tentukan tanggal shift dalam zona waktu WIB (Asia/Jakarta)
    v_shift_date := (COALESCE(v_shift_record.end_time, v_shift_record.start_time, NOW()) AT TIME ZONE 'Asia/Jakarta')::DATE;

    -- Ambil nama kasir
    v_kasir_name := COALESCE(v_shift_record.kasir_name, 'Kasir');
    IF v_kasir_name = 'Kasir' OR v_kasir_name IS NULL THEN
        SELECT COALESCE(nama, 'Kasir') INTO v_kasir_name 
        FROM public.profiles 
        WHERE id = v_shift_record.kasir_id;
    END IF;

    -- Ambil gudang / outlet
    v_gudang_id := v_shift_record.gudang_id;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    IF v_gudang_id IS NOT NULL THEN
        SELECT nama INTO v_gudang_name FROM public.gudang WHERE id = v_gudang_id;
        IF v_gudang_name IS NOT NULL THEN
            v_outlet_suffix := ' - ' || v_gudang_name;
        END IF;
    END IF;

    -- A. Hitung total penjualan kotor
    SELECT COALESCE(SUM(total), 0) INTO v_total_penjualan
    FROM public.penjualan
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND status IN ('paid', 'LUNAS');

    -- B. Hitung total operasional kasir (TARIK)
    -- PENGAMAN: Hanya hitung operasional toko murni.
    -- Dikecualikan:
    -- 1. kategori IN ('GAJI', 'KASBON', 'SETORAN')
    -- 2. referensi_id yang terdaftar di payroll_mutasi
    -- 3. catatan yang memuat 'gaji', 'kasbon', atau 'payroll'
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_pengeluaran
    FROM public.kas_log
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND tipe = 'TARIK'
      AND COALESCE(kategori, 'OPERASIONAL') NOT IN ('GAJI', 'KASBON', 'SETORAN')
      AND (
          referensi_id IS NULL 
          OR NOT EXISTS (SELECT 1 FROM public.payroll_mutasi pm WHERE pm.id = kas_log.referensi_id)
      )
      AND (
          catatan IS NULL 
          OR (catatan NOT ILIKE '%gaji%' AND catatan NOT ILIKE '%kasbon%' AND catatan NOT ILIKE '%payroll%')
      );

    -- C. Hitung total retur kasir (RETURN)
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
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            v_shift_date, 'PEMASUKAN', 'PENJUALAN_SHIFT', p_shift_id,
            'Pendapatan Penjualan (Shift Kasir: ' || v_kasir_name || v_outlet_suffix || ')',
            v_total_penjualan, v_shift_record.kasir_id, v_gudang_id
        );
    END IF;

    -- 2. Catat ke buku_besar: Pengeluaran Operasional Kasir (Hanya pengeluaran toko murni)
    IF v_total_pengeluaran > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            v_shift_date, 'PENGELUARAN', 'BIAYA_OPERASIONAL', p_shift_id,
            'Pengeluaran Operasional (Shift Kasir: ' || v_kasir_name || v_outlet_suffix || ')',
            v_total_pengeluaran, v_shift_record.kasir_id, v_gudang_id
        );
    END IF;

    -- 3. Catat ke buku_besar: Retur Penjualan
    IF v_total_retur > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            v_shift_date, 'PENGELUARAN', 'RETUR_PENJUALAN', p_shift_id,
            'Retur Penjualan (Shift Kasir: ' || v_kasir_name || v_outlet_suffix || ')',
            v_total_retur, v_shift_record.kasir_id, v_gudang_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RPC: disburse_payroll_via_cashier
CREATE OR REPLACE FUNCTION public.disburse_payroll_via_cashier(
    p_mutasi_id UUID,
    p_gudang_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_mutasi RECORD;
    v_user_nama TEXT;
    v_target_gudang UUID;
    v_kas_log_id UUID;
BEGIN
    -- Ambil data mutasi payroll
    SELECT * INTO v_mutasi FROM public.payroll_mutasi WHERE id = p_mutasi_id;
    IF v_mutasi IS NULL THEN
        RAISE EXCEPTION 'Data mutasi payroll tidak ditemukan';
    END IF;

    -- Ambil nama karyawan
    SELECT COALESCE(nama, 'Karyawan') INTO v_user_nama 
    FROM public.profiles 
    WHERE id = v_mutasi.user_id;

    -- Tentukan gudang
    v_target_gudang := p_gudang_id;
    IF v_target_gudang IS NULL THEN
        SELECT id INTO v_target_gudang FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    -- Update status mutasi menjadi disetujui (jika belum)
    -- Trigger trigger_sync_payroll_mutasi_to_ledger akan otomatis mencatat pengeluaran ke buku_besar
    UPDATE public.payroll_mutasi 
    SET status = 'disetujui',
        updated_at = NOW()
    WHERE id = p_mutasi_id;

    -- Catat ke kas_log untuk memotong saldo kas kasir
    IF NOT EXISTS (SELECT 1 FROM public.kas_log WHERE referensi_id = p_mutasi_id AND tipe = 'TARIK') THEN
        INSERT INTO public.kas_log (
            id, tipe, kategori, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id
        ) VALUES (
            gen_random_uuid(),
            'TARIK',
            'GAJI',
            v_mutasi.nominal,
            'CASH',
            p_mutasi_id,
            'Pencairan Gaji: ' || v_user_nama,
            auth.uid(),
            NOW(),
            v_target_gudang
        ) RETURNING id INTO v_kas_log_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mutasi_id', p_mutasi_id,
        'kas_log_id', v_kas_log_id,
        'nominal', v_mutasi.nominal
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Berikan hak akses RPC
GRANT EXECUTE ON FUNCTION public.disburse_payroll_via_cashier(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disburse_payroll_via_cashier(UUID, UUID) TO service_role;

-- 4. Pembersihan Data Hari Ini (2026-09-06)
-- Hubungkan penarikan kasir hari ini (Rp 250.000) dengan mutasi payroll sokhipudin
UPDATE public.kas_log
SET referensi_id = '309e6547-bb9c-456d-86ab-54bc25b64ebc',
    kategori = 'GAJI',
    catatan = 'Pencairan Gaji: sokhipudin'
WHERE id = '3dce2a88-7ba1-4486-b186-c78f95710ff1';
