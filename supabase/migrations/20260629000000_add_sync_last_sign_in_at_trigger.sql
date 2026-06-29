-- Migration: Add trigger to sync last_sign_in_at from auth.users to public.profiles

-- Create the function that will sync last_sign_in_at
CREATE OR REPLACE FUNCTION public.sync_last_sign_in_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_sign_in_at();
