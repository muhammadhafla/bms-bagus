-- ==============================================================================
-- MIGRATION: 20261107110500_fix_web_push_notifications.sql
-- DESKRIPSI:
-- 1. Membuat tabel public.system_config & RLS untuk menyimpan konfigurasi terpusat (app_url & webhook_secret).
-- 2. Membuat fungsi helper public.get_system_config().
-- 3. Memperbarui fungsi public.notify_admin_on_kasbon() dengan header x-webhook-secret via pg_net.
-- 4. Memperbarui fungsi public.request_pos_authorization() dengan header x-webhook-secret via pg_net.
-- 5. Memperbarui fungsi public.check_and_notify_absensi() dengan header x-webhook-secret via pg_net.
-- 6. Menjadwalkan cron job public.check_and_notify_absensi() di pg_cron setiap menit.
-- ==============================================================================

-- 1. Tabel system_config
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_config' AND policyname = 'system_config_admin_manage'
    ) THEN
        CREATE POLICY system_config_admin_manage ON public.system_config
            FOR ALL TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND 'admin' = ANY(roles)
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND 'admin' = ANY(roles)
                )
            );
    END IF;
END $$;

-- Masukkan default konfigurasi jika belum ada
INSERT INTO public.system_config (key, value, description)
VALUES 
    ('app_url', 'https://bms.gayabagus.shop', 'URL basis aplikasi Next.js untuk callback webhook pg_net'),
    ('webhook_secret', '', 'Secret token untuk otorisasi webhook pg_net ke Next.js API')
ON CONFLICT (key) DO NOTHING;

-- 2. Helper function get_system_config
CREATE OR REPLACE FUNCTION public.get_system_config(p_key TEXT, p_default TEXT DEFAULT '')
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value FROM public.system_config WHERE key = p_key LIMIT 1;
    RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update notify_admin_on_kasbon()
CREATE OR REPLACE FUNCTION public.notify_admin_on_kasbon()
RETURNS TRIGGER AS $$
DECLARE
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    v_app_url := public.get_system_config('app_url', 'https://bms.gayabagus.shop');
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

-- 4. Update request_pos_authorization()
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
    v_app_url TEXT;
    v_secret TEXT;
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

-- 5. Update check_and_notify_absensi()
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
        v_app_url := public.get_system_config('app_url', 'https://bms.gayabagus.shop');
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

-- 6. Jadwalkan cron di pg_cron
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'job_pengingat_absen') THEN
        PERFORM cron.unschedule('job_pengingat_absen');
    END IF;

    PERFORM cron.schedule(
        'job_pengingat_absen',
        '* * * * *',
        'SELECT public.check_and_notify_absensi();'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron notice: %', SQLERRM;
END $$;
