-- Migration: Enable Supabase Realtime for wa_outbox
-- Description: Ensures wa_outbox table has full replica identity and is included in supabase_realtime publication idempotently

ALTER TABLE wa_outbox REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'wa_outbox'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE wa_outbox';
    END IF;
END $$;
