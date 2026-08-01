-- Migration: Add RLS policies for Membership tables
-- Date: 2026-07-31

-- Ensure RLS is enabled
ALTER TABLE public.member_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflict if rerun)
DROP POLICY IF EXISTS "member_tiers_all" ON public.member_tiers;
DROP POLICY IF EXISTS "members_all" ON public.members;

-- Create policies for authenticated users
CREATE POLICY "member_tiers_all" ON public.member_tiers 
FOR ALL 
USING (auth.role() = 'authenticated');

CREATE POLICY "members_all" ON public.members 
FOR ALL 
USING (auth.role() = 'authenticated');
