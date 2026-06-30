-- Migration: add_label_printing_module
-- Description: Adds tables for label templates and print jobs

-- Master: Label Templates
CREATE TABLE IF NOT EXISTS label_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    language VARCHAR NOT NULL CHECK (language IN ('TSPL', 'ZPL', 'ESC-POS')),
    content_json JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operational: Print Jobs
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES label_templates(id) NOT NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Printing', 'Done', 'Failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    printed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (Row Level Security) if not already enabled (assuming standard Supabase setup)
ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage templates and print jobs
-- (Adjust these policies according to your app's specific role requirements)
CREATE POLICY "Allow authenticated users to read label templates" 
ON label_templates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert label templates" 
ON label_templates FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update label templates" 
ON label_templates FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete label templates" 
ON label_templates FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to read print jobs" 
ON print_jobs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert print jobs" 
ON print_jobs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update print jobs" 
ON print_jobs FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete print jobs" 
ON print_jobs FOR DELETE 
TO authenticated 
USING (true);
