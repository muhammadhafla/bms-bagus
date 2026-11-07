-- ==============================================================================
-- MIGRATION: 20261105144500_tier_min_purchase_and_double_points.sql
-- DESKRIPSI:
-- 1. Tambah kolom min_purchase_amount pada public.member_tiers untuk syarat minimal belanja.
-- 2. Tambah kolom double_points_active, double_points_days, double_points_multiplier pada public.loyalty_settings.
-- 3. Inisialisasi RPC public.calculate_member_transaction_benefit() untuk validasi diskon & perolehan poin cerdas di kasir.
-- ==============================================================================

-- 1. Kolom min_purchase_amount di member_tiers
ALTER TABLE public.member_tiers 
ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC(12,2) DEFAULT 0;

-- Inisialisasi nilai proporsional jika belum diisi
UPDATE public.member_tiers 
SET min_purchase_amount = 50000 
WHERE name = 'SILVER' AND (min_purchase_amount IS NULL OR min_purchase_amount = 0);

UPDATE public.member_tiers 
SET min_purchase_amount = 100000 
WHERE name = 'GOLD' AND (min_purchase_amount IS NULL OR min_purchase_amount = 0);

-- 2. Konfigurasi Double Points Day di loyalty_settings
ALTER TABLE public.loyalty_settings
ADD COLUMN IF NOT EXISTS double_points_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS double_points_days INT[] DEFAULT ARRAY[2, 3], -- 2=Selasa, 3=Rabu (ISO DOW)
ADD COLUMN IF NOT EXISTS double_points_multiplier NUMERIC(3,1) DEFAULT 2.0;

UPDATE public.loyalty_settings
SET 
  double_points_active = COALESCE(double_points_active, false),
  double_points_days = COALESCE(double_points_days, ARRAY[2, 3]),
  double_points_multiplier = COALESCE(double_points_multiplier, 2.0)
WHERE id = 'default';

-- 3. RPC Function untuk kalkulasi manfaat member di kasir
CREATE OR REPLACE FUNCTION public.calculate_member_transaction_benefit(
  p_member_id UUID,
  p_subtotal NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member RECORD;
  v_tier RECORD;
  v_settings RECORD;
  v_dow INT;
  v_is_double_day BOOLEAN := false;
  v_multiplier NUMERIC := 1.0;
  v_discount_amount NUMERIC := 0;
  v_is_discount_applied BOOLEAN := false;
  v_points_earned NUMERIC := 0;
  v_shortfall NUMERIC := 0;
BEGIN
  -- Ambil data member beserta tier-nya
  SELECT m.id, m.name, m.tier_id, m.points
  INTO v_member
  FROM public.members m
  WHERE m.id = p_member_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Member tidak ditemukan'
    );
  END IF;

  SELECT * INTO v_tier FROM public.member_tiers WHERE id = v_member.tier_id;
  IF NOT FOUND THEN
    SELECT * INTO v_tier FROM public.member_tiers WHERE name = 'BRONZE' LIMIT 1;
  END IF;

  -- Evaluasi Diskon Tier berdasarkan min_purchase_amount
  IF COALESCE(v_tier.discount_percentage, 0) > 0 AND p_subtotal >= COALESCE(v_tier.min_purchase_amount, 0) THEN
    v_discount_amount := ROUND((p_subtotal * v_tier.discount_percentage) / 100, 2);
    v_is_discount_applied := true;
    v_shortfall := 0;
  ELSE
    v_discount_amount := 0;
    v_is_discount_applied := false;
    v_shortfall := GREATEST(COALESCE(v_tier.min_purchase_amount, 0) - p_subtotal, 0);
  END IF;

  -- Ambil Pengaturan Loyalitas & Evaluasi Double Points Day
  SELECT * INTO v_settings FROM public.loyalty_settings WHERE id = 'default';
  IF NOT FOUND THEN
    v_settings.double_points_active := false;
    v_settings.double_points_days := ARRAY[2, 3];
    v_settings.double_points_multiplier := 2.0;
  END IF;

  v_dow := EXTRACT(ISODOW FROM NOW())::INT; -- 1=Senin, 2=Selasa, ..., 7=Minggu

  IF COALESCE(v_settings.double_points_active, false) AND v_dow = ANY(COALESCE(v_settings.double_points_days, ARRAY[]::INT[])) THEN
    v_is_double_day := true;
    v_multiplier := COALESCE(v_tier.point_multiplier, 1.0) * COALESCE(v_settings.double_points_multiplier, 2.0);
  ELSE
    v_is_double_day := false;
    v_multiplier := COALESCE(v_tier.point_multiplier, 1.0);
  END IF;

  -- Hitung perolehan poin: belanja bersih (setelah diskon) dibagi 10.000 dikali multiplier
  v_points_earned := FLOOR((GREATEST(p_subtotal - v_discount_amount, 0) / 10000.0) * v_multiplier);

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member.id,
    'member_name', v_member.name,
    'current_points', COALESCE(v_member.points, 0),
    'tier_name', COALESCE(v_tier.name, 'BRONZE'),
    'discount_percentage', COALESCE(v_tier.discount_percentage, 0),
    'min_purchase_amount', COALESCE(v_tier.min_purchase_amount, 0),
    'is_discount_applied', v_is_discount_applied,
    'discount_amount', v_discount_amount,
    'shortfall_to_discount', v_shortfall,
    'is_double_day', v_is_double_day,
    'base_multiplier', COALESCE(v_tier.point_multiplier, 1.0),
    'effective_multiplier', v_multiplier,
    'points_earned', v_points_earned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_member_transaction_benefit TO authenticated, anon, service_role;
