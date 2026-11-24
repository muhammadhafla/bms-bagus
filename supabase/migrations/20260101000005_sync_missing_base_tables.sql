-- ==============================================================================
-- MIGRATION: 20260101000005_sync_missing_base_tables.sql
-- DESKRIPSI:
--   Menyinkronkan definisi DDL idempoten untuk tabel produksi public.help_articles
--   yang sebelumnya dibuat langsung di DB live tanpa file CREATE TABLE di Git.
--   (Tabel loyalty point_rewards & member_vouchers disinkronkan terpisah di
--   20260801150000 setelah tabel public.members tersedia.)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'umum',
  content_md TEXT NOT NULL,
  storage_path TEXT,
  icon_name TEXT DEFAULT 'IconFileText',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles (category);
CREATE INDEX IF NOT EXISTS idx_help_articles_created_by ON public.help_articles (created_by);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON public.help_articles (is_published);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles (slug);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
