-- Migration: Auto Upgrade Member Tier
-- Date: 2026-08-01

-- Create function to auto-update tier based on points
CREATE OR REPLACE FUNCTION check_and_update_member_tier()
RETURNS TRIGGER AS $$
DECLARE
    new_tier_id UUID;
BEGIN
    -- Only run this if points have actually changed
    IF TG_OP = 'UPDATE' AND NEW.points = OLD.points THEN
        RETURN NEW;
    END IF;

    -- Find the highest tier they qualify for based on their new points
    SELECT id INTO new_tier_id
    FROM public.member_tiers
    WHERE min_points_required <= NEW.points
    ORDER BY min_points_required DESC
    LIMIT 1;

    -- If a qualifying tier is found and it's different from the current tier, update it
    IF new_tier_id IS NOT NULL AND NEW.tier_id IS DISTINCT FROM new_tier_id THEN
        NEW.tier_id := new_tier_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_member_tier ON public.members;

CREATE TRIGGER trigger_update_member_tier
BEFORE INSERT OR UPDATE OF points ON public.members
FOR EACH ROW
EXECUTE FUNCTION check_and_update_member_tier();
