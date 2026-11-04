-- ==============================================================================
-- MIGRATION: 20261102040143_kb_inventory_and_members_anon_policy.sql
-- DESKRIPSI: Memberikan izin SELECT pada members, member_vouchers, dan inventory
-- agar aplikasi Kawan Bagus dapat membaca profil member, voucher, dan barcode scanner.
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'members' AND policyname = 'kb_members_anon_select'
    ) THEN
        CREATE POLICY kb_members_anon_select 
        ON public.members 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'member_vouchers' AND policyname = 'kb_member_vouchers_anon_select'
    ) THEN
        CREATE POLICY kb_member_vouchers_anon_select 
        ON public.member_vouchers 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;
END $$;
