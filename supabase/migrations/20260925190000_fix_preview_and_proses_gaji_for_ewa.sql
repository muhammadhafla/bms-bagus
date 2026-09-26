-- Migration: Fix preview_gaji and proses_gaji functions for EWA architecture
-- Replaces references to dropped public.kasbon table with public.payroll_mutasi

-- 1. Perbarui RPC preview_gaji
CREATE OR REPLACE FUNCTION public.preview_gaji(p_periode VARCHAR)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    periode_bulan VARCHAR,
    total_hari_hadir INTEGER,
    total_jam_telat NUMERIC,
    total_jam_lembur NUMERIC,
    total_gaji_harian NUMERIC,
    total_denda_telat NUMERIC,
    total_gaji_lembur NUMERIC,
    total_potongan_kasbon NUMERIC,
    gaji_bersih NUMERIC,
    status_pembayaran VARCHAR,
    dibayar_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    nama VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    r RECORD;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat INTEGER;
    v_total_menit_lembur INTEGER;
    v_total_jam_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_gaji_bersih NUMERIC;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa melihat preview gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    FOR r IN (
        SELECT k.*, p.nama as user_nama 
        FROM public.karyawan k 
        JOIN public.profiles p ON k.user_id = p.id
        WHERE k.status_karyawan = 'aktif'
    )
    LOOP
        -- Hitung Kehadiran (Denda telat hanya jika menit_telat > 30 menit)
        SELECT 
            COUNT(k_hadir.id),
            COALESCE(SUM(CASE WHEN k_hadir.menit_telat > 30 THEN k_hadir.menit_telat ELSE 0 END), 0),
            COALESCE(SUM(k_hadir.menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran k_hadir
        WHERE k_hadir.user_id = r.user_id 
          AND k_hadir.tanggal >= v_start_date AND k_hadir.tanggal <= v_end_date
          AND k_hadir.status_hadir = 'hadir';
        
        -- Hitung Potongan Kasbon / Pencairan dari payroll_mutasi
        SELECT COALESCE(SUM(pm.nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.jenis = 'debit'
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date AND pm.tanggal < (v_end_date + INTERVAL '1 day');

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_denda_telat - v_total_potongan_kasbon;

        id := gen_random_uuid();
        user_id := r.user_id;
        periode_bulan := p_periode;
        total_hari_hadir := v_total_hari_hadir;
        total_jam_telat := v_total_jam_telat;
        total_jam_lembur := v_total_jam_lembur;
        total_gaji_harian := v_total_gaji_harian;
        total_denda_telat := v_total_denda_telat;
        total_gaji_lembur := v_total_gaji_lembur;
        total_potongan_kasbon := v_total_potongan_kasbon;
        gaji_bersih := v_gaji_bersih;
        status_pembayaran := 'draft';
        dibayar_pada := NULL;
        created_at := now();
        nama := r.user_nama;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- 2. Perbarui RPC proses_gaji
CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    r RECORD;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat INTEGER;
    v_total_menit_lembur INTEGER;
    v_total_jam_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_gaji_bersih NUMERIC;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa memproses gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    FOR r IN (SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif')
    LOOP
        -- 1. Hitung Kehadiran (Denda telat hanya jika menit_telat > 30 menit)
        SELECT 
            COUNT(id),
            COALESCE(SUM(CASE WHEN menit_telat > 30 THEN menit_telat ELSE 0 END), 0),
            COALESCE(SUM(menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran
        WHERE user_id = r.user_id 
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status_hadir = 'hadir';
        
        -- 2. Hitung Potongan dari payroll_mutasi
        SELECT COALESCE(SUM(nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND jenis = 'debit'
          AND status = 'disetujui'
          AND tanggal >= v_start_date AND tanggal < (v_end_date + INTERVAL '1 day');

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_denda_telat - v_total_potongan_kasbon;

        -- 3. Upsert Slip Gaji
        INSERT INTO public.slip_gaji (
            user_id,
            periode_bulan,
            total_hari_hadir,
            total_jam_telat,
            total_jam_lembur,
            total_gaji_harian,
            total_denda_telat,
            total_gaji_lembur,
            total_potongan_kasbon,
            gaji_bersih,
            status_pembayaran
        ) VALUES (
            r.user_id,
            p_periode,
            v_total_hari_hadir,
            v_total_jam_telat,
            v_total_jam_lembur,
            v_total_gaji_harian,
            v_total_denda_telat,
            v_total_gaji_lembur,
            v_total_potongan_kasbon,
            v_gaji_bersih,
            'draft'
        )
        ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            gaji_bersih = EXCLUDED.gaji_bersih;

    END LOOP;
END;
$$;

-- Berikan hak akses execute
GRANT EXECUTE ON FUNCTION public.preview_gaji(VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.proses_gaji(VARCHAR) TO authenticated, service_role;
