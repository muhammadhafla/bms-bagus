-- Migration: 20261005120000_secure_transfer_stok_rbac_rls.sql
-- Pengetatan RLS Transfer Stok: Isolasi Akses Non-Admin ke Gudang Penempatan (Asal / Tujuan)

-- 1. Helper function untuk mengambil default_gudang_id user yang sedang login
CREATE OR REPLACE FUNCTION public.get_auth_user_default_gudang()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_gudang_id UUID;
BEGIN
    SELECT p.default_gudang_id
    INTO v_gudang_id
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN v_gudang_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_default_gudang() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_default_gudang() TO authenticated;

-- 2. Update RLS Policy pada public.transfer_stok
-- Admin: bisa melihat semua
-- Non-admin: hanya melihat transfer di mana gudang penempatannya adalah Gudang Asal ATAU Gudang Tujuan
DROP POLICY IF EXISTS "transfer_stok_select" ON public.transfer_stok;
CREATE POLICY "transfer_stok_select" ON public.transfer_stok
FOR SELECT TO authenticated
USING (
    is_admin() OR
    gudang_asal_id = public.get_auth_user_default_gudang() OR
    gudang_tujuan_id = public.get_auth_user_default_gudang()
);

-- 3. Update RLS Policy pada public.transfer_stok_items
DROP POLICY IF EXISTS "transfer_items_select" ON public.transfer_stok_items;
CREATE POLICY "transfer_items_select" ON public.transfer_stok_items
FOR SELECT TO authenticated
USING (
    is_admin() OR
    EXISTS (
        SELECT 1 FROM public.transfer_stok ts
        WHERE ts.id = transfer_stok_items.transfer_id
        AND (
            ts.gudang_asal_id = public.get_auth_user_default_gudang() OR
            ts.gudang_tujuan_id = public.get_auth_user_default_gudang()
        )
    )
);
