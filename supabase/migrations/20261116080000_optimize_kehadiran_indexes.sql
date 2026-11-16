-- Migration: Optimasi Kehadiran & Review Pulang Awal
-- Dibuat untuk mempercepat query rentang tanggal, paginasi, antrean approval, dan menyempurnakan fitur review pulang awal

-- 1. Tambah kolom catatan_admin pada tabel kehadiran jika belum ada
ALTER TABLE public.kehadiran 
ADD COLUMN IF NOT EXISTS catatan_admin TEXT;

-- 2. Indeks Komposit untuk rentang tanggal dan sorting default (DESC)
CREATE INDEX IF NOT EXISTS idx_kehadiran_tanggal_created_at 
ON public.kehadiran (tanggal DESC, created_at DESC);

-- 3. Partial Index untuk antrean persetujuan lembur pending
CREATE INDEX IF NOT EXISTS idx_kehadiran_status_lembur_pending 
ON public.kehadiran (tanggal DESC) 
WHERE status_lembur = 'pending';

-- 4. Partial Index untuk antrean tinjauan pulang awal pending
CREATE INDEX IF NOT EXISTS idx_kehadiran_status_pulang_awal_pending 
ON public.kehadiran (tanggal DESC) 
WHERE status_pulang_awal = 'pending';

-- 5. Perbarui RPC review_pulang_awal dengan dukungan catatan_admin dan status 'ditolak'
CREATE OR REPLACE FUNCTION public.review_pulang_awal(
    p_kehadiran_id UUID,
    p_keputusan VARCHAR,
    p_catatan_admin TEXT DEFAULT NULL
)
RETURNS public.kehadiran
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kehadiran public.kehadiran;
    v_karyawan public.karyawan;
    v_tanggal_str TEXT;
    v_standard_pulang TIMESTAMPTZ;
    v_menit_kerja INTEGER;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang dapat mereview kepulangan awal.';
    END IF;

    SELECT * INTO v_kehadiran FROM public.kehadiran WHERE id = p_kehadiran_id;
    IF v_kehadiran.id IS NULL THEN
        RAISE EXCEPTION 'Data kehadiran tidak ditemukan.';
    END IF;

    IF v_kehadiran.status_pulang_awal NOT IN ('pending', 'disetujui_penuh', 'disetujui_durasi', 'ditolak') THEN
        RAISE EXCEPTION 'Status kehadiran ini bukan pengajuan pulang awal yang valid.';
    END IF;

    SELECT * INTO v_karyawan FROM public.karyawan WHERE user_id = v_kehadiran.user_id;
    v_tanggal_str := to_char(v_kehadiran.tanggal, 'YYYY-MM-DD');
    v_standard_pulang := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_pulang, 'HH24:MI:SS'), '17:00:00'))::timestamp at time zone 'Asia/Jakarta';

    IF p_keputusan = 'hitung_penuh' THEN
        IF v_kehadiran.waktu_masuk IS NOT NULL THEN
            v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_standard_pulang - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
        ELSE
            v_menit_kerja := v_kehadiran.menit_kerja;
        END IF;

        UPDATE public.kehadiran SET
            waktu_pulang = v_standard_pulang,
            menit_kerja = v_menit_kerja,
            status_pulang_awal = 'disetujui_penuh',
            catatan_admin = p_catatan_admin
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;

    ELSIF p_keputusan = 'sesuai_durasi' THEN
        IF v_kehadiran.waktu_masuk IS NOT NULL AND v_kehadiran.waktu_pulang_aktual IS NOT NULL THEN
            v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_kehadiran.waktu_pulang_aktual - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
        ELSE
            v_menit_kerja := v_kehadiran.menit_kerja;
        END IF;

        UPDATE public.kehadiran SET
            waktu_pulang = COALESCE(v_kehadiran.waktu_pulang_aktual, v_kehadiran.waktu_pulang),
            menit_kerja = v_menit_kerja,
            status_pulang_awal = 'disetujui_durasi',
            catatan_admin = p_catatan_admin
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;

    ELSIF p_keputusan = 'ditolak' THEN
        UPDATE public.kehadiran SET
            waktu_pulang = COALESCE(v_kehadiran.waktu_pulang_aktual, v_kehadiran.waktu_pulang),
            status_pulang_awal = 'ditolak',
            catatan_admin = p_catatan_admin
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;

    ELSE
        RAISE EXCEPTION 'Keputusan tidak valid. Gunakan hitung_penuh, sesuai_durasi, atau ditolak.';
    END IF;

    RETURN v_kehadiran;
END;
$$;
