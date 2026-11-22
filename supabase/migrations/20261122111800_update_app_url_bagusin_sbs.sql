-- ==============================================================================
-- MIGRATION: 20261122111800_update_app_url_bagusin_sbs.sql
-- DESKRIPSI:
--   Memperbarui domain aplikasi dari https://bms.gayabagus.shop ke
--   https://bms.bagusin.sbs pada public.system_config serta fallback URL
--   fungsi webhook pg_net (notify_admin_on_kasbon, check_and_notify_absensi,
--   dan request_pos_authorization).
-- ==============================================================================

-- 1. Update app_url pada public.system_config
INSERT INTO public.system_config (key, value, description, updated_at)
VALUES (
    'app_url',
    'https://bms.bagusin.sbs',
    'URL basis aplikasi Next.js untuk callback webhook pg_net',
    NOW()
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- 2. Update fallback app_url pada notify_admin_on_kasbon()
CREATE OR REPLACE FUNCTION public.notify_admin_on_kasbon()
RETURNS TRIGGER AS $$
DECLARE
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
    v_secret := public.get_system_config('webhook_secret', '');

    BEGIN
        PERFORM net.http_post(
            url := rtrim(v_app_url, '/') || '/api/push/notify-kasbon',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-webhook-secret', v_secret
            ),
            body := jsonb_build_object(
                'kasbon_id', NEW.id,
                'user_id', NEW.user_id,
                'nominal', NEW.nominal
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update fallback app_url pada check_and_notify_absensi()
CREATE OR REPLACE FUNCTION public.check_and_notify_absensi()
RETURNS VOID AS $$
DECLARE
    payload_karyawan JSONB;
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    SELECT json_agg(json_build_object('user_id', user_id, 'tipe', tipe, 'jam', jam))
    INTO payload_karyawan
    FROM (
        -- Kondisi 1: Absen Masuk (15 menit sebelum jam_masuk)
        SELECT
            k.user_id,
            'masuk' as tipe,
            k.jam_masuk as jam
        FROM public.karyawan k
        WHERE
            k.status_karyawan = 'aktif'
            AND to_char((now() AT TIME ZONE 'Asia/Jakarta') + interval '15 minutes', 'HH24:MI') = to_char(k.jam_masuk, 'HH24:MI')
            AND NOT EXISTS (
                SELECT 1 FROM public.kehadiran h
                WHERE h.user_id = k.user_id AND h.tanggal = (now() AT TIME ZONE 'Asia/Jakarta')::date
            )

        UNION ALL

        -- Kondisi 2: Absen Pulang (15 menit setelah jam_pulang)
        SELECT
            k.user_id,
            'pulang' as tipe,
            k.jam_pulang as jam
        FROM public.karyawan k
        INNER JOIN public.kehadiran h ON h.user_id = k.user_id AND h.tanggal = (now() AT TIME ZONE 'Asia/Jakarta')::date
        WHERE
            k.status_karyawan = 'aktif'
            AND to_char((now() AT TIME ZONE 'Asia/Jakarta') - interval '15 minutes', 'HH24:MI') = to_char(k.jam_pulang, 'HH24:MI')
            AND h.waktu_pulang IS NULL
    ) as matched_users;

    -- Jika ada yang cocok, kirim ke Next.js API
    IF payload_karyawan IS NOT NULL THEN
        v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
        v_secret := public.get_system_config('webhook_secret', '');

        BEGIN
            PERFORM net.http_post(
                url := rtrim(v_app_url, '/') || '/api/push/notify-reminder',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'x-webhook-secret', v_secret
                ),
                body := jsonb_build_object(
                    'targets', payload_karyawan
                )
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update fallback app_url pada request_pos_authorization() (mempertahankan 30s cooldown)
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
    v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
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
