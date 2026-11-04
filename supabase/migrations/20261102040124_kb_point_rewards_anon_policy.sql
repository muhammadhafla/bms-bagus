-- ==============================================================================
-- MIGRATION: 20261102040124_kb_point_rewards_anon_policy.sql
-- DESKRIPSI: Memberikan izin SELECT untuk role anon pada tabel point_rewards
-- agar aplikasi Kawan Bagus dapat menampilkan katalog reward aktif.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'point_rewards' AND policyname = 'kb_point_rewards_anon_select'
    ) THEN
        CREATE POLICY kb_point_rewards_anon_select 
        ON public.point_rewards 
        FOR SELECT 
        TO anon 
        USING (is_active = true);
    END IF;
END $$;
