-- Migration: Add discontinued columns to inventory table
-- Date: 2026-04-14

ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discontinued_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS discontinued_by UUID REFERENCES profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_is_discontinued ON inventory(is_discontinued);
