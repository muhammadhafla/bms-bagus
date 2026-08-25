-- Sync missing profiles to karyawan table
INSERT INTO public.karyawan (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Update handle_new_user to automatically insert into karyawan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $test$
BEGIN
  INSERT INTO public.profiles (id, email, nama, role)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1), 'user'),
    'staff'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert ke karyawan
  INSERT INTO public.karyawan (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$test$;
