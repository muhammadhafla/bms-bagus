-- Fix foreign key so PostgREST can join profiles
ALTER TABLE public.karyawan
  DROP CONSTRAINT IF EXISTS karyawan_user_id_fkey,
  ADD CONSTRAINT karyawan_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
