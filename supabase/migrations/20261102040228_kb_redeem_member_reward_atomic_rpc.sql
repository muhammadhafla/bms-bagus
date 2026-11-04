-- ==============================================================================
-- MIGRATION: 20261102040228_kb_redeem_member_reward_atomic_rpc.sql
-- DESKRIPSI: Fungsi RPC atomik untuk penukaran poin member menjadi voucher belanja.
-- Menggunakan locking FOR UPDATE pada baris member untuk mencegah race condition.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.redeem_member_reward_atomic(
  p_member_id UUID,
  p_reward_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_member RECORD;
  v_reward RECORD;
  v_new_points NUMERIC;
  v_voucher_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_voucher RECORD;
BEGIN
  -- 1. Kunci baris member dengan FOR UPDATE
  SELECT * INTO v_member
  FROM members
  WHERE id = p_member_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Data member tidak ditemukan.');
  END IF;

  -- 2. Ambil data reward aktif
  SELECT * INTO v_reward
  FROM point_rewards
  WHERE id = p_reward_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reward tidak tersedia atau sudah nonaktif.');
  END IF;

  -- 3. Cek kecukupan saldo poin
  IF v_member.points < v_reward.points_required THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Saldo poin Anda (' || v_member.points::int || ') belum mencukupi untuk reward ini (' || v_reward.points_required::int || ' poin).'
    );
  END IF;

  -- 4. Kurangi saldo poin
  v_new_points := v_member.points - v_reward.points_required;
  UPDATE members
  SET points = v_new_points, updated_at = NOW()
  WHERE id = p_member_id;

  -- 5. Buat kode voucher unik KB-XXXX-XXXX
  v_voucher_code := 'KB-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  v_expires_at := NOW() + (COALESCE(v_reward.valid_days, 30) || ' days')::interval;

  INSERT INTO member_vouchers (
    id_member, id_reward, voucher_code, title, discount_nominal, status, expires_at
  ) VALUES (
    p_member_id,
    p_reward_id,
    v_voucher_code,
    v_reward.title,
    COALESCE(v_reward.discount_nominal, 0.0),
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
      'status', v_voucher.status,
      'expires_at', v_voucher.expires_at,
      'created_at', v_voucher.created_at
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'Gagal menukarkan reward: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan izin akses eksekusi RPC untuk pengguna anon / authenticated
GRANT EXECUTE ON FUNCTION public.redeem_member_reward_atomic(UUID, UUID) TO anon, authenticated;
