-- ==========================================================
-- Migration: 20260902090000_finalize_multi_role_migration.sql
-- Description: Finalisasi Migrasi Multi-Role (roles TEXT[]),
--              Rename kepala_gudang -> kepala_cabang,
--              Pembaruan Helper Functions, RLS, & DROP COLUMN role
-- ==========================================================

-- 1. DATA CLEANUP & BACKFILL ROLES
DO $$
BEGIN
    -- Pastikan semua user memiliki array roles (tidak boleh NULL)
    UPDATE public.profiles
    SET roles = ARRAY['kasir', 'staff_gudang']
    WHERE roles IS NULL OR roles = '{}';

    -- Pastikan user admin memiliki role 'admin' di array roles
    UPDATE public.profiles
    SET roles = ARRAY['admin']
    WHERE (role = 'admin') AND NOT ('admin' = ANY(roles));

    -- Migrasi role 'kepala_gudang' menjadi 'kepala_cabang'
    UPDATE public.profiles
    SET roles = array_replace(roles, 'kepala_gudang', 'kepala_cabang')
    WHERE 'kepala_gudang' = ANY(roles);
END $$;

-- 2. PERBARUI POSTGRES HELPER FUNCTIONS (MURNI MEMERIKSA roles)

-- Helper: has_role
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_has BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN p_role = ANY(p.roles) 
             OR ('admin' = ANY(p.roles) AND p_role <> 'none')
             OR (p_role = 'kepala_cabang' AND 'kepala_gudang' = ANY(p.roles))
             OR (p_role = 'kepala_gudang' AND 'kepala_cabang' = ANY(p.roles)) THEN true 
        ELSE false 
    END
    INTO v_has
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_has, false);
END;
$$;

-- Helper: has_any_role
CREATE OR REPLACE FUNCTION public.has_any_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_has BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN 'admin' = ANY(p.roles) OR p.roles && p_roles THEN true 
        ELSE false 
    END
    INTO v_has
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_has, false);
END;
$$;

-- Helper: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN 'admin' = ANY(p.roles) THEN true 
        ELSE false 
    END
    INTO v_is_admin
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_is_admin, false);
END;
$$;

-- Helper: is_admin_or_lead_warehouse (mendukung kepala_cabang & kepala_gudang)
CREATE OR REPLACE FUNCTION public.is_admin_or_lead_warehouse()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN 'admin' = ANY(p.roles) 
             OR 'kepala_cabang' = ANY(p.roles) 
             OR 'kepala_gudang' = ANY(p.roles) THEN true 
        ELSE false 
    END
    INTO v_allowed
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_allowed, false);
END;
$$;

-- Helper: is_finance_or_admin
CREATE OR REPLACE FUNCTION public.is_finance_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN 'admin' = ANY(p.roles) OR 'finance' = ANY(p.roles) THEN true 
        ELSE false 
    END
    INTO v_allowed
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_allowed, false);
END;
$$;

-- 3. PERBARUI RLS POLICIES YANG MASIH MENGECEK PROFILES.ROLE SECARA LANGSUNG
DO $$
BEGIN
    -- Payroll mutasi admin policies
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payroll_mutasi' AND policyname = 'Admin can do all on payroll_mutasi'
    ) THEN
        DROP POLICY "Admin can do all on payroll_mutasi" ON public.payroll_mutasi;
        CREATE POLICY "Admin can do all on payroll_mutasi" ON public.payroll_mutasi
            FOR ALL TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- 4. HAPUS TRIGGER SINKRONISASI BACKWARD COMPATIBILITY
DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_profile_role_column();

-- 5. HAPUS KOLOM LEGACY 'role' DARI PROFILES
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
