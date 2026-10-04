-- ==========================================================
-- Migration: 20261004173000_claim_dispatch_pos_authorizations.sql
-- Description: Supervisor Authorization Engine dengan Model Claim & Dispatch,
--              Multi-Action Metadata, dan Audit Trail Lengkap.
-- ==========================================================

-- 1. Tambah kolom baru ke tabel pos_authorizations
ALTER TABLE public.pos_authorizations
  ADD COLUMN IF NOT EXISTS action_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS claimed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_auth_action ON public.pos_authorizations(action_type);
CREATE INDEX IF NOT EXISTS idx_pos_auth_claimed_by ON public.pos_authorizations(claimed_by_id);

-- 2. Update RPC request_pos_authorization (dengan action_metadata & notifikasi tanpa PIN)
CREATE OR REPLACE FUNCTION public.request_pos_authorization(
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL,
    p_action_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_cashier_name TEXT;
    v_gudang_id UUID;
    v_gudang_name TEXT;
    v_pin VARCHAR(6);
    v_new_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    -- Ambil nama kasir
    SELECT COALESCE(nama, username, 'Kasir') INTO v_cashier_name
    FROM public.profiles
    WHERE id = v_user_id;
    IF v_cashier_name IS NULL THEN
        v_cashier_name := 'Kasir';
    END IF;

    -- Tentukan gudang
    IF p_gudang_id IS NOT NULL THEN
        v_gudang_id := p_gudang_id;
    ELSE
        SELECT default_gudang_id INTO v_gudang_id
        FROM public.profiles
        WHERE id = v_user_id;
    END IF;

    -- Ambil nama gudang
    IF v_gudang_id IS NOT NULL THEN
        SELECT nama INTO v_gudang_name FROM public.gudang WHERE id = v_gudang_id;
    END IF;

    -- Kadaluwarsa permohonan pending kasir ini sebelumnya untuk tipe aksi yang sama
    UPDATE public.pos_authorizations
    SET status = 'expired', updated_at = now()
    WHERE cashier_id = v_user_id
      AND action_type = COALESCE(p_action_type, 'access_settings')
      AND status = 'pending';

    -- Generate PIN acak 6 digit
    v_pin := lpad(floor(random() * 1000000)::text, 6, '0');
    v_expires_at := now() + interval '10 minutes';

    -- Simpan permohonan baru (unclaimed)
    INSERT INTO public.pos_authorizations (
        cashier_id,
        cashier_name,
        gudang_id,
        gudang_name,
        device_name,
        action_type,
        action_metadata,
        pin_code,
        status,
        expires_at
    ) VALUES (
        v_user_id,
        v_cashier_name,
        v_gudang_id,
        COALESCE(v_gudang_name, 'Toko Utama'),
        p_device_name,
        COALESCE(p_action_type, 'access_settings'),
        COALESCE(p_action_metadata, '{}'::jsonb),
        v_pin,
        'pending',
        v_expires_at
    ) RETURNING id INTO v_new_id;

    -- Trigger webhook Push Notification via pg_net (TANPA menyertakan PIN)
    BEGIN
        PERFORM net.http_post(
            url := 'https://bms.gayabagus.shop/api/push/notify-pos-auth',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := jsonb_build_object(
                'request_id', v_new_id,
                'cashier_name', v_cashier_name,
                'gudang_id', v_gudang_id,
                'gudang_name', COALESCE(v_gudang_name, 'Toko Utama'),
                'action_type', COALESCE(p_action_type, 'access_settings'),
                'action_metadata', COALESCE(p_action_metadata, '{}'::jsonb)
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Kembalikan respons aman ke POS kasir (tanpa pin_code)
    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_id,
        'expires_at', v_expires_at,
        'message', 'Permintaan otorisasi berhasil dikirim ke atasan'
    );
END;
$$;

-- 3. Stored Procedure: claim_pos_authorization (Tarik Tugas)
CREATE OR REPLACE FUNCTION public.claim_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    -- Periksa role admin atau kepala gudang
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_user_id
        AND ('admin' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak berwenang menarik permohonan ini');
    END IF;

    -- Ambil nama penanggung jawab
    SELECT COALESCE(nama, username, 'Admin') INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    -- Cari record permohonan
    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF v_req.status != 'pending' OR v_req.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan sudah tidak aktif atau kedaluwarsa');
    END IF;

    -- Kunci permohonan ke admin ini
    UPDATE public.pos_authorizations
    SET claimed_by_id = v_user_id,
        claimed_by_name = v_user_name,
        claimed_at = now(),
        updated_at = now()
    WHERE id = p_id;

    -- Kembalikan PIN hanya ke admin yang menarik tugas
    RETURN jsonb_build_object(
        'success', true,
        'pin_code', v_req.pin_code,
        'claimed_by_name', v_user_name,
        'message', 'Permintaan berhasil ditarik'
    );
END;
$$;

-- 4. Stored Procedure: release_pos_authorization (Lepas Tugas)
CREATE OR REPLACE FUNCTION public.release_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    -- Kosongkan klaim agar kembali unclaimed
    UPDATE public.pos_authorizations
    SET claimed_by_id = NULL,
        claimed_by_name = NULL,
        claimed_at = NULL,
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tugas berhasil dikembalikan ke antrean umum'
    );
END;
$$;

-- 5. Stored Procedure: takeover_pos_authorization (Ambil Alih Tugas)
CREATE OR REPLACE FUNCTION public.takeover_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_user_id
        AND ('admin' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak berwenang mengambil alih tugas ini');
    END IF;

    SELECT COALESCE(nama, username, 'Admin') INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF v_req.status != 'pending' OR v_req.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan sudah tidak aktif atau kedaluwarsa');
    END IF;

    -- Pindahkan kepemilikan ke admin baru
    UPDATE public.pos_authorizations
    SET claimed_by_id = v_user_id,
        claimed_by_name = v_user_name,
        claimed_at = now(),
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object(
        'success', true,
        'pin_code', v_req.pin_code,
        'claimed_by_name', v_user_name,
        'message', 'Tugas berhasil diambil alih'
    );
END;
$$;

-- 6. Stored Procedure: reject_pos_authorization (Update dengan catatan penolak)
CREATE OR REPLACE FUNCTION public.reject_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_user_id
        AND ('admin' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki hak untuk menolak permohonan ini');
    END IF;

    SELECT COALESCE(nama, username, 'Admin') INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    UPDATE public.pos_authorizations
    SET status = 'rejected',
        rejected_by_id = v_user_id,
        rejected_by_name = v_user_name,
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'message', 'Permohonan otorisasi berhasil ditolak');
END;
$$;
