-- ==============================================================================
-- MIGRATION: 20261124091000_fase0b_kehadiran_kasbon_and_anon_lockdown.sql
-- FASE 0B:
--   1. [SEC-03 / INT-03] Hapus overload legacy absen_*_with_gps, hardening 2 RPC GPS resmi,
--      kunci direct INSERT/UPDATE kehadiran hanya finance/admin, dan perketat INSERT payroll_mutasi
--   2. [SEC-04] Penutupan seluruh kebocoran policy anon/public pada penjualan, inventory,
--      members, member_vouchers, member_fcm_tokens, wa_bridge_status, dan wa_outbox,
--      serta penyediaan view non-HPP public.vw_katalog_publik untuk Kawan Bagus.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. [SEC-03 / INT-03] Hardening Absensi GPS, Kehadiran RLS & Payroll Mutasi RLS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.absen_masuk_with_gps(uuid, character varying, numeric, numeric);
DROP FUNCTION IF EXISTS public.absen_pulang_with_gps(uuid, integer, integer, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.absen_pulang_with_gps(uuid, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.absen_masuk_with_gps(
    p_lat numeric,
    p_lng numeric,
    p_accuracy numeric DEFAULT NULL::numeric,
    p_status_hadir character varying DEFAULT 'hadir'::character varying
)
RETURNS public.kehadiran
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET row_security TO 'off'
AS $$
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
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna tidak terautentikasi.';
    END IF;

    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'Koordinat GPS wajib diisi.';
    END IF;

    IF COALESCE(p_status_hadir, '') NOT IN ('hadir', 'izin', 'sakit', 'off') THEN
        RAISE EXCEPTION 'Status kehadiran tidak valid.';
    END IF;

    v_tanggal := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;

    SELECT * INTO v_existing
    FROM public.kehadiran
    WHERE user_id = v_user_id AND tanggal = v_tanggal;

    IF v_existing.id IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah tercatat melakukan absensi untuk hari ini.';
    END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.absen_pulang_with_gps(
    p_kehadiran_id uuid,
    p_lat numeric,
    p_lng numeric,
    p_accuracy numeric DEFAULT NULL::numeric,
    p_alasan_pulang_awal text DEFAULT NULL::text
)
RETURNS public.kehadiran
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET row_security TO 'off'
AS $$
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

    IF p_lat IS NULL OR p_lng IS NULL THEN
        RAISE EXCEPTION 'Koordinat GPS wajib diisi.';
    END IF;

    -- Kunci baris kehadiran untuk mencegah race condition absen pulang ganda
    SELECT * INTO v_kehadiran
    FROM public.kehadiran
    WHERE id = p_kehadiran_id
    FOR UPDATE;

    IF v_kehadiran.id IS NULL THEN
        RAISE EXCEPTION 'Data kehadiran tidak ditemukan.';
    END IF;

    IF v_kehadiran.user_id != v_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Anda tidak memiliki izin untuk mengupdate kehadiran ini.';
    END IF;

    IF v_kehadiran.waktu_pulang IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah tercatat melakukan absen pulang hari ini.';
    END IF;

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

    SELECT * INTO v_karyawan FROM public.karyawan WHERE user_id = v_kehadiran.user_id;

    v_tanggal_str := to_char(v_kehadiran.tanggal, 'YYYY-MM-DD');

    v_standard_masuk := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_masuk, 'HH24:MI:SS'), '08:00:00'))::timestamp at time zone 'Asia/Jakarta';
    v_standard_pulang := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_pulang, 'HH24:MI:SS'), '17:00:00'))::timestamp at time zone 'Asia/Jakarta';
    v_toleransi_pulang := v_standard_pulang - INTERVAL '10 minutes';

    IF v_kehadiran.waktu_masuk IS NOT NULL THEN
        v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_waktu_sekarang - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
    END IF;

    IF v_kehadiran.waktu_masuk IS NOT NULL AND v_kehadiran.waktu_masuk > v_standard_masuk THEN
        v_menit_telat := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_kehadiran.waktu_masuk - v_standard_masuk)) / 60.0)::INTEGER);
    END IF;

    IF v_waktu_sekarang > v_standard_pulang THEN
        v_menit_lembur := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_waktu_sekarang - v_standard_pulang)) / 60.0)::INTEGER);
    END IF;

    IF v_menit_lembur > 30 THEN
        v_status_lembur := 'pending';
    ELSE
        v_status_lembur := 'tidak_ada';
    END IF;

    IF v_waktu_sekarang < v_toleransi_pulang THEN
        v_status_pulang_awal := 'pending';
        v_menit_pulang_awal := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_standard_pulang - v_waktu_sekarang)) / 60.0)::INTEGER);
    ELSE
        v_status_pulang_awal := 'tidak_ada';
        v_menit_pulang_awal := 0;
    END IF;

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
$$;

REVOKE ALL ON FUNCTION public.absen_masuk_with_gps(numeric, numeric, numeric, character varying) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.absen_masuk_with_gps(numeric, numeric, numeric, character varying) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.absen_pulang_with_gps(uuid, numeric, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.absen_pulang_with_gps(uuid, numeric, numeric, numeric, text) TO authenticated, service_role;

-- Pengetatan RLS public.kehadiran: hanya admin/finance yang boleh tulis langsung via REST
DROP POLICY IF EXISTS "kehadiran_insert" ON public.kehadiran;
DROP POLICY IF EXISTS "kehadiran_update" ON public.kehadiran;
DROP POLICY IF EXISTS "kehadiran_insert_admin_finance" ON public.kehadiran;
DROP POLICY IF EXISTS "kehadiran_update_admin_finance" ON public.kehadiran;

CREATE POLICY "kehadiran_insert_admin_finance"
ON public.kehadiran
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_finance_or_admin()));

