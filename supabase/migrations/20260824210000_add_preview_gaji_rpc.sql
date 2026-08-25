-- Migration: Add RPC for Preview Gaji

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
    -- Validasi admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa memproses gaji.';
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
        SELECT 
            COUNT(k_hadir.id),
            COALESCE(SUM(k_hadir.menit_telat), 0),
            COALESCE(SUM(k_hadir.menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran k_hadir
        WHERE k_hadir.user_id = r.user_id 
          AND k_hadir.tanggal >= v_start_date AND k_hadir.tanggal <= v_end_date
          AND k_hadir.status_hadir = 'hadir';
        
        SELECT COALESCE(SUM(k_bon.nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.kasbon k_bon
        WHERE k_bon.user_id = r.user_id
          AND k_bon.tanggal >= v_start_date AND k_bon.tanggal <= v_end_date
          AND k_bon.status = 'disetujui';

        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_denda_telat - v_total_potongan_kasbon;

        IF v_gaji_bersih < 0 THEN
            v_gaji_bersih := 0;
        END IF;

        -- Assign values to the RETURN TABLE row and return next
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
