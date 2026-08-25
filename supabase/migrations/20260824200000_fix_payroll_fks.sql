-- Fix foreign keys so PostgREST can join profiles for payroll tables
ALTER TABLE public.kehadiran
  DROP CONSTRAINT IF EXISTS kehadiran_user_id_fkey,
  ADD CONSTRAINT kehadiran_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.kasbon
  DROP CONSTRAINT IF EXISTS kasbon_user_id_fkey,
  ADD CONSTRAINT kasbon_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.slip_gaji
  DROP CONSTRAINT IF EXISTS slip_gaji_user_id_fkey,
  ADD CONSTRAINT slip_gaji_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
