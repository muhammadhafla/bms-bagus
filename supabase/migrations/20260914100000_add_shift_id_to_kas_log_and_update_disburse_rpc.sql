-- Migration: Add shift_id to kas_log and update disburse_payroll_via_cashier RPC
-- Description:
-- 1. Adds shift_id column to public.kas_log for precise cashier shift association.
-- 2. Updates disburse_payroll_via_cashier RPC to require p_shift_id, preventing multi-cashier drawer deductions.
-- 3. Adds get_active_shifts helper function for Web Admin drawer selection.

-- 1. Tambah kolom shift_id ke public.kas_log
ALTER TABLE public.kas_log 
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shift_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kas_log_shift_id ON public.kas_log(shift_id);

-- Drop old overload
DROP FUNCTION IF EXISTS public.disburse_payroll_via_cashier(UUID, UUID);

-- 2. Perbarui RPC disburse_payroll_via_cashier
CREATE OR REPLACE FUNCTION public.disburse_payroll_via_cashier(
    p_mutasi_id UUID,
    p_shift_id UUID,
    p_gudang_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_mutasi RECORD;
    v_shift RECORD;
    v_user_nama TEXT;
    v_target_gudang UUID;
    v_kas_log_id UUID;
BEGIN
    -- 1. Validasi mutasi payroll
    SELECT * INTO v_mutasi FROM public.payroll_mutasi WHERE id = p_mutasi_id;
    IF v_mutasi IS NULL THEN
        RAISE EXCEPTION 'Data mutasi payroll tidak ditemukan';
    END IF;

    -- 2. Validasi shift session
    SELECT * INTO v_shift FROM public.shift_sessions WHERE id = p_shift_id;
    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Sesi shift kasir tidak ditemukan';
    END IF;
    IF v_shift.status != 'OPEN' THEN
        RAISE EXCEPTION 'Sesi shift kasir sudah ditutup (tidak aktif)';
    END IF;

    -- Ambil nama karyawan
    SELECT COALESCE(nama, 'Karyawan') INTO v_user_nama 
    FROM public.profiles 
    WHERE id = v_mutasi.user_id;

    -- Tentukan gudang dari shift atau parameter
    v_target_gudang := COALESCE(v_shift.gudang_id, p_gudang_id);
    IF v_target_gudang IS NULL THEN
        SELECT id INTO v_target_gudang FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    -- 3. Update status mutasi menjadi disetujui (jika belum)
    UPDATE public.payroll_mutasi 
    SET status = 'disetujui',
        updated_at = NOW()
    WHERE id = p_mutasi_id;

    -- 4. Catat ke kas_log dengan shift_id dan kasir_id yang jelas
    IF NOT EXISTS (SELECT 1 FROM public.kas_log WHERE referensi_id = p_mutasi_id AND tipe = 'TARIK') THEN
        INSERT INTO public.kas_log (
            id, tipe, kategori, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id, shift_id
        ) VALUES (
            gen_random_uuid(),
            'TARIK',
            'GAJI',
            v_mutasi.nominal,
            'CASH',
            p_mutasi_id,
            'Pencairan Gaji: ' || v_user_nama || ' (Kasir: ' || COALESCE(v_shift.kasir_name, 'Kasir') || ')',
            v_shift.kasir_id,
            NOW(),
            v_target_gudang,
            p_shift_id
        ) RETURNING id INTO v_kas_log_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mutasi_id', p_mutasi_id,
        'shift_id', p_shift_id,
        'kas_log_id', v_kas_log_id,
        'nominal', v_mutasi.nominal,
        'kasir_name', v_shift.kasir_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.disburse_payroll_via_cashier(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disburse_payroll_via_cashier(UUID, UUID, UUID) TO service_role;

-- 3. Helper function: get_active_shifts
CREATE OR REPLACE FUNCTION public.get_active_shifts(p_gudang_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    kasir_id UUID,
    kasir_name TEXT,
    gudang_id UUID,
    gudang_name TEXT,
    start_time TIMESTAMPTZ,
    opening_cash NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.kasir_id,
        s.kasir_name::TEXT,
        s.gudang_id,
        s.gudang_name::TEXT,
        s.start_time,
        s.opening_cash
    FROM public.shift_sessions s
    WHERE s.status = 'OPEN'
      AND (p_gudang_id IS NULL OR s.gudang_id = p_gudang_id)
    ORDER BY s.start_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_active_shifts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_shifts(UUID) TO service_role;
