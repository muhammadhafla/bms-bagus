-- ==============================================================================
-- MIGRATION: 20261124090000_fase0a_profiles_secrets_pulang_awal_trigger.sql
-- FASE 0A:
--   1. [SEC-01] Proteksi kolom sensitif public.profiles (roles, default_gudang_id)
--      + WITH CHECK pada profiles_update_own + lock search_path handle_new_user()
--   2. [SEC-02] Lockdown public.system_config & public.get_system_config()
--   3. [SEC-08] Trigger DB pg_net notify_admin_on_pulang_awal() pada public.kehadiran
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. [SEC-01] Proteksi Kolom Sensitif public.profiles & RLS WITH CHECK
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    IF current_setting('role', true) = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin')
       OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.roles IS DISTINCT FROM OLD.roles
       OR NEW.default_gudang_id IS DISTINCT FROM OLD.default_gudang_id THEN
        RAISE EXCEPTION 'Forbidden: Hanya administrator yang boleh mengubah role atau penugasan cabang.';
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_guard_profiles_sensitive_columns'
          AND tgrelid = 'public.profiles'::regclass
    ) THEN
        CREATE TRIGGER trg_guard_profiles_sensitive_columns
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.guard_profiles_sensitive_columns();
    END IF;
END $$;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nama, roles)
    VALUES (
        NEW.id,
        NEW.email,
        coalesce(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1), 'user'),
        ARRAY['kasir', 'staff_gudang']
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.karyawan (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. [SEC-02] Lockdown public.system_config & public.get_system_config()
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "system_config_authenticated_read_ota" ON public.system_config;
DROP POLICY IF EXISTS "system_config_authenticated_read_qrisly" ON public.system_config;
DROP POLICY IF EXISTS "system_config_admin_manage" ON public.system_config;

CREATE POLICY "system_config_admin_manage"
ON public.system_config
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.get_system_config(p_key text, p_default text DEFAULT ''::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value
    FROM public.system_config
    WHERE key = p_key
    LIMIT 1;

    RETURN COALESCE(v_value, p_default);
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_config(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_config(text, text) TO service_role;

-- ------------------------------------------------------------------------------
-- 3. [SEC-08] Trigger DB pg_net notify_admin_on_pulang_awal() pada public.kehadiran
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admin_on_pulang_awal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
    v_app_url TEXT;
    v_secret TEXT;
    v_jam_pulang_aktual TEXT;
    v_jam_pulang_jadwal TEXT;
BEGIN
    v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
    v_secret := public.get_system_config('webhook_secret', '');

    v_jam_pulang_aktual := COALESCE(
        to_char(COALESCE(NEW.waktu_pulang_aktual, NEW.waktu_pulang) AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'),
        ''
    );

    SELECT COALESCE(to_char(k.jam_pulang, 'HH24:MI'), '')
    INTO v_jam_pulang_jadwal
    FROM public.karyawan k
    WHERE k.user_id = NEW.user_id
    LIMIT 1;

    BEGIN
        PERFORM net.http_post(
            url := rtrim(v_app_url, '/') || '/api/push/notify-pulang-awal',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-webhook-secret', v_secret
            ),
            body := jsonb_build_object(
                'kehadiran_id', NEW.id,
                'user_id', NEW.user_id,
                'jam_pulang_aktual', v_jam_pulang_aktual,
                'jam_pulang_jadwal', COALESCE(v_jam_pulang_jadwal, ''),
                'alasan', COALESCE(NEW.alasan_pulang_awal, '')
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admin_on_pulang_awal() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_notify_admin_on_pulang_awal'
          AND tgrelid = 'public.kehadiran'::regclass
    ) THEN
        CREATE TRIGGER trg_notify_admin_on_pulang_awal
        AFTER INSERT OR UPDATE OF status_pulang_awal ON public.kehadiran
        FOR EACH ROW
        WHEN (NEW.status_pulang_awal = 'pending')
        EXECUTE FUNCTION public.notify_admin_on_pulang_awal();
    END IF;
END $$;
