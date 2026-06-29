-- Migration: Add last_sign_in_at to profiles table

ALTER TABLE profiles
ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;
