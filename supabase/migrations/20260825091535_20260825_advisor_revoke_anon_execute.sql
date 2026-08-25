-- Migration: Revoke EXECUTE on SECURITY DEFINER functions from anon role
-- Purpose: Prevent unauthenticated users from calling sensitive RPC functions
-- Advisor issue: Public Can Execute SECURITY DEFINER Function
--
-- Safe to apply: both web app and native POS always require authenticated session
-- before calling any of these functions (EnsureValidSessionAsync in C#,
-- authenticated Supabase client in Next.js).
--
-- Strategy: REVOKE from PUBLIC (removes =X grant) and REVOKE from anon (removes anon=X grant),
-- then re-GRANT explicitly to authenticated and service_role.

DO $$
DECLARE
  func RECORD;
BEGIN
  FOR func IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as argtypes
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.prorettype != 'trigger'::regtype::oid
  LOOP
    BEGIN
      -- Revoke from PUBLIC (removes the =X/postgres grant)
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC',
        func.proname, func.argtypes
      );
      -- Revoke from anon explicitly (removes the anon=X/postgres grant if present)
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
        func.proname, func.argtypes
      );
      -- Re-grant to authenticated and service_role
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
        func.proname, func.argtypes
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Skipped: public.%(%): %', func.proname, func.argtypes, SQLERRM;
    END;
  END LOOP;
END;
$$;

