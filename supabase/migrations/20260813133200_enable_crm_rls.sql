-- Enable Row Level Security
ALTER TABLE wa_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;

-- Create Policies for wa_outbox
-- Allow authenticated users to perform all operations
CREATE POLICY "Allow authenticated full access to wa_outbox" 
ON wa_outbox 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create Policies for crm_campaigns
-- Allow authenticated users to perform all operations
CREATE POLICY "Allow authenticated full access to crm_campaigns" 
ON crm_campaigns 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

ALTER VIEW public.vw_customer_stats SET (security_invoker = on);