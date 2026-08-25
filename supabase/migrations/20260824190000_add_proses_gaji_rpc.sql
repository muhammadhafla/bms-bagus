-- Migration: Add RPC for Proses Gaji

CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
RETURNS void
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

    -- Hitung range tanggal dari p_periode (YYYY-MM)
    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- Loop semua karyawan aktif, atau yang punya data kehadiran di periode ini
    FOR r IN (SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif')
    LOOP
        -- 1. Hitung Kehadiran
        SELECT 
            COUNT(id),
            COALESCE(SUM(menit_telat), 0),
            COALESCE(SUM(menit_lembur_disetujui), 0)
        INTO 
            v_total_hari_hadir,
            v_total_menit_telat,
            v_total_menit_lembur
        FROM public.kehadiran
        WHERE user_id = r.user_id 
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status_hadir = 'hadir';
        
        -- 2. Hitung Kasbon (yang disetujui atau lunas pada bulan ini)
        SELECT COALESCE(SUM(nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.kasbon
        WHERE user_id = r.user_id
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status IN ('disetujui', 'lunas');

        -- Konversi menit ke jam
        v_total_jam_telat := v_total_menit_telat / 60.0;
        v_total_jam_lembur := v_total_menit_lembur / 60.0;

        v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        v_total_denda_telat := v_total_jam_telat * r.denda_telat_per_jam;
        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur - v_total_denda_telat - v_total_potongan_kasbon;

        IF v_gaji_bersih < 0 THEN
            v_gaji_bersih := 0;
        END IF;

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

        -- 4. Update kasbon status to lunas
        UPDATE public.kasbon 
        SET status = 'lunas'
        WHERE user_id = r.user_id
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status = 'disetujui';

    END LOOP;
END;
$$;
