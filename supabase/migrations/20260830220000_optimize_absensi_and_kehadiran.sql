-- Migration: Optimasi Modul Absensi & Kehadiran (Keamanan, Timezone WIB, Akurasi GPS, & Kalkulasi Server)

-- 1. Tambah kolom akurasi GPS pada tabel kehadiran jika belum ada
ALTER TABLE public.kehadiran
ADD COLUMN IF NOT EXISTS accuracy_masuk NUMERIC,
ADD COLUMN IF NOT EXISTS accuracy_pulang NUMERIC;

-- 2. Perbarui RPC Absen Masuk dengan GPS & Timezone WIB
CREATE OR REPLACE FUNCTION public.absen_masuk_with_gps(
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL,
    p_status_hadir VARCHAR DEFAULT 'hadir'
) RETURNS public.kehadiran AS $$
DECLARE
    v_user_id UUID;
    v_tanggal DATE;
    v_lokasi RECORD;
    v_closest_lokasi_id UUID;
    v_closest_distance NUMERIC := 9999999;
    v_distance NUMERIC;
    v_effective_radius NUMERIC;
    v_kehadiran public.kehadiran;
    v_existing RECORD;
BEGIN
    -- Ambil user_id dari sesi auth saat ini
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna tidak terautentikasi.';
    END IF;

    -- Tentukan tanggal lokal WIB (Asia/Jakarta)
    v_tanggal := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;

    -- Cek apakah sudah absen masuk hari ini
    SELECT * INTO v_existing 
    FROM public.kehadiran 
    WHERE user_id = v_user_id AND tanggal = v_tanggal;

    IF v_existing.id IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah tercatat melakukan absensi untuk hari ini.';
    END IF;

    -- Validasi Geofencing terhadap seluruh toko/outlet aktif
    -- Berikan toleransi akurasi GPS perangkat (maksimal buffer 30 meter jika sinyal GPS lemah di dalam gedung)
    FOR v_lokasi IN SELECT * FROM public.lokasi_kerja WHERE is_active = true LOOP
        v_distance := public.calculate_distance(p_lat, p_lng, v_lokasi.latitude, v_lokasi.longitude);
        v_effective_radius := v_lokasi.radius_meter + LEAST(COALESCE(p_accuracy, 0), 30.0);
        
        IF v_distance <= v_effective_radius AND v_distance < v_closest_distance THEN
            v_closest_distance := v_distance;
            v_closest_lokasi_id := v_lokasi.id;
        END IF;
    END LOOP;

    -- Jika berada di luar jangkauan seluruh toko, tolak
    IF v_closest_lokasi_id IS NULL THEN
        RAISE EXCEPTION 'Koordinat berada di luar jangkauan seluruh toko/cabang.';
    END IF;

    -- Insert record kehadiran
    INSERT INTO public.kehadiran (
        user_id, 
        tanggal, 
        waktu_masuk, 
        status_hadir, 
        lat_masuk, 
        lng_masuk, 
        accuracy_masuk,
        lokasi_masuk_id
    ) VALUES (
        v_user_id, 
        v_tanggal, 
        now(), 
        p_status_hadir, 
        p_lat, 
        p_lng, 
        p_accuracy,
        v_closest_lokasi_id
    ) RETURNING * INTO v_kehadiran;

    RETURN v_kehadiran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Perbarui RPC Absen Pulang dengan GPS & Kalkulasi Server-Side
