-- Migration: Add pg_cron jobs for tier and points resets
-- Date: 2026-08-01

-- 1. Create a function to reset tier_points to 0 and reset tier to BRONZE
CREATE OR REPLACE FUNCTION public.reset_member_tier_points()
RETURNS void AS $$
DECLARE
    bronze_tier_id UUID;
BEGIN
    -- Get default BRONZE tier
    SELECT id INTO bronze_tier_id FROM public.member_tiers WHERE name = 'BRONZE' LIMIT 1;

    -- Reset tier_points and set tier to BRONZE for all members
    UPDATE public.members
    SET tier_points = 0,
        tier_id = bronze_tier_id,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Create a function to reset points (redeemable) to 0
CREATE OR REPLACE FUNCTION public.reset_member_points()
RETURNS void AS $$
BEGIN
    -- Reset points to 0 for all members
    UPDATE public.members
    SET points = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 3. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Schedule the cron jobs

-- Schedule tier_points reset at 00:00 on January 1st
SELECT cron.schedule(
    'reset_member_tier_points_yearly',
    '0 0 1 1 *',
    $$ SELECT public.reset_member_tier_points(); $$
);

-- Schedule points expiry at 23:59 on December 31st
SELECT cron.schedule(
    'expire_member_points_yearly',
    '59 23 31 12 *',
    $$ SELECT public.reset_member_points(); $$
);
