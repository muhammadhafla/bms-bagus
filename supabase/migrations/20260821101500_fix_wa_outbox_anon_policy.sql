-- Migration: Fix wa_outbox RLS to allow bridge polling with anon key
-- Problem: Bridge uses SUPABASE_ANON_KEY (role: anon) but wa_outbox only
--          allows 'authenticated' role. RLS silently returns [] on SELECT,
--          causing messages to never be picked up until an auth session is set.

-- Allow anon (bridge) to SELECT pending messages for polling
CREATE POLICY "Allow anon to read wa_outbox for polling"
ON wa_outbox
FOR SELECT
TO anon
USING (true);

-- Allow anon (bridge) to UPDATE status (pending -> processing -> sent/failed)
CREATE POLICY "Allow anon to update wa_outbox status"
ON wa_outbox
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
