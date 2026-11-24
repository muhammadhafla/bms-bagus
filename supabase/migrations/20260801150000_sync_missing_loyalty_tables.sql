-- ==============================================================================
-- MIGRATION: 20260801150000_sync_missing_loyalty_tables.sql
-- DESKRIPSI:
--   Menyinkronkan definisi DDL idempoten untuk tabel produksi loyalty
--   (public.point_rewards & public.member_vouchers) yang dibuat setelah
--   20260729111200_add_membership.sql (tabel public.members) dan sebelum
--   20261006154500_comprehensive_security_and_robustness_fixes.sql.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.point_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  points_required NUMERIC NOT NULL,
  reward_type VARCHAR DEFAULT 'voucher_discount',
  discount_nominal NUMERIC DEFAULT 0,
  image_url TEXT,
  stock INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT true,
  valid_days INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  min_purchase_amount NUMERIC DEFAULT 0,
  max_claims_per_member INTEGER DEFAULT 1
);

ALTER TABLE public.point_rewards ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.member_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_member UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  id_reward UUID REFERENCES public.point_rewards(id) ON DELETE SET NULL,
  voucher_code VARCHAR NOT NULL UNIQUE,
  title VARCHAR NOT NULL,
  discount_nominal NUMERIC DEFAULT 0,
  status VARCHAR DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  min_purchase_amount NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_member_vouchers_id_reward ON public.member_vouchers (id_reward);
CREATE INDEX IF NOT EXISTS idx_member_vouchers_member ON public.member_vouchers (id_member);
CREATE INDEX IF NOT EXISTS idx_member_vouchers_status ON public.member_vouchers (status);

ALTER TABLE public.member_vouchers ENABLE ROW LEVEL SECURITY;
