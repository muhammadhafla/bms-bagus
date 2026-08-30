-- Migration: Fix Shift to Ledger Integration & Add Automatic Trigger
-- Description: Updates record_shift_to_ledger to handle 'paid' status and WIB timezone,
--              and attaches an automatic database trigger on shift_sessions.

-- 1. Perbarui Fungsi record_shift_to_ledger
CREATE OR REPLACE FUNCTION record_shift_to_ledger(p_shift_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_penjualan NUMERIC;
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

    -- Hitung total penjualan yang sukses (status 'paid' atau 'LUNAS') di rentang waktu shift
    SELECT COALESCE(SUM(total), 0) INTO v_total_penjualan
    FROM public.penjualan
    WHERE created_by = v_shift_record.kasir_id
      AND created_at >= v_shift_record.start_time
      AND created_at <= COALESCE(v_shift_record.end_time, NOW())
      AND status IN ('paid', 'LUNAS');

    -- Idempotensi: Bersihkan entri lama jika shift ini sudah pernah dicatat sebelumnya
    DELETE FROM public.buku_besar 
    WHERE referensi_id = p_shift_id 
      AND sumber = 'PENJUALAN_SHIFT';

    -- Catat ke buku_besar jika ada penjualan
    IF v_total_penjualan > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by
        ) VALUES (
            v_shift_date, 'PEMASUKAN', 'PENJUALAN_SHIFT', p_shift_id,
            'Pendapatan Penjualan (Shift Kasir: ' || v_kasir_name || ')',
            v_total_penjualan, v_shift_record.kasir_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fungsi Trigger untuk Tutup Shift
CREATE OR REPLACE FUNCTION trigger_shift_closed_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'CLOSED' THEN
            PERFORM public.record_shift_to_ledger(NEW.id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'CLOSED' AND (
            OLD.status IS DISTINCT FROM 'CLOSED' 
            OR OLD.end_time IS DISTINCT FROM NEW.end_time 
            OR OLD.closing_cash IS DISTINCT FROM NEW.closing_cash
        ) THEN
            PERFORM public.record_shift_to_ledger(NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Pasang Trigger pada shift_sessions
DROP TRIGGER IF EXISTS on_shift_closed ON public.shift_sessions;
CREATE TRIGGER on_shift_closed
    AFTER INSERT OR UPDATE ON public.shift_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_shift_closed_to_ledger();
