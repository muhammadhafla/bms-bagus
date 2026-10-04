-- ==========================================================
-- Migration: 20261004140000_create_pos_authorizations.sql
-- Description: Skema Tabel, RLS, dan RPC untuk Fitur PIN Otorisasi Admin POS
-- ==========================================================

-- 1. Tabel pos_authorizations
CREATE TABLE IF NOT EXISTS public.pos_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cashier_name TEXT NOT NULL,
    gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL,
    gudang_name TEXT,
    device_name TEXT,
    action_type TEXT NOT NULL DEFAULT 'access_settings',
    pin_code VARCHAR(6) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'rejected')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing untuk query cepat
CREATE INDEX IF NOT EXISTS idx_pos_auth_status ON public.pos_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_pos_auth_gudang ON public.pos_authorizations(gudang_id);
CREATE INDEX IF NOT EXISTS idx_pos_auth_created ON public.pos_authorizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_auth_cashier ON public.pos_authorizations(cashier_id);

-- Aktifkan Realtime untuk tabel pos_authorizations
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_authorizations;

-- 2. Row Level Security (RLS)
ALTER TABLE public.pos_authorizations ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Hanya Admin dan Kepala Gudang cabang terkait yang dapat melihat (Mencegah sniffing PIN oleh kasir)
DROP POLICY IF EXISTS "Admin and Kepala Gudang can view pos authorizations" ON public.pos_authorizations;
CREATE POLICY "Admin and Kepala Gudang can view pos authorizations"
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
                    'kepala_gudang' = ANY(p.roles)
                    AND (public.pos_authorizations.gudang_id IS NULL OR public.pos_authorizations.gudang_id = p.default_gudang_id)
                )
            )
        )
    );

-- Policy UPDATE: Admin dan Kepala Gudang dapat mengupdate status
DROP POLICY IF EXISTS "Admin and Kepala Gudang can update pos authorizations" ON public.pos_authorizations;
CREATE POLICY "Admin and Kepala Gudang can update pos authorizations"
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
                    'kepala_gudang' = ANY(p.roles)
                    AND (public.pos_authorizations.gudang_id IS NULL OR public.pos_authorizations.gudang_id = p.default_gudang_id)
                )
            )
        )
    );

-- 3. Stored Procedure: request_pos_authorization
CREATE OR REPLACE FUNCTION public.request_pos_authorization(
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL
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

    -- Kadaluwarsa permohonan pending kasir ini sebelumnya
    UPDATE public.pos_authorizations
    SET status = 'expired', updated_at = now()
    WHERE cashier_id = v_user_id
      AND action_type = COALESCE(p_action_type, 'access_settings')
      AND status = 'pending';

    -- Generate PIN acak 6 digit
    v_pin := lpad(floor(random() * 1000000)::text, 6, '0');
    v_expires_at := now() + interval '10 minutes';

    -- Simpan permohonan baru
    INSERT INTO public.pos_authorizations (
        cashier_id,
        cashier_name,
        gudang_id,
        gudang_name,
        device_name,
        action_type,
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
        v_pin,
        'pending',
        v_expires_at
    ) RETURNING id INTO v_new_id;

    -- Trigger webhook Push Notification via pg_net (jika terpasang)
    BEGIN
        PERFORM net.http_post(
            url := 'https://bms.gayabagus.shop/api/push/notify-pos-auth',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := jsonb_build_object(
                'request_id', v_new_id,
                'cashier_name', v_cashier_name,
                'gudang_id', v_gudang_id,
                'gudang_name', COALESCE(v_gudang_name, 'Toko Utama'),
                'pin_code', v_pin
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Abaikan jika ekstensi net belum aktif di lokal/staging
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

-- 4. Stored Procedure: verify_pos_authorization
CREATE OR REPLACE FUNCTION public.verify_pos_authorization(
    p_pin TEXT,
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_pin TEXT;
    v_req RECORD;
    v_new_attempts INTEGER;
BEGIN
    v_clean_pin := trim(p_pin);
    IF v_clean_pin IS NULL OR length(v_clean_pin) != 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Format PIN harus 6 digit angka');
    END IF;

    -- Otomatis tandai expired untuk permohonan yang lewat waktu
    UPDATE public.pos_authorizations
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND expires_at <= now();

    -- Cari permohonan aktif yang paling baru
    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE status = 'pending'
      AND action_type = COALESCE(p_action_type, 'access_settings')
      AND (p_gudang_id IS NULL OR gudang_id = p_gudang_id OR gudang_id IS NULL)
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Jika tidak ditemukan permohonan aktif
    IF v_req IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Tidak ada permohonan otorisasi yang aktif atau permohonan telah kedaluwarsa'
        );
    END IF;

    -- Jika PIN cocok
    IF v_req.pin_code = v_clean_pin THEN
        UPDATE public.pos_authorizations
        SET status = 'used',
            used_at = now(),
            updated_at = now()
        WHERE id = v_req.id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Otorisasi berhasil diberikan'
        );
    ELSE
        -- Jika PIN salah -> Tambah hitungan percobaan (Brute-force protection)
        v_new_attempts := v_req.attempt_count + 1;

        IF v_new_attempts >= v_req.max_attempts THEN
            UPDATE public.pos_authorizations
            SET attempt_count = v_new_attempts,
                status = 'rejected',
                updated_at = now()
            WHERE id = v_req.id;

            RETURN jsonb_build_object(
                'success', false,
                'attempts_remaining', 0,
                'is_blocked', true,
                'message', 'PIN salah 3 kali. Permohonan dibatalkan, silakan minta otorisasi baru.'
            );
        ELSE
            UPDATE public.pos_authorizations
            SET attempt_count = v_new_attempts,
                updated_at = now()
            WHERE id = v_req.id;

            RETURN jsonb_build_object(
                'success', false,
                'attempts_remaining', v_req.max_attempts - v_new_attempts,
                'is_blocked', false,
                'message', format('PIN salah. Sisa kesempatan: %s kali', v_req.max_attempts - v_new_attempts)
            );
        END IF;
    END IF;
END;
$$;

-- 5. Stored Procedure: reject_pos_authorization
CREATE OR REPLACE FUNCTION public.reject_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_authorized BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    -- Periksa apakah user adalah admin atau kepala gudang
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = v_user_id
        AND ('admin' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki hak untuk menolak permohonan ini');
    END IF;

    UPDATE public.pos_authorizations
    SET status = 'rejected', updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'message', 'Permohonan otorisasi berhasil ditolak');
END;
$$;
