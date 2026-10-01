-- 1. Tambah kolom total_bonus dan total_potongan_lain pada tabel slip_gaji
ALTER TABLE public.slip_gaji 
ADD COLUMN total_bonus NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN total_potongan_lain NUMERIC NOT NULL DEFAULT 0;

-- 2. Update fungsi preview_gaji
DROP FUNCTION IF EXISTS public.preview_gaji(VARCHAR);
CREATE OR REPLACE FUNCTION public.preview_gaji(p_periode VARCHAR)
RETURNS TABLE (
    user_id UUID,
    nama_karyawan VARCHAR,
    total_hari_hadir INTEGER,
    total_jam_telat NUMERIC,
    total_jam_lembur NUMERIC,
    total_gaji_harian NUMERIC,
    total_denda_telat NUMERIC,
    total_gaji_lembur NUMERIC,
    total_potongan_kasbon NUMERIC,
    total_potongan_libur NUMERIC,
    total_bonus NUMERIC,
    total_potongan_lain NUMERIC,
    gaji_bersih NUMERIC,
    status_pembayaran VARCHAR,
    dibayar_pada TIMESTAMPTZ,
    periode_bulan VARCHAR,
    tipe_gaji VARCHAR,
    gaji_bulanan NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_total_potongan_libur NUMERIC;
    v_total_bonus NUMERIC;
    v_total_potongan_lain NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_gaji_bersih NUMERIC;
    v_hari_aktif_sebulan INTEGER := 26;
    v_hari_potongan INTEGER;
BEGIN
    IF NOT (auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'admin' = ANY(roles)
        )
    )) THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa melihat preview gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR r IN SELECT k.*, p.nama FROM public.karyawan k JOIN public.profiles p ON k.user_id = p.id WHERE k.status_karyawan = 'aktif'
    LOOP
        SELECT COUNT(*), COALESCE(SUM(menit_telat), 0), COALESCE(SUM(menit_lembur)/60.0, 0)
        INTO v_total_hari_hadir, v_total_menit_telat, v_total_jam_lembur
        FROM public.kehadiran
        WHERE kehadiran.user_id = r.user_id 
          AND status_hadir = 'hadir' 
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date;

        v_total_denda_telat := (v_total_menit_telat / 60.0) * r.denda_telat_per_jam;

        -- Hitung Potongan Kasbon
        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date 
          AND pm.tanggal <= v_end_date
          AND pm.jenis = 'debit'
          AND pm.kategori IN ('kasbon', 'pencairan');

        -- Hitung Bonus (Mutasi Kredit Lainnya)
        SELECT COALESCE(SUM(nominal), 0) INTO v_total_bonus
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date 
          AND pm.tanggal <= v_end_date
          AND pm.jenis = 'kredit'
          AND pm.kategori = 'lainnya';

        -- Hitung Potongan Lainnya (Mutasi Debit Lainnya)
        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_lain
        FROM public.payroll_mutasi pm
        WHERE pm.user_id = r.user_id
          AND pm.status = 'disetujui'
          AND pm.tanggal >= v_start_date 
          AND pm.tanggal <= v_end_date
          AND pm.jenis = 'debit'
          AND pm.kategori = 'lainnya';

        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_total_potongan_libur := 0;
        v_hari_potongan := 0;

        IF r.tipe_gaji = 'bulanan' THEN
            v_hari_potongan := GREATEST(0, v_hari_aktif_sebulan - v_total_hari_hadir - COALESCE(r.jatah_libur_bulanan, 0));
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;
        ELSE
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur + v_total_bonus 
                         - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon - v_total_potongan_lain;

        -- Return variables mapping
        user_id := r.user_id;
        nama_karyawan := r.nama;
        total_hari_hadir := v_total_hari_hadir;
        total_jam_telat := v_total_menit_telat / 60.0;
        total_jam_lembur := v_total_jam_lembur;
        total_gaji_harian := v_total_gaji_harian;
        total_denda_telat := v_total_denda_telat;
        total_gaji_lembur := v_total_gaji_lembur;
        total_potongan_kasbon := v_total_potongan_kasbon;
        total_potongan_libur := v_total_potongan_libur;
        total_bonus := v_total_bonus;
        total_potongan_lain := v_total_potongan_lain;
        gaji_bersih := v_gaji_bersih;
        status_pembayaran := 'draft';
        dibayar_pada := NULL;
        periode_bulan := p_periode;
        tipe_gaji := r.tipe_gaji;
        gaji_bulanan := r.gaji_bulanan;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- 3. Update fungsi proses_gaji
CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_total_potongan_libur NUMERIC;
    v_total_bonus NUMERIC;
    v_total_potongan_lain NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_gaji_bersih NUMERIC;
    v_hari_aktif_sebulan INTEGER := 26;
    v_hari_potongan INTEGER;
BEGIN
    IF NOT (auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND 'admin' = ANY(roles)
        )
    )) THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa memproses gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR r IN SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif'
    LOOP
        SELECT COUNT(*), COALESCE(SUM(menit_telat), 0), COALESCE(SUM(menit_lembur)/60.0, 0)
        INTO v_total_hari_hadir, v_total_menit_telat, v_total_jam_lembur
        FROM public.kehadiran
        WHERE kehadiran.user_id = r.user_id 
          AND status_hadir = 'hadir' 
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date;

        v_total_denda_telat := (v_total_menit_telat / 60.0) * r.denda_telat_per_jam;

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori IN ('kasbon', 'pencairan');

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_bonus
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'kredit'
          AND kategori = 'lainnya';

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_lain
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori = 'lainnya';

        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;

        v_total_potongan_libur := 0;
        v_hari_potongan := 0;

        IF r.tipe_gaji = 'bulanan' THEN
            -- CLEANUP: Delete any daily 'Gaji Pokok' credits for this month if they exist 
            DELETE FROM public.payroll_mutasi
            WHERE user_id = r.user_id 
              AND tanggal >= v_start_date AND tanggal <= v_end_date
              AND kategori = 'gaji' 
              AND referensi_id NOT LIKE 'gaji_bulanan_%'
              AND keterangan ILIKE 'Gaji Pokok%';

            v_hari_potongan := GREATEST(0, v_hari_aktif_sebulan - v_total_hari_hadir - COALESCE(r.jatah_libur_bulanan, 0));
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;

            -- Re-insert bulanan salary to EWA mutation
            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, 
                keterangan, status, referensi_id
            ) VALUES (
                r.user_id, v_end_date, 'kredit', 'gaji', (v_total_gaji_harian - v_total_potongan_libur), 
                'Gaji Pokok Bulanan (' || p_periode || ')', 'disetujui', 
                'gaji_bulanan_' || r.user_id::text || '_' || p_periode
            ) ON CONFLICT (referensi_id) 
              DO UPDATE SET nominal = EXCLUDED.nominal;
        ELSE
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur + v_total_bonus 
                         - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon - v_total_potongan_lain;

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
            total_potongan_libur,
            total_bonus,
            total_potongan_lain,
            gaji_bersih,
            status_pembayaran,
            tipe_gaji,
            gaji_bulanan
        ) VALUES (
            r.user_id, 
            p_periode,
            v_total_hari_hadir,
            v_total_menit_telat / 60.0,
            v_total_jam_lembur,
            v_total_gaji_harian,
            v_total_denda_telat,
            v_total_gaji_lembur,
            v_total_potongan_kasbon,
            v_total_potongan_libur,
            v_total_bonus,
            v_total_potongan_lain,
            v_gaji_bersih,
            'draft',
            r.tipe_gaji,
            r.gaji_bulanan
        ) ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            total_potongan_libur = EXCLUDED.total_potongan_libur,
            total_bonus = EXCLUDED.total_bonus,
            total_potongan_lain = EXCLUDED.total_potongan_lain,
            gaji_bersih = EXCLUDED.gaji_bersih,
            tipe_gaji = EXCLUDED.tipe_gaji,
            gaji_bulanan = EXCLUDED.gaji_bulanan;

    END LOOP;
END;
$$;
