-- Migration: Implement Shopee-style Tier Evaluation
-- Date: 2026-08-01

-- 1. Update the check_and_update_member_tier function to prevent downgrades during the period
CREATE OR REPLACE FUNCTION check_and_update_member_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_current_min_points NUMERIC;
    new_tier_id UUID;
    v_new_min_points NUMERIC;
BEGIN
    -- Only run this if tier_points have actually changed
    IF TG_OP = 'UPDATE' AND NEW.tier_points = OLD.tier_points THEN
        RETURN NEW;
    END IF;

    -- Get the min_points required for their current tier (if they have one)
    IF OLD.tier_id IS NOT NULL THEN
        SELECT min_points_required INTO v_current_min_points
        FROM public.member_tiers WHERE id = OLD.tier_id;
    END IF;

    -- Find the highest tier they qualify for based on their new tier_points
    SELECT id, min_points_required INTO new_tier_id, v_new_min_points
    FROM public.member_tiers
    WHERE min_points_required <= NEW.tier_points
    ORDER BY min_points_required DESC
    LIMIT 1;

    -- ONLY update if it's an UPGRADE (i.e. new tier requires MORE points than current tier)
    -- Or if they didn't have a tier before
    IF new_tier_id IS NOT NULL AND NEW.tier_id IS DISTINCT FROM new_tier_id THEN
        IF v_current_min_points IS NULL OR v_new_min_points > v_current_min_points THEN
            NEW.tier_id := new_tier_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update the reset function to evaluate tier before resetting tier_points
CREATE OR REPLACE FUNCTION public.reset_member_tier_points()
RETURNS void AS $$
BEGIN
    -- Evaluasi tier baru berdasarkan tier_points yang terkumpul sebelum reset
    UPDATE public.members m
    SET 
        tier_id = COALESCE(
            (SELECT id FROM public.member_tiers 
             WHERE min_points_required <= m.tier_points 
             ORDER BY min_points_required DESC 
             LIMIT 1),
            m.tier_id
        ),
        tier_points = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 3. Update the pg_cron schedule to 6 months (Jan 1 and Jul 1)
-- First unschedule the old yearly job if it exists (wrap in a DO block to ignore errors)
DO $$
BEGIN
    PERFORM cron.unschedule('reset_member_tier_points_yearly');
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore if it doesn't exist
END $$;

-- Schedule the new semi-annual job
SELECT cron.schedule(
    'reset_member_tier_points_semiannual',
    '0 0 1 1,7 *',
    $$ SELECT public.reset_member_tier_points(); $$
);
