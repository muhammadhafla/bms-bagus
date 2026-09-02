-- Migration: Add gudang_name to shift_sessions table
-- Description: Adds gudang_name column to shift_sessions to support multi-outlet warehouse name display.

ALTER TABLE public.shift_sessions 
ADD COLUMN IF NOT EXISTS gudang_name TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
