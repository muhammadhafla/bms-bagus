-- Migration: Fitur Pulang Lebih Awal (Early Clock-Out) & Review Admin

-- 1. Tambahkan kolom pendukung di tabel kehadiran
ALTER TABLE public.kehadiran
ADD COLUMN IF NOT EXISTS status_pulang_awal VARCHAR(30) NOT NULL DEFAULT 'tidak_ada',
ADD COLUMN IF NOT EXISTS alasan_pulang_awal TEXT,
ADD COLUMN IF NOT EXISTS waktu_pulang_aktual TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS menit_pulang_awal INTEGER DEFAULT 0;

-- Tambahkan check constraint jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'kehadiran_status_pulang_awal_check'
    ) THEN
        ALTER TABLE public.kehadiran 
        ADD CONSTRAINT kehadiran_status_pulang_awal_check 
        CHECK (status_pulang_awal IN ('tidak_ada', 'pending', 'disetujui_penuh', 'disetujui_durasi', 'ditolak'));
    END IF;
END $$;

-- 2. Perbarui RPC Absen Pulang dengan GPS & Dukungan Pulang Awal
CREATE OR REPLACE FUNCTION public.absen_pulang_with_gps(
    p_kehadiran_id UUID,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_accuracy NUMERIC DEFAULT NULL,
    p_alasan_pulang_awal TEXT DEFAULT NULL
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
    v_toleransi_pulang TIMESTAMPTZ;
    
    v_menit_kerja INTEGER := 0;
    v_menit_telat INTEGER := 0;
    v_menit_lembur INTEGER := 0;
    v_status_lembur VARCHAR := 'tidak_ada';
    
    v_menit_pulang_awal INTEGER := 0;
    v_status_pulang_awal VARCHAR := 'tidak_ada';
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
    v_toleransi_pulang := v_standard_pulang - INTERVAL '10 minutes';

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

    -- 4. Hitung Pulang Awal (Grace period 10 menit sebelum jam_pulang)
    IF v_waktu_sekarang < v_toleransi_pulang THEN
        v_status_pulang_awal := 'pending';
        v_menit_pulang_awal := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_standard_pulang - v_waktu_sekarang)) / 60.0)::INTEGER);
    ELSE
        v_status_pulang_awal := 'tidak_ada';
        v_menit_pulang_awal := 0;
    END IF;

    -- Update record
    UPDATE public.kehadiran SET
        waktu_pulang = v_waktu_sekarang,
        waktu_pulang_aktual = v_waktu_sekarang,
        menit_kerja = v_menit_kerja,
        menit_telat = v_menit_telat,
        menit_lembur_aktual = v_menit_lembur,
        status_lembur = v_status_lembur,
        status_pulang_awal = v_status_pulang_awal,
        alasan_pulang_awal = CASE WHEN v_status_pulang_awal = 'pending' THEN p_alasan_pulang_awal ELSE NULL END,
        menit_pulang_awal = v_menit_pulang_awal,
        lat_pulang = p_lat,
        lng_pulang = p_lng,
        accuracy_pulang = p_accuracy,
        lokasi_pulang_id = v_closest_lokasi_id
    WHERE id = p_kehadiran_id
    RETURNING * INTO v_kehadiran;

    RETURN v_kehadiran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC Review Pulang Awal oleh Admin
CREATE OR REPLACE FUNCTION public.review_pulang_awal(
    p_kehadiran_id UUID,
    p_keputusan VARCHAR, -- 'hitung_penuh' | 'sesuai_durasi'
    p_catatan_admin TEXT DEFAULT NULL
) RETURNS public.kehadiran AS $$
DECLARE
    v_kehadiran public.kehadiran;
    v_karyawan public.karyawan;
    v_tanggal_str TEXT;
    v_standard_pulang TIMESTAMPTZ;
    v_menit_kerja INTEGER;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mereview kepulangan awal.';
    END IF;

    SELECT * INTO v_kehadiran FROM public.kehadiran WHERE id = p_kehadiran_id;
    IF v_kehadiran.id IS NULL THEN
        RAISE EXCEPTION 'Data kehadiran tidak ditemukan.';
    END IF;

    IF v_kehadiran.status_pulang_awal NOT IN ('pending', 'disetujui_penuh', 'disetujui_durasi') THEN
        RAISE EXCEPTION 'Status kehadiran ini bukan pengajuan pulang awal yang valid.';
    END IF;

    SELECT * INTO v_karyawan FROM public.karyawan WHERE user_id = v_kehadiran.user_id;
    v_tanggal_str := to_char(v_kehadiran.tanggal, 'YYYY-MM-DD');
    v_standard_pulang := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_pulang, 'HH24:MI:SS'), '17:00:00'))::timestamp at time zone 'Asia/Jakarta';

    IF p_keputusan = 'hitung_penuh' THEN
        -- Set waktu_pulang ke jam pulang jadwal (shift end)
        -- Recalculate menit_kerja seolah-olah pulang pada jam jadwal
        IF v_kehadiran.waktu_masuk IS NOT NULL THEN
            v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_standard_pulang - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
        ELSE
            v_menit_kerja := v_kehadiran.menit_kerja;
        END IF;

        UPDATE public.kehadiran SET
            waktu_pulang = v_standard_pulang,
            menit_kerja = v_menit_kerja,
            status_pulang_awal = 'disetujui_penuh'
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;

    ELSIF p_keputusan = 'sesuai_durasi' THEN
        -- Kembalikan waktu_pulang ke waktu_pulang_aktual
        IF v_kehadiran.waktu_masuk IS NOT NULL AND v_kehadiran.waktu_pulang_aktual IS NOT NULL THEN
            v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_kehadiran.waktu_pulang_aktual - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
        ELSE
            v_menit_kerja := v_kehadiran.menit_kerja;
        END IF;

        UPDATE public.kehadiran SET
            waktu_pulang = COALESCE(v_kehadiran.waktu_pulang_aktual, v_kehadiran.waktu_pulang),
            menit_kerja = v_menit_kerja,
            status_pulang_awal = 'disetujui_durasi'
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;
    ELSE
        RAISE EXCEPTION 'Keputusan tidak valid. Gunakan hitung_penuh atau sesuai_durasi.';
    END IF;

    RETURN v_kehadiran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC Bulk Review Pulang Awal
CREATE OR REPLACE FUNCTION public.bulk_review_pulang_awal(
    p_ids UUID[],
    p_keputusan VARCHAR
) RETURNS INTEGER AS $$
DECLARE
    v_id UUID;
    v_count INTEGER := 0;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mereview kepulangan awal.';
    END IF;

    FOREACH v_id IN ARRAY p_ids LOOP
        PERFORM public.review_pulang_awal(v_id, p_keputusan);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Perbarui RPC get_today_kehadiran_summary
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
    v_pending_pulang_awal INTEGER := 0;
    v_total_pulang_awal INTEGER := 0;
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
        COUNT(*) FILTER (WHERE status_lembur = 'pending'),
        COUNT(*) FILTER (WHERE status_pulang_awal = 'pending'),
        COUNT(*) FILTER (WHERE status_pulang_awal IN ('pending', 'disetujui_penuh', 'disetujui_durasi'))
    INTO
        v_hadir_tepat,
        v_hadir_telat,
        v_izin,
        v_sakit,
        v_off,
        v_pending_lembur,
        v_pending_pulang_awal,
        v_total_pulang_awal
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
        'pending_pulang_awal', v_pending_pulang_awal,
        'total_pulang_awal', v_total_pulang_awal,
        'belum_hadir', v_belum_hadir
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
