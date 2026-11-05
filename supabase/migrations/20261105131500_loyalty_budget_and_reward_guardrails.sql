-- ==============================================================================
-- MIGRATION: 20261105131500_loyalty_budget_and_reward_guardrails.sql
-- DESKRIPSI: Sistem Pengendalian Anggaran Voucher & Pengaman Penukaran Poin
-- 1. Tabel loyalty_settings (Plafon Anggaran Bulanan & Aturan Penukaran)
-- 2. Kolom min_purchase_amount & max_claims_per_member di point_rewards & member_vouchers
-- 3. Update RPC atomik redeem_member_reward_atomic dengan Multi-Layer Budget Guardrails
-- 4. Inisialisasi Storage Bucket 'rewards' publik untuk upload foto banner reward
-- 5. Kebijakan RLS untuk Admin & Publik
-- ==============================================================================

-- 1. TABEL PENGATURAN LOYALITAS TOKO (loyalty_settings)
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    monthly_budget_cap NUMERIC(14,2) NOT NULL DEFAULT 3000000.00,
    max_active_vouchers_per_member INT NOT NULL DEFAULT 2,
    is_redemption_locked BOOLEAN NOT NULL DEFAULT false,
    point_to_idr_ratio NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed row default jika belum ada
INSERT INTO public.loyalty_settings (id, monthly_budget_cap, max_active_vouchers_per_member, is_redemption_locked)
VALUES ('default', 3000000.00, 2, false)
ON CONFLICT (id) DO NOTHING;

-- Aktifkan RLS loyalty_settings
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_settings' AND policyname = 'loyalty_settings_read_all'
    ) THEN
        CREATE POLICY loyalty_settings_read_all ON public.loyalty_settings FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'loyalty_settings' AND policyname = 'loyalty_settings_admin_all'
    ) THEN
        CREATE POLICY loyalty_settings_admin_all ON public.loyalty_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. TAMBAH KOLOM PENGAMAN PADA TABEL point_rewards & member_vouchers
ALTER TABLE public.point_rewards
    ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_claims_per_member INT DEFAULT 1;

ALTER TABLE public.member_vouchers
    ADD COLUMN IF NOT EXISTS min_purchase_amount NUMERIC(12,2) DEFAULT 0;

-- Kebijakan RLS Admin untuk point_rewards dan member_vouchers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'point_rewards' AND policyname = 'point_rewards_admin_manage'
    ) THEN
        CREATE POLICY point_rewards_admin_manage ON public.point_rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'member_vouchers' AND policyname = 'member_vouchers_admin_manage'
    ) THEN
        CREATE POLICY member_vouchers_admin_manage ON public.member_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 3. PERBARUI RPC ATOMIK redeem_member_reward_atomic DENGAN MULTI-LAYER BUDGET CONTROL
