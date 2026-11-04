-- ==============================================================================
-- MIGRATION: 20261102040208_kb_promosi_status_policy_fix.sql
-- DESKRIPSI: Memperluas kebijakan SELECT promosi agar mendukung status 'aktif' dan 'active'.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'promosi' AND policyname = 'kb_promosi_anon_select_aktif'
    ) THEN
        CREATE POLICY kb_promosi_anon_select_aktif 
        ON public.promosi 
        FOR SELECT 
        TO anon 
        USING (status IN ('aktif', 'active'));
    END IF;
END $$;
