-- Create crm_templates table
CREATE TABLE IF NOT EXISTS crm_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE crm_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations
CREATE POLICY "Allow authenticated full access to crm_templates" 
ON crm_templates 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Insert default templates
INSERT INTO crm_templates (name, description, content) 
VALUES (
    'thank_you', 
    'Pesan otomatis setelah pelanggan berhasil melakukan checkout',
    'Halo [Nama], terima kasih sudah berbelanja di toko kami! Semoga harimu menyenangkan. Jangan lupa mampir lagi ya! 😊'
) ON CONFLICT (name) DO NOTHING;

ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS error_message TEXT;