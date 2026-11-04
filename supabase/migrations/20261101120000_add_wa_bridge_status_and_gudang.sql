-- Migration: Add wa_bridge_status and warehouse mapping to wa_outbox
-- Description: Supports Zero-Inbound remote VPS bridge with status relay and multi-branch isolation

-- 1. Add optional warehouse mapping to wa_outbox
ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS id_gudang UUID REFERENCES gudang(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wa_outbox_gudang ON wa_outbox(id_gudang);

-- 2. Create wa_bridge_status table for remote status & QR relay
CREATE TABLE IF NOT EXISTS wa_bridge_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_gudang UUID REFERENCES gudang(id) ON DELETE CASCADE,
    connected BOOLEAN NOT NULL DEFAULT false,
    phone VARCHAR(50),
    name VARCHAR(255),
    qr_base64 TEXT,
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    is_session_corrupted BOOLEAN NOT NULL DEFAULT false,
    queue_stats JSONB DEFAULT '{"pending":0,"processing":0,"sent":0,"failed":0}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint ensuring 1 status row per gudang (or 1 global row where id_gudang is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_bridge_status_gudang 
ON wa_bridge_status (COALESCE(id_gudang, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Row Level Security
ALTER TABLE wa_bridge_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read wa_bridge_status" 
ON wa_bridge_status FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon manage wa_bridge_status" 
ON wa_bridge_status FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read wa_bridge_status" 
ON wa_bridge_status FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated manage wa_bridge_status" 
ON wa_bridge_status FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Enable Full Replica Identity for Realtime Payloads
ALTER TABLE wa_bridge_status REPLICA IDENTITY FULL;

-- 5. Add to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'wa_bridge_status'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE wa_bridge_status';
    END IF;
END $$;
