-- Migration: 20261109122000_add_qrisly_config_to_gudang_and_system.sql
-- Description: Add QRISLY dynamic QRIS configuration to system_config, gudang, and track QRIS history in penjualan

-- 1. Global QRISLY Config di system_config
INSERT INTO public.system_config (key, value, description, created_at, updated_at)
VALUES 
    ('qrisly_api_key', '', 'API Key global QRISLY (RajaOngkir/Komerce) untuk generate dynamic QRIS', NOW(), NOW()),
    ('qrisly_is_sandbox', 'false', 'Mode sandbox QRISLY (true/false)', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Policy agar authenticated users dapat membaca konfigurasi QRISLY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_config' 
          AND policyname = 'system_config_authenticated_read_qrisly'
    ) THEN
        CREATE POLICY system_config_authenticated_read_qrisly 
        ON public.system_config 
        FOR SELECT 
        TO authenticated 
        USING (key IN ('qrisly_api_key', 'qrisly_is_sandbox'));
    END IF;
END $$;

-- 2. Konfigurasi QRISLY pada level Cabang/Gudang
ALTER TABLE public.gudang 
ADD COLUMN IF NOT EXISTS qrisly_api_key TEXT,
ADD COLUMN IF NOT EXISTS qrisly_qris_id TEXT,
ADD COLUMN IF NOT EXISTS qrisly_provider TEXT,
ADD COLUMN IF NOT EXISTS qrisly_unique_amount BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS qrisly_is_sandbox BOOLEAN;

-- 3. Pelacak transaksi QRISLY pada tabel penjualan
ALTER TABLE public.penjualan
ADD COLUMN IF NOT EXISTS qris_history_id BIGINT,
ADD COLUMN IF NOT EXISTS qris_unique_code INT DEFAULT 0;