CREATE POLICY "kehadiran_update_admin_finance"
ON public.kehadiran
FOR UPDATE
TO authenticated
USING ((SELECT public.is_finance_or_admin()))
WITH CHECK ((SELECT public.is_finance_or_admin()));

-- Pengetatan RLS public.payroll_mutasi: karyawan hanya boleh ajukan kasbon debit pending > 0
DROP POLICY IF EXISTS "Users can create their own pending mutasi (kasbon)" ON public.payroll_mutasi;
CREATE POLICY "Users can create their own pending mutasi (kasbon)"
ON public.payroll_mutasi
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'pending'::public.payroll_mutasi_status
    AND jenis = 'debit'::public.payroll_mutasi_jenis
    AND kategori = 'kasbon'::public.payroll_mutasi_kategori
    AND nominal > 0
);

-- ------------------------------------------------------------------------------
-- 2. [SEC-04] Penutupan Kebocoran Policy anon / public pada Tabel Sensitif
-- ------------------------------------------------------------------------------

-- Penjualan & Penjualan Items
DROP POLICY IF EXISTS "penjualan_anon_select" ON public.penjualan;
DROP POLICY IF EXISTS "penjualan_items_anon_select" ON public.penjualan_items;

-- Inventory: cabut anon SELECT agar HPP (harga_beli_terakhir) tidak terekspos
DROP POLICY IF EXISTS "kb_inventory_anon_select" ON public.inventory;

-- View publik non-HPP untuk kebutuhan scan barcode / katalog Kawan Bagus
CREATE OR REPLACE VIEW public.vw_katalog_publik AS
SELECT
    i.id,
    i.kode_barcode,
    i.nama_barang,
    i.slug,
    i.id_kategori,
    i.harga_jual,
    i.diskon,
    i.stok,
    i.unit,
    i.is_discontinued,
    i.updated_at
FROM public.inventory i
WHERE COALESCE(i.is_discontinued, false) = false;

REVOKE ALL ON public.vw_katalog_publik FROM PUBLIC;
GRANT SELECT ON public.vw_katalog_publik TO anon, authenticated;

-- Members, Member Vouchers & Member FCM Tokens
DROP POLICY IF EXISTS "kb_members_anon_select" ON public.members;
DROP POLICY IF EXISTS "kb_member_vouchers_anon_select" ON public.member_vouchers;
DROP POLICY IF EXISTS "member_fcm_tokens_allow_all" ON public.member_fcm_tokens;
DROP POLICY IF EXISTS "member_fcm_tokens_admin_select" ON public.member_fcm_tokens;

-- Broadcast dashboard admin perlu SELECT member_fcm_tokens; mutasi member via service_role
CREATE POLICY "member_fcm_tokens_admin_select"
ON public.member_fcm_tokens
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin()));

-- WA Bridge Status & WA Outbox
DROP POLICY IF EXISTS "Allow anon manage wa_bridge_status" ON public.wa_bridge_status;
DROP POLICY IF EXISTS "Allow anon read wa_bridge_status" ON public.wa_bridge_status;
DROP POLICY IF EXISTS "Allow authenticated manage wa_bridge_status" ON public.wa_bridge_status;
DROP POLICY IF EXISTS "wa_bridge_status_admin_manage" ON public.wa_bridge_status;

CREATE POLICY "wa_bridge_status_admin_manage"
ON public.wa_bridge_status
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Allow anon to read wa_outbox for polling" ON public.wa_outbox;
DROP POLICY IF EXISTS "Allow anon to update wa_outbox status" ON public.wa_outbox;
DROP POLICY IF EXISTS "Allow authenticated full access to wa_outbox" ON public.wa_outbox;
DROP POLICY IF EXISTS "wa_outbox_insert_staff" ON public.wa_outbox;
DROP POLICY IF EXISTS "wa_outbox_select_staff" ON public.wa_outbox;
DROP POLICY IF EXISTS "wa_outbox_update_admin_branch" ON public.wa_outbox;
DROP POLICY IF EXISTS "wa_outbox_delete_admin" ON public.wa_outbox;

CREATE POLICY "wa_outbox_insert_staff"
ON public.wa_outbox
FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang', 'kasir']))
    AND (type <> 'system_command' OR (SELECT public.is_admin()))
);

CREATE POLICY "wa_outbox_select_staff"
ON public.wa_outbox
FOR SELECT
TO authenticated
USING ((SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang', 'kasir'])));

CREATE POLICY "wa_outbox_update_admin_branch"
ON public.wa_outbox
FOR UPDATE
TO authenticated
USING ((SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang'])))
WITH CHECK (
    (SELECT public.has_any_role(ARRAY['admin', 'kepala_cabang', 'kepala_gudang']))
    AND (type <> 'system_command' OR (SELECT public.is_admin()))
);

CREATE POLICY "wa_outbox_delete_admin"
ON public.wa_outbox
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));
