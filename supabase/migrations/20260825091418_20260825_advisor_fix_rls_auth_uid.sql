-- Migration: Fix RLS policies - replace auth.uid() with (select auth.uid())
-- Purpose: Improve RLS performance by preventing per-row re-evaluation of auth.uid()
-- Advisor issue: Auth RLS Initialization Plan

-- 1. inventory.inventory_update_staff
DROP POLICY IF EXISTS inventory_update_staff ON public.inventory;
CREATE POLICY inventory_update_staff ON public.inventory
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['staff'::text, 'admin'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = ANY (ARRAY['staff'::text, 'admin'::text])));

-- 2. karyawan.karyawan_select
DROP POLICY IF EXISTS karyawan_select ON public.karyawan;
CREATE POLICY karyawan_select ON public.karyawan
  FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

-- 3. kasbon.kasbon_select
DROP POLICY IF EXISTS kasbon_select ON public.kasbon;
CREATE POLICY kasbon_select ON public.kasbon
  FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

-- 4. kasbon.kasbon_insert
DROP POLICY IF EXISTS kasbon_insert ON public.kasbon;
CREATE POLICY kasbon_insert ON public.kasbon
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (select auth.uid())) OR is_admin());

-- 5. kehadiran.kehadiran_select
DROP POLICY IF EXISTS kehadiran_select ON public.kehadiran;
CREATE POLICY kehadiran_select ON public.kehadiran
  FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

-- 6. kehadiran.kehadiran_update
DROP POLICY IF EXISTS kehadiran_update ON public.kehadiran;
CREATE POLICY kehadiran_update ON public.kehadiran
  FOR UPDATE TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

-- 7. kehadiran.kehadiran_insert
DROP POLICY IF EXISTS kehadiran_insert ON public.kehadiran;
CREATE POLICY kehadiran_insert ON public.kehadiran
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (select auth.uid())) OR is_admin());

-- 8. label_templates."Allow admin delete"
DROP POLICY IF EXISTS "Allow admin delete" ON public.label_templates;
CREATE POLICY "Allow admin delete" ON public.label_templates
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::text));

-- 9. label_templates."Allow admin insert"
DROP POLICY IF EXISTS "Allow admin insert" ON public.label_templates;
CREATE POLICY "Allow admin insert" ON public.label_templates
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::text));

-- 10. label_templates."Allow admin update"
DROP POLICY IF EXISTS "Allow admin update" ON public.label_templates;
CREATE POLICY "Allow admin update" ON public.label_templates
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::text));

-- 11. payroll_mutasi."Admins have full access to payroll_mutasi"
DROP POLICY IF EXISTS "Admins have full access to payroll_mutasi" ON public.payroll_mutasi;
CREATE POLICY "Admins have full access to payroll_mutasi" ON public.payroll_mutasi
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::text));

-- 12. payroll_mutasi."Users can view their own mutasi"
DROP POLICY IF EXISTS "Users can view their own mutasi" ON public.payroll_mutasi;
CREATE POLICY "Users can view their own mutasi" ON public.payroll_mutasi
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- 13. payroll_mutasi."Users can create their own pending mutasi (kasbon)"
DROP POLICY IF EXISTS "Users can create their own pending mutasi (kasbon)" ON public.payroll_mutasi;
CREATE POLICY "Users can create their own pending mutasi (kasbon)" ON public.payroll_mutasi
  FOR INSERT
  WITH CHECK (((select auth.uid()) = user_id) AND (status = 'pending'::payroll_mutasi_status));

-- 14. profiles.profiles_update_own
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()));

-- 15. push_subscriptions."Users can manage their own push subscriptions"
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON public.push_subscriptions
  FOR ALL
  USING ((select auth.uid()) = user_id);

-- 16. slip_gaji.slip_gaji_select
DROP POLICY IF EXISTS slip_gaji_select ON public.slip_gaji;
CREATE POLICY slip_gaji_select ON public.slip_gaji
  FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

