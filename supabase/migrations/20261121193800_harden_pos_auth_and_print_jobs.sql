-- ==========================================================
-- Migration: 20261121193800_harden_pos_auth_and_print_jobs.sql
-- Description:
--   1. Add claimed_at to print_jobs for accurate stale-lock recovery (HIGH-04).
--   2. Add 30-second server-side non-expiring cooldown to request_pos_authorization (HIGH-14).
--   3. Harden verify_pos_authorization with FOR UPDATE row lock, cashier_id = auth.uid(),
--      and optional p_request_id binding (backward-compatible DEFAULT NULL).
-- ==========================================================

-- 1. print_jobs.claimed_at
ALTER TABLE public.print_jobs
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_print_jobs_printing_claimed
    ON public.print_jobs (gudang_id, claimed_at)
    WHERE status = 'Printing';

-- 2. Harden 4-arg request_pos_authorization (30s cooldown without expiring active PIN)
CREATE OR REPLACE FUNCTION public.request_pos_authorization(
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL,
    p_action_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID;
    v_cashier_name TEXT;
    v_gudang_id UUID;
    v_gudang_name TEXT;
    v_pin VARCHAR(6);
    v_new_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_action_type TEXT;
    v_active_req RECORD;
    v_retry_after INT;
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    v_action_type := COALESCE(NULLIF(trim(p_action_type), ''), 'access_settings');

    -- Server-side 30s cooldown: tolak request baru tanpa meng-expire PIN aktif
    SELECT id, created_at, expires_at
    INTO v_active_req
    FROM public.pos_authorizations
    WHERE cashier_id = v_user_id
      AND action_type = v_action_type
      AND status = 'pending'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_active_req IS NOT NULL AND v_active_req.created_at > now() - interval '30 seconds' THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_active_req.created_at + interval '30 seconds' - now())))::INT);
        RETURN jsonb_build_object(
            'success', false,
            'request_id', v_active_req.id,
            'expires_at', v_active_req.expires_at,
            'retry_after_seconds', v_retry_after,
            'message', format('Permintaan sudah dikirim. Tunggu %s detik sebelum mengirim ulang.', v_retry_after)
        );
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
      AND action_type = v_action_type
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
        v_action_type,
        COALESCE(p_action_metadata, '{}'::jsonb),
        v_pin,
        'pending',
        v_expires_at
    ) RETURNING id INTO v_new_id;

    -- Ambil URL dan secret dari system_config
    v_app_url := public.get_system_config('app_url', 'https://bms.gayabagus.shop');
    v_secret := public.get_system_config('webhook_secret', '');

    -- Trigger webhook Push Notification via pg_net (TANPA menyertakan PIN)
    BEGIN
        PERFORM net.http_post(
            url := rtrim(v_app_url, '/') || '/api/push/notify-pos-auth',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-webhook-secret', v_secret
            ),
            body := jsonb_build_object(
                'request_id', v_new_id,
                'cashier_name', v_cashier_name,
                'gudang_id', v_gudang_id,
                'gudang_name', COALESCE(v_gudang_name, 'Toko Utama'),
                'action_type', v_action_type,
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

-- 3. Sinkronkan legacy 3-arg overload agar ikut delegasi ke 4-arg (tanpa DROP FUNCTION)
CREATE OR REPLACE FUNCTION public.request_pos_authorization(
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL,
    p_device_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.request_pos_authorization(
        p_action_type,
        p_gudang_id,
        p_device_name,
        '{}'::jsonb
    );
END;
$$;

-- 4. Harden verify_pos_authorization dengan p_request_id + cashier_id + FOR UPDATE
CREATE OR REPLACE FUNCTION public.verify_pos_authorization(
    p_pin TEXT,
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL,
    p_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID;
    v_clean_pin TEXT;
    v_action_type TEXT;
    v_req RECORD;
    v_new_attempts INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    v_clean_pin := trim(COALESCE(p_pin, ''));
    IF length(v_clean_pin) != 6 OR v_clean_pin !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Format PIN harus 6 digit angka');
    END IF;

    v_action_type := COALESCE(NULLIF(trim(p_action_type), ''), 'access_settings');

    -- Otomatis tandai expired untuk permohonan kasir ini yang lewat waktu
    UPDATE public.pos_authorizations
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending'
      AND cashier_id = v_user_id
      AND expires_at <= now();

    -- Kunci baris permohonan aktif milik kasir ini secara atomik
    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE status = 'pending'
      AND cashier_id = v_user_id
      AND action_type = v_action_type
      AND (p_request_id IS NULL OR id = p_request_id)
      AND (p_gudang_id IS NULL OR gudang_id = p_gudang_id OR gudang_id IS NULL)
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Tidak ada permohonan otorisasi yang aktif atau permohonan telah kedaluwarsa'
        );
    END IF;

    IF v_req.pin_code = v_clean_pin THEN
        UPDATE public.pos_authorizations
        SET status = 'used',
            used_at = now(),
            updated_at = now()
        WHERE id = v_req.id;

        RETURN jsonb_build_object(
            'success', true,
            'request_id', v_req.id,
            'message', 'Otorisasi berhasil diberikan'
        );
    ELSE
        v_new_attempts := v_req.attempt_count + 1;

        IF v_new_attempts >= v_req.max_attempts THEN
            UPDATE public.pos_authorizations
            SET attempt_count = v_new_attempts,
                status = 'rejected',
                updated_at = now()
            WHERE id = v_req.id;

            RETURN jsonb_build_object(
                'success', false,
                'request_id', v_req.id,
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
                'request_id', v_req.id,
                'attempts_remaining', v_req.max_attempts - v_new_attempts,
                'is_blocked', false,
                'message', format('PIN salah. Sisa kesempatan: %s kali', v_req.max_attempts - v_new_attempts)
            );
        END IF;
    END IF;
END;
$$;

-- 5. Sinkronkan legacy 3-arg verify_pos_authorization agar ikut delegasi ke 4-arg
CREATE OR REPLACE FUNCTION public.verify_pos_authorization(
    p_pin TEXT,
    p_action_type TEXT DEFAULT 'access_settings',
    p_gudang_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.verify_pos_authorization(
        p_pin,
        p_action_type,
        p_gudang_id,
        NULL::uuid
    );
END;
$$;