CREATE OR REPLACE FUNCTION public.redeem_member_reward_atomic(
  p_member_id UUID,
  p_reward_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_settings RECORD;
  v_member RECORD;
  v_reward RECORD;
  v_new_points NUMERIC;
  v_voucher_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_voucher RECORD;
  v_active_vouchers_count INT;
  v_claims_this_month INT;
  v_current_month_committed NUMERIC;
  v_reward_nominal NUMERIC;
BEGIN
  -- A. Ambil & Cek Pengaturan Loyalitas Global
  SELECT * INTO v_settings FROM public.loyalty_settings WHERE id = 'default';
  IF NOT FOUND THEN
    v_settings.monthly_budget_cap := 3000000.00;
    v_settings.max_active_vouchers_per_member := 2;
    v_settings.is_redemption_locked := false;
  END IF;

  -- 1. Cek apakah penukaran poin sedang dikunci darurat oleh admin
  IF v_settings.is_redemption_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Penukaran reward sementara dijeda untuk pemeliharaan sistem. Silakan coba kembali nanti.'
    );
  END IF;

  -- B. Kunci baris member dengan FOR UPDATE
  SELECT * INTO v_member
  FROM members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Data member tidak ditemukan.');
  END IF;

  -- C. Kunci baris reward dengan FOR UPDATE
  SELECT * INTO v_reward
  FROM point_rewards
  WHERE id = p_reward_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward tidak tersedia atau sudah nonaktif.');
  END IF;

  -- 2. Cek ketersediaan kuota stok reward
  IF COALESCE(v_reward.stock, 0) <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Maaf, kuota stok reward ini telah habis.'
    );
  END IF;

  -- 3. Cek kecukupan saldo poin member
  IF v_member.points < v_reward.points_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo poin Anda (' || v_member.points::int || ') belum mencukupi untuk reward ini (' || v_reward.points_required::int || ' poin).'
    );
  END IF;

  -- 4. Pengaman: Cek batas maksimal voucher aktif per member (cegah hoarding)
  SELECT COUNT(*) INTO v_active_vouchers_count
  FROM member_vouchers
  WHERE id_member = p_member_id
    AND status = 'active'
    AND expires_at > NOW();

  IF v_active_vouchers_count >= COALESCE(v_settings.max_active_vouchers_per_member, 2) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Anda masih memiliki ' || v_active_vouchers_count || ' voucher aktif. Gunakan voucher Anda di kasir terlebih dahulu sebelum menukar lagi ya!'
    );
  END IF;

  -- 5. Pengaman: Cek batas klaim reward yang sama oleh member di bulan berjalan
  IF COALESCE(v_reward.max_claims_per_member, 1) > 0 THEN
    SELECT COUNT(*) INTO v_claims_this_month
    FROM member_vouchers
    WHERE id_member = p_member_id
      AND id_reward = p_reward_id
      AND created_at >= date_trunc('month', NOW());

    IF v_claims_this_month >= v_reward.max_claims_per_member THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Anda telah mencapai batas maksimal penukaran untuk reward ini di periode bulan ini.'
      );
    END IF;
  END IF;

  -- 6. Pengaman Plafon Anggaran Toko (Dual Metric Committed Budget Cap)
  v_reward_nominal := COALESCE(v_reward.discount_nominal, 0.0);
  SELECT COALESCE(SUM(discount_nominal), 0) INTO v_current_month_committed
  FROM member_vouchers
  WHERE created_at >= date_trunc('month', NOW())
    AND status IN ('active', 'used');

  IF (v_current_month_committed + v_reward_nominal) > COALESCE(v_settings.monthly_budget_cap, 3000000.00) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Klaim reward bulan ini telah mencapai kuota anggaran maksimal toko. Nantikan pembukaan kuota periode berikutnya!'
    );
  END IF;

  -- 7. Eksekusi Pengurangan Saldo Poin Member
  v_new_points := v_member.points - v_reward.points_required;
  UPDATE members
  SET points = v_new_points, updated_at = NOW()
  WHERE id = p_member_id;

  -- 8. Eksekusi Pengurangan Stok Kuota Reward (Auto-Deduct Stock)
  UPDATE point_rewards
  SET stock = GREATEST(0, stock - 1),
      updated_at = NOW()
  WHERE id = p_reward_id;

  -- 9. Buat Kode Voucher Unik KB-XXXX-XXXX & Catat Minimal Belanja
  v_voucher_code := 'KB-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  v_expires_at := NOW() + (COALESCE(v_reward.valid_days, 30) || ' days')::interval;

  INSERT INTO member_vouchers (
    id_member,
    id_reward,
    voucher_code,
    title,
    discount_nominal,
    min_purchase_amount,
    status,
    expires_at
  ) VALUES (
    p_member_id,
    p_reward_id,
    v_voucher_code,
    v_reward.title,
    v_reward_nominal,
    COALESCE(v_reward.min_purchase_amount, 0.0),
    'active',
    v_expires_at
  )
  RETURNING * INTO v_voucher;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Berhasil menukarkan ' || v_reward.points_required::int || ' poin!',
    'new_points', v_new_points,
    'voucher', jsonb_build_object(
      'id', v_voucher.id,
      'id_member', v_voucher.id_member,
      'id_reward', v_voucher.id_reward,
      'voucher_code', v_voucher.voucher_code,
      'title', v_voucher.title,
      'discount_nominal', v_voucher.discount_nominal,
      'min_purchase_amount', v_voucher.min_purchase_amount,
      'status', v_voucher.status,
      'expires_at', v_voucher.expires_at,
      'created_at', v_voucher.created_at
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'Gagal menukarkan reward: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.redeem_member_reward_atomic(UUID, UUID) TO anon, authenticated;

-- 4. BUCKET STORAGE UNTUK FOTO/BANNER REWARD (rewards)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rewards', 'rewards', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'rewards_public_select'
    ) THEN
        CREATE POLICY rewards_public_select ON storage.objects
        FOR SELECT USING (bucket_id = 'rewards');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'rewards_admin_insert'
    ) THEN
        CREATE POLICY rewards_admin_insert ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'rewards');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'rewards_admin_update'
    ) THEN
        CREATE POLICY rewards_admin_update ON storage.objects
        FOR UPDATE USING (bucket_id = 'rewards');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'rewards_admin_delete'
    ) THEN
        CREATE POLICY rewards_admin_delete ON storage.objects
        FOR DELETE USING (bucket_id = 'rewards');
    END IF;
END $$;
