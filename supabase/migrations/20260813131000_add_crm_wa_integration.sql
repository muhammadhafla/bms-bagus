-- Migration: Add CRM WA Integration Tables
-- Description: Creates tables for WA Message Broker and CRM Campaigns

CREATE TABLE IF NOT EXISTS wa_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(255) NOT NULL,
    sent_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional, depending on your architecture)
-- ALTER TABLE wa_outbox ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;

-- If needed, create policies for anonymous/authenticated access
-- CREATE POLICY "Allow all operations for authenticated users" ON wa_outbox FOR ALL USING (auth.role() = 'authenticated');
-- CREATE POLICY "Allow all operations for authenticated users" ON crm_campaigns FOR ALL USING (auth.role() = 'authenticated');

-- Indexes to speed up polling by the bridge worker
CREATE INDEX IF NOT EXISTS idx_wa_outbox_status ON wa_outbox(status);
