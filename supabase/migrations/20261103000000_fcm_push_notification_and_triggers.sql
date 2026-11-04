-- ==============================================================================
-- MIGRATION: 20261103000000_fcm_push_notification_and_triggers.sql
-- DESKRIPSI: 
-- 1. Membuat tabel member_fcm_tokens untuk menyimpan FCM token perangkat member.
-- 2. Mengaktifkan Row Level Security (RLS) pada member_fcm_tokens.
-- 3. Membuat fungsi notify_member_receipt_fcm() yang memanggil Edge Function
--    send-receipt-push via pg_net secara asinkron saat transaksi kasir selesai.
-- 4. Membuat trigger trg_notify_member_receipt_fcm pada tabel public.penjualan.
-- ==============================================================================

-- 1. Tabel member_fcm_tokens
CREATE TABLE IF NOT EXISTS public.member_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, fcm_token)
);

-- Index untuk performa pencarian token saat kasir mencetak struk
CREATE INDEX IF NOT EXISTS idx_member_fcm_tokens_member_id 
ON public.member_fcm_tokens(member_id);

-- 2. Row Level Security (RLS)
ALTER TABLE public.member_fcm_tokens ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'member_fcm_tokens' AND policyname = 'member_fcm_tokens_allow_all'
    ) THEN
        CREATE POLICY member_fcm_tokens_allow_all ON public.member_fcm_tokens 
        FOR ALL TO anon, authenticated 
        USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. Fungsi Asinkron Pemanggilan Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.notify_member_receipt_fcm()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
BEGIN
  -- Hanya picu jika member_id terisi dan status transaksi adalah 'paid'
  IF NEW.member_id IS NOT NULL AND NEW.status = 'paid' THEN
    v_payload := jsonb_build_object(
      'penjualan_id', NEW.id,
      'member_id', NEW.member_id,
      'nomor_struk', COALESCE(NEW.nomor_struk, 'STRUK-POS'),
      'total', NEW.total,
      'points_earned', COALESCE(NEW.points_earned, 0)
    );

    -- Panggil Edge Function send-receipt-push secara asinkron (non-blocking)
    PERFORM net.http_post(
      url := 'https://letxagpmrumwcjuzruyg.supabase.co/functions/v1/send-receipt-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := v_payload
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger pada Tabel Penjualan
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_member_receipt_fcm'
  ) THEN
    CREATE TRIGGER trg_notify_member_receipt_fcm
    AFTER INSERT OR UPDATE OF status ON public.penjualan
    FOR EACH ROW
    WHEN (NEW.member_id IS NOT NULL AND NEW.status = 'paid')
    EXECUTE FUNCTION public.notify_member_receipt_fcm();
  END IF;
END $$;
