-- ==========================================================
-- Migration: 20261004201500_support_kepala_cabang_pos_auth.sql
-- Description: Mendukung role kepala_cabang secara resmi pada RLS
--              dan RPC fitur Otorisasi POS (dengan isolasi cabang)
-- ==========================================================

-- 1. Perbarui RLS SELECT policy untuk pos_authorizations
DROP POLICY IF EXISTS "Admin and Kepala Gudang can view pos authorizations" ON public.pos_authorizations;
DROP POLICY IF EXISTS "Admin and Kepala Cabang can view pos authorizations" ON public.pos_authorizations;

CREATE POLICY "Admin and Kepala Cabang can view pos authorizations"
    ON public.pos_authorizations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                'admin' = ANY(p.roles)
                OR (
                    ('kepala_cabang' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
                    AND (public.pos_authorizations.gudang_id IS NULL OR public.pos_authorizations.gudang_id = p.default_gudang_id)
                )
            )
        )
    );

-- 2. Perbarui RLS UPDATE policy untuk pos_authorizations
DROP POLICY IF EXISTS "Admin and Kepala Gudang can update pos authorizations" ON public.pos_authorizations;
DROP POLICY IF EXISTS "Admin and Kepala Cabang can update pos authorizations" ON public.pos_authorizations;

CREATE POLICY "Admin and Kepala Cabang can update pos authorizations"
    ON public.pos_authorizations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                'admin' = ANY(p.roles)
                OR (
                    ('kepala_cabang' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
                    AND (public.pos_authorizations.gudang_id IS NULL OR public.pos_authorizations.gudang_id = p.default_gudang_id)
                )
            )
        )
    );

-- 3. Perbarui RPC claim_pos_authorization
CREATE OR REPLACE FUNCTION public.claim_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_roles TEXT[];
    v_user_gudang_id UUID;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    -- Ambil profil user
    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Admin')
    INTO v_user_roles, v_user_gudang_id, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    -- Periksa role admin atau kepala cabang / kepala gudang
    v_is_authorized := ('admin' = ANY(v_user_roles))
        OR ('kepala_cabang' = ANY(v_user_roles))
        OR ('kepala_gudang' = ANY(v_user_roles));

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak berwenang menarik permohonan ini');
    END IF;

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

    -- Isolasi cabang untuk non-admin
    IF NOT ('admin' = ANY(v_user_roles)) THEN
        IF v_req.gudang_id IS NOT NULL AND v_user_gudang_id IS NOT NULL AND v_req.gudang_id != v_user_gudang_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Anda hanya dapat menangani permohonan dari cabang Anda');
        END IF;
    END IF;

    -- Kunci permohonan ke user ini
    UPDATE public.pos_authorizations
    SET claimed_by_id = v_user_id,
        claimed_by_name = v_user_name,
        claimed_at = now(),
        updated_at = now()
    WHERE id = p_id;

    -- Kembalikan PIN hanya ke user yang menarik tugas
    RETURN jsonb_build_object(
        'success', true,
        'pin_code', v_req.pin_code,
        'claimed_by_name', v_user_name,
        'message', 'Permintaan berhasil ditarik'
    );
END;
$$;

-- 4. Perbarui RPC takeover_pos_authorization
CREATE OR REPLACE FUNCTION public.takeover_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_roles TEXT[];
    v_user_gudang_id UUID;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Admin')
    INTO v_user_roles, v_user_gudang_id, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    v_is_authorized := ('admin' = ANY(v_user_roles))
        OR ('kepala_cabang' = ANY(v_user_roles))
        OR ('kepala_gudang' = ANY(v_user_roles));

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak berwenang mengambil alih permohonan ini');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF v_req.status != 'pending' OR v_req.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan sudah tidak aktif atau kedaluwarsa');
    END IF;

    -- Isolasi cabang untuk non-admin
    IF NOT ('admin' = ANY(v_user_roles)) THEN
        IF v_req.gudang_id IS NOT NULL AND v_user_gudang_id IS NOT NULL AND v_req.gudang_id != v_user_gudang_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Anda hanya dapat mengambil alih permohonan dari cabang Anda');
        END IF;
    END IF;

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
        'message', 'Tugas permohonan berhasil diambil alih'
    );
END;
$$;

-- 5. Perbarui RPC reject_pos_authorization
CREATE OR REPLACE FUNCTION public.reject_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_roles TEXT[];
    v_user_gudang_id UUID;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Admin')
    INTO v_user_roles, v_user_gudang_id, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    v_is_authorized := ('admin' = ANY(v_user_roles))
        OR ('kepala_cabang' = ANY(v_user_roles))
        OR ('kepala_gudang' = ANY(v_user_roles));

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki hak untuk menolak permohonan ini');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    -- Isolasi cabang untuk non-admin
    IF NOT ('admin' = ANY(v_user_roles)) THEN
        IF v_req.gudang_id IS NOT NULL AND v_user_gudang_id IS NOT NULL AND v_req.gudang_id != v_user_gudang_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Anda hanya dapat menolak permohonan dari cabang Anda');
        END IF;
    END IF;

    UPDATE public.pos_authorizations
    SET status = 'rejected',
        rejected_by_id = v_user_id,
        rejected_by_name = v_user_name,
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'message', 'Permohonan otorisasi berhasil ditolak');
END;
$$;
