-- Migration: Drop qrisly_api_key from gudang table
-- Sesuai arsitektur resmi, API Key QRISLY diambil 100% secara terpusat dari tabel system_config ('qrisly_api_key')

ALTER TABLE public.gudang 
DROP COLUMN IF EXISTS qrisly_api_key;
