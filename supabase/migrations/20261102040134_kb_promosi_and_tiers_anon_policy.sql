-- ==============================================================================
-- MIGRATION: 20261102040134_kb_promosi_and_tiers_anon_policy.sql
-- DESKRIPSI: Memberikan izin SELECT pada member_tiers, promosi, dan promosi_items
-- agar aplikasi Kawan Bagus dapat membaca tingkatan tier dan daftar promo aktif.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'member_tiers' AND policyname = 'kb_member_tiers_anon_select'
    ) THEN
        CREATE POLICY kb_member_tiers_anon_select 
        ON public.member_tiers 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promosi' AND policyname = 'kb_promosi_anon_select'
    ) THEN
        CREATE POLICY kb_promosi_anon_select 
        ON public.promosi 
        FOR SELECT 
        TO anon 
        USING (status = 'active');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promosi_items' AND policyname = 'kb_promosi_items_anon_select'
    ) THEN
        CREATE POLICY kb_promosi_items_anon_select 
        ON public.promosi_items 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;
END $$;
