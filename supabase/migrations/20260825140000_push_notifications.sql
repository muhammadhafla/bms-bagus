-- Migration untuk Push Notifications (Web Push)

-- Aktifkan ekstensi yang dibutuhkan jika belum aktif
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Tabel untuk menyimpan subscription push notification
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    auth_key TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS untuk push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Webhook Trigger untuk Kasbon Baru -> Kirim notif ke Admin
CREATE OR REPLACE FUNCTION notify_admin_on_kasbon()
RETURNS TRIGGER AS $$
DECLARE
    app_url TEXT;
BEGIN
    -- Ambil URL aplikasi (misal menggunakan current_setting atau hardcode sementara, 
    -- lebih baik panggil webhook internal lewat localhost / edge function)
    -- Karena Vercel/Next.js terpisah dari Supabase DB, kita harus tahu URL Next.js.
    -- Akan lebih aman jika kita pass payload lewat pg_net ke endpoint production/staging.
    -- Kita asumsikan URL ada di table settings atau environment variable db.
    -- Sebagai fallback, kita tembak endpoint webhook Supabase Edge Function jika ada.
    -- Namun karena kita pakai Next.js API route, kita tembak URL Next.js.
    
    -- Disini kita akan membuat HTTP POST via pg_net
    PERFORM net.http_post(
        url := 'https://bms.gayabagus.shop/api/push/notify-kasbon',
        headers := '{"Content-Type": "application/json"}',
        body := json_build_object(
            'kasbon_id', NEW.id,
            'user_id', NEW.user_id,
            'nominal', NEW.nominal
        )::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_on_kasbon ON public.payroll_mutasi;
CREATE TRIGGER trigger_notify_admin_on_kasbon
    AFTER INSERT ON public.payroll_mutasi
    FOR EACH ROW
    WHEN (NEW.kategori = 'kasbon' AND NEW.status = 'pending')
    EXECUTE FUNCTION notify_admin_on_kasbon();


-- Fungsi untuk Cron Pengingat Absen (Dinamis)
CREATE OR REPLACE FUNCTION check_and_notify_absensi()
RETURNS VOID AS $$
DECLARE
    payload_karyawan JSONB;
BEGIN
    -- Cari karyawan yang jam masuknya persis 15 menit dari sekarang (dibulatkan ke menit)
    -- Dan belum ada row di kehadiran pada tanggal hari ini.
    -- Atau jam pulangnya sudah lewat 15 menit dan waktu_pulang masih NULL
    
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
            -- Bandingkan waktu sekarang + 15 menit dengan jam masuk
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
        PERFORM net.http_post(
            url := 'https://bms.gayabagus.shop/api/push/notify-reminder',
            headers := '{"Content-Type": "application/json"}',
            body := json_build_object(
                'targets', payload_karyawan
            )::jsonb
        );
    END IF;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Jadwalkan pengecekan absen setiap 1 menit
-- Unschedule first if exists to prevent duplicates
-- SELECT cron.unschedule('job_pengingat_absen');
-- SELECT cron.schedule(
--    'job_pengingat_absen',
--    '* * * * *', -- setiap menit
--    $$ SELECT check_and_notify_absensi(); $$
-- );