CREATE OR REPLACE FUNCTION public.absen_pulang_with_gps(
    p_kehadiran_id UUID,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL
) RETURNS public.kehadiran AS $$
DECLARE
    v_user_id UUID;
    v_kehadiran public.kehadiran;
    v_karyawan public.karyawan;
    v_lokasi RECORD;
    v_closest_lokasi_id UUID;
    v_closest_distance NUMERIC := 9999999;
    v_distance NUMERIC;
    v_effective_radius NUMERIC;
    
    v_waktu_sekarang TIMESTAMPTZ := now();
    v_tanggal_str TEXT;
    v_standard_masuk TIMESTAMPTZ;
    v_standard_pulang TIMESTAMPTZ;
    
    v_menit_kerja INTEGER := 0;
    v_menit_telat INTEGER := 0;
    v_menit_lembur INTEGER := 0;
    v_status_lembur VARCHAR := 'tidak_ada';
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna tidak terautentikasi.';
    END IF;

    -- Ambil data kehadiran
    SELECT * INTO v_kehadiran FROM public.kehadiran WHERE id = p_kehadiran_id;
    IF v_kehadiran.id IS NULL THEN
        RAISE EXCEPTION 'Data kehadiran tidak ditemukan.';
    END IF;

    -- Validasi kepemilikan
    IF v_kehadiran.user_id != v_user_id AND NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Anda tidak memiliki izin untuk mengupdate kehadiran ini.';
    END IF;

    IF v_kehadiran.waktu_pulang IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah tercatat melakukan absen pulang hari ini.';
    END IF;

    -- Validasi Geofencing
    FOR v_lokasi IN SELECT * FROM public.lokasi_kerja WHERE is_active = true LOOP
        v_distance := public.calculate_distance(p_lat, p_lng, v_lokasi.latitude, v_lokasi.longitude);
        v_effective_radius := v_lokasi.radius_meter + LEAST(COALESCE(p_accuracy, 0), 30.0);
        
        IF v_distance <= v_effective_radius AND v_distance < v_closest_distance THEN
            v_closest_distance := v_distance;
            v_closest_lokasi_id := v_lokasi.id;
        END IF;
    END LOOP;

    IF v_closest_lokasi_id IS NULL THEN
        RAISE EXCEPTION 'Koordinat berada di luar jangkauan seluruh toko/cabang.';
    END IF;

    -- Ambil profil jam kerja karyawan
    SELECT * INTO v_karyawan FROM public.karyawan WHERE user_id = v_kehadiran.user_id;

    -- Format tanggal absensi
    v_tanggal_str := to_char(v_kehadiran.tanggal, 'YYYY-MM-DD');

    -- Tentukan standard masuk & pulang dalam zona Asia/Jakarta
    v_standard_masuk := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_masuk, 'HH24:MI:SS'), '08:00:00'))::timestamp at time zone 'Asia/Jakarta';
    v_standard_pulang := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_pulang, 'HH24:MI:SS'), '17:00:00'))::timestamp at time zone 'Asia/Jakarta';

    -- 1. Hitung Menit Kerja Aktual
    IF v_kehadiran.waktu_masuk IS NOT NULL THEN
        v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_waktu_sekarang - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
    END IF;

    -- 2. Hitung Menit Telat Aktual
    IF v_kehadiran.waktu_masuk IS NOT NULL AND v_kehadiran.waktu_masuk > v_standard_masuk THEN
        v_menit_telat := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_kehadiran.waktu_masuk - v_standard_masuk)) / 60.0)::INTEGER);
    END IF;

    -- 3. Hitung Menit Lembur Aktual
    IF v_waktu_sekarang > v_standard_pulang THEN
        v_menit_lembur := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_waktu_sekarang - v_standard_pulang)) / 60.0)::INTEGER);
    END IF;

    -- Aturan Lembur: > 30 menit butuh approval admin
    IF v_menit_lembur > 30 THEN
        v_status_lembur := 'pending';
    ELSE
        v_status_lembur := 'tidak_ada';
    END IF;

    -- Update record
    UPDATE public.kehadiran SET
        waktu_pulang = v_waktu_sekarang,
        menit_kerja = v_menit_kerja,
        menit_telat = v_menit_telat,
        menit_lembur_aktual = v_menit_lembur,
        status_lembur = v_status_lembur,
        lat_pulang = p_lat,
        lng_pulang = p_lng,
        accuracy_pulang = p_accuracy,
        lokasi_pulang_id = v_closest_lokasi_id
    WHERE id = p_kehadiran_id
    RETURNING * INTO v_kehadiran;

    RETURN v_kehadiran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Perbarui RPC Proses Gaji agar memperhitungkan Grace Period Keterlambatan
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
        
        -- 2. Hitung Kasbon (yang disetujui atau lunas pada bulan ini)
        SELECT COALESCE(SUM(nominal), 0)
        INTO v_total_potongan_kasbon
        FROM public.kasbon
        WHERE user_id = r.user_id
          AND tanggal >= v_start_date AND tanggal <= v_end_date
          AND status IN ('disetujui', 'lunas');

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

-- 5. Perbarui RPC Preview Gaji agar konsisten dengan Grace Period
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

-- 6. Buat RPC Bulk Approve Lembur untuk Admin
CREATE OR REPLACE FUNCTION public.bulk_approve_lembur(p_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang bisa menyetujui lembur.';
    END IF;

    UPDATE public.kehadiran
    SET 
        status_lembur = 'disetujui',
        menit_lembur_disetujui = menit_lembur_aktual
    WHERE id = ANY(p_ids) AND status_lembur = 'pending';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Buat RPC Ringkasan Kehadiran Hari Ini (Live Summary) untuk Admin
CREATE OR REPLACE FUNCTION public.get_today_kehadiran_summary()
RETURNS JSON AS $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    v_total_karyawan_aktif INTEGER := 0;
    v_hadir_tepat INTEGER := 0;
    v_hadir_telat INTEGER := 0;
    v_izin INTEGER := 0;
    v_sakit INTEGER := 0;
    v_off INTEGER := 0;
    v_pending_lembur INTEGER := 0;
    v_belum_hadir INTEGER := 0;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak.';
    END IF;

    SELECT COUNT(*) INTO v_total_karyawan_aktif
    FROM public.karyawan
    WHERE status_karyawan = 'aktif';

    SELECT 
        COUNT(*) FILTER (WHERE status_hadir = 'hadir' AND menit_telat = 0),
        COUNT(*) FILTER (WHERE status_hadir = 'hadir' AND menit_telat > 0),
        COUNT(*) FILTER (WHERE status_hadir = 'izin'),
        COUNT(*) FILTER (WHERE status_hadir = 'sakit'),
        COUNT(*) FILTER (WHERE status_hadir = 'off'),
        COUNT(*) FILTER (WHERE status_lembur = 'pending')
    INTO
        v_hadir_tepat,
        v_hadir_telat,
        v_izin,
        v_sakit,
        v_off,
        v_pending_lembur
    FROM public.kehadiran
    WHERE tanggal = v_today;

    v_belum_hadir := GREATEST(0, v_total_karyawan_aktif - (v_hadir_tepat + v_hadir_telat + v_izin + v_sakit + v_off));

    RETURN json_build_object(
        'tanggal', v_today,
        'total_aktif', v_total_karyawan_aktif,
        'hadir_tepat', v_hadir_tepat,
        'hadir_telat', v_hadir_telat,
        'total_hadir', v_hadir_tepat + v_hadir_telat,
        'izin', v_izin,
        'sakit', v_sakit,
        'off', v_off,
        'pending_lembur', v_pending_lembur,
        'belum_hadir', v_belum_hadir
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
