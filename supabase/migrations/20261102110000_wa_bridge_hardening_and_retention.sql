-- Migration: WA Bridge Hardening, Dynamic Promo Footer, and Retention
-- Description: Adds wa_settings, promo footer trigger, idempotency on wa_outbox, RLS hardening, and 30-day retention pruning

-- 1. Create wa_settings table for centralized bridge configuration
CREATE TABLE IF NOT EXISTS public.wa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_receipt_promo_footer TEXT DEFAULT '',
    enable_inactivity_reminder BOOLEAN NOT NULL DEFAULT true,
    inactivity_reminder_interval_days INT NOT NULL DEFAULT 10,
    inactivity_reminder_phone VARCHAR(50),
    last_phone_active_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial default configuration row if not present
INSERT INTO public.wa_settings (id, wa_receipt_promo_footer, enable_inactivity_reminder, inactivity_reminder_interval_days)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, '', true, 10
WHERE NOT EXISTS (SELECT 1 FROM public.wa_settings);

-- Enable RLS for wa_settings
ALTER TABLE public.wa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read wa_settings"
ON public.wa_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin manage wa_settings"
ON public.wa_settings FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND (
            (auth.users.raw_user_meta_data->'roles')::jsonb ? 'admin'
            OR (auth.users.raw_user_meta_data->'role')::text = '"admin"'
            OR (auth.users.raw_app_meta_data->'roles')::jsonb ? 'admin'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND (
            (auth.users.raw_user_meta_data->'roles')::jsonb ? 'admin'
            OR (auth.users.raw_user_meta_data->'role')::text = '"admin"'
            OR (auth.users.raw_app_meta_data->'roles')::jsonb ? 'admin'
        )
    )
);

-- 2. Add reference_id and read_at to wa_outbox
ALTER TABLE public.wa_outbox ADD COLUMN IF NOT EXISTS reference_id VARCHAR(100);
ALTER TABLE public.wa_outbox ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wa_outbox_reference ON public.wa_outbox(reference_id);
CREATE INDEX IF NOT EXISTS idx_wa_outbox_status_created ON public.wa_outbox(status, created_at DESC);

-- Conditional index for idempotency within 15-minute window
CREATE INDEX IF NOT EXISTS idx_wa_outbox_idempotency_lookup 
ON public.wa_outbox (reference_id, phone, created_at)
WHERE reference_id IS NOT NULL;

-- 3. Trigger: Injeksi Promo Footer Otomatis untuk type 'receipt'
CREATE OR REPLACE FUNCTION public.append_receipt_promo_footer()
RETURNS TRIGGER AS $$
DECLARE
    v_promo TEXT;
BEGIN
    IF NEW.type = 'receipt' AND NEW.message IS NOT NULL THEN
        SELECT wa_receipt_promo_footer INTO v_promo 
        FROM public.wa_settings 
        ORDER BY updated_at DESC 
        LIMIT 1;

        IF v_promo IS NOT NULL AND TRIM(v_promo) != '' THEN
            -- Periksa apakah pesan belum memiliki footer promo ini
            IF POSITION(TRIM(v_promo) IN NEW.message) = 0 THEN
                NEW.message := NEW.message || E'\n\n--------------------------------\n' || TRIM(v_promo);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_append_receipt_promo_footer ON public.wa_outbox;
CREATE TRIGGER trg_append_receipt_promo_footer
BEFORE INSERT ON public.wa_outbox
FOR EACH ROW
EXECUTE FUNCTION public.append_receipt_promo_footer();

-- 4. RLS Hardening untuk wa_outbox (Hanya Admin yang boleh meng-insert system_command)
CREATE OR REPLACE FUNCTION public.validate_wa_outbox_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'system_command' THEN
        -- Pastikan hanya admin terautentikasi yang boleh mengirim perintah sistem
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Hanya Admin terautentikasi yang diizinkan mengirim system_command ke WhatsApp Bridge.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (
                (auth.users.raw_user_meta_data->'roles')::jsonb ? 'admin'
                OR (auth.users.raw_user_meta_data->'role')::text = '"admin"'
                OR (auth.users.raw_app_meta_data->'roles')::jsonb ? 'admin'
            )
        ) THEN
            RAISE EXCEPTION 'Akses ditolak: role Anda tidak memiliki izin untuk mengontrol sesi WhatsApp.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_wa_outbox_insert ON public.wa_outbox;
CREATE TRIGGER trg_validate_wa_outbox_insert
BEFORE INSERT ON public.wa_outbox
FOR EACH ROW
EXECUTE FUNCTION public.validate_wa_outbox_insert();

-- 5. Stored Procedure: Retensi Data 30 Hari
CREATE OR REPLACE FUNCTION public.prune_old_wa_outbox()
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.wa_outbox
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('delivered', 'sent', 'cancelled', 'read');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
