-- ==============================================================================
-- MIGRATION: 20261102040247_kb_request_and_verify_otp_rpc.sql
-- DESKRIPSI: 
-- 1. Membuat tabel member_otp_sessions untuk menyimpan sesi kode OTP WhatsApp.
-- 2. Fungsi request_member_otp(): generate 6-digit OTP dan kirim antrean wa_outbox.
-- 3. Fungsi verify_member_otp(): verifikasi OTP dan auto-create profil member baru.
-- ==============================================================================

-- 1. Tabel member_otp_sessions
CREATE TABLE IF NOT EXISTS public.member_otp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.member_otp_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'member_otp_sessions' AND policyname = 'member_otp_sessions_allow_all'
    ) THEN
        CREATE POLICY member_otp_sessions_allow_all 
        ON public.member_otp_sessions 
        FOR ALL TO anon, authenticated 
        USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Fungsi Request OTP
CREATE OR REPLACE FUNCTION public.request_member_otp(p_phone TEXT)
RETURNS JSONB AS $$
DECLARE
  v_norm_phone TEXT;
  v_otp TEXT;
  v_expires_at TIMESTAMPTZ;
  v_wa_text TEXT;
BEGIN
  -- Normalisasi nomor telepon
  v_norm_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF v_norm_phone LIKE '08%' THEN
    v_norm_phone := '62' || substr(v_norm_phone, 2);
  ELSIF v_norm_phone LIKE '8%' THEN
    v_norm_phone := '62' || v_norm_phone;
  END IF;

  IF length(v_norm_phone) < 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nomor WhatsApp tidak valid (minimal 10 digit)');
  END IF;

  -- Generate 6 digit kode OTP acak
  v_otp := lpad(floor(random() * 900000 + 100000)::text, 6, '0');
  v_expires_at := NOW() + interval '5 minutes';

  -- Nonaktifkan sesi OTP lama untuk nomor ini
  UPDATE member_otp_sessions 
  SET expires_at = NOW() - interval '1 minute' 
  WHERE phone = v_norm_phone AND expires_at > NOW();

  -- Simpan sesi OTP baru
  INSERT INTO member_otp_sessions (phone, otp_code, attempts, expires_at)
  VALUES (v_norm_phone, v_otp, 0, v_expires_at);

  -- Masukkan ke antrean wa_outbox Toko Bagus dengan status pending
  v_wa_text := 'Halo Pelanggan Toko Bagus! 👋' || chr(10) || chr(10) ||
               'Kode OTP verifikasi aplikasi *Kawan Bagus* Anda adalah: *' || v_otp || '*' || chr(10) || chr(10) ||
               'Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun demi keamanan akun Anda.';

  INSERT INTO wa_outbox (phone, message, type, source, status)
  VALUES (v_norm_phone, v_wa_text, 'text', 'pos_cashier', 'pending');

  RETURN jsonb_build_object(
    'success', true,
    'phone', v_norm_phone,
    'message', 'Kode OTP telah dikirimkan ke WhatsApp Anda.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'Gagal memproses OTP: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fungsi Verify OTP
CREATE OR REPLACE FUNCTION public.verify_member_otp(
  p_phone TEXT,
  p_otp TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_norm_phone TEXT;
  v_clean_otp TEXT;
  v_session RECORD;
  v_member RECORD;
  v_tier RECORD;
  v_default_tier_id UUID;
  v_alt_phone TEXT;
BEGIN
  v_norm_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF v_norm_phone LIKE '08%' THEN
    v_norm_phone := '62' || substr(v_norm_phone, 2);
  ELSIF v_norm_phone LIKE '8%' THEN
    v_norm_phone := '62' || v_norm_phone;
  END IF;

  v_clean_otp := trim(p_otp);

  -- Cari sesi OTP aktif
  SELECT * INTO v_session
  FROM member_otp_sessions
  WHERE phone = v_norm_phone AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sesi OTP tidak ditemukan atau sudah kedaluwarsa.');
  END IF;

  IF v_session.attempts >= 4 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Batas percobaan terlampaui. Silakan minta kode baru.');
  END IF;

  IF v_session.otp_code <> v_clean_otp THEN
    UPDATE member_otp_sessions
    SET attempts = attempts + 1
    WHERE id = v_session.id;
    RETURN jsonb_build_object('success', false, 'message', 'Kode OTP salah. Silakan periksa kembali.');
  END IF;

  -- Nonaktifkan sesi OTP yang berhasil diverifikasi
  UPDATE member_otp_sessions 
  SET expires_at = NOW() - interval '1 minute' 
  WHERE id = v_session.id;

  -- Cari member yang ada
  v_alt_phone := CASE WHEN v_norm_phone LIKE '62%' THEN '0' || substr(v_norm_phone, 3) ELSE v_norm_phone END;
  SELECT * INTO v_member
  FROM members
  WHERE whatsapp_number = v_norm_phone OR whatsapp_number = v_alt_phone
  LIMIT 1;

  IF FOUND THEN
    -- Update nama jika ada nama baru dan nama lama masih default
    IF p_name IS NOT NULL AND trim(p_name) <> '' AND (v_member.name LIKE '%Pelanggan%' OR v_member.name = '') THEN
      UPDATE members
      SET name = trim(p_name), updated_at = NOW()
      WHERE id = v_member.id
      RETURNING * INTO v_member;
    END IF;
  ELSE
    -- Ambil default tier BRONZE
    SELECT id INTO v_default_tier_id
    FROM member_tiers
    WHERE lower(name) = 'bronze'
    LIMIT 1;

    IF v_default_tier_id IS NULL THEN
      v_default_tier_id := '41b0ce26-e90c-4b40-9eb4-c46efb18b0c0'::uuid;
    END IF;

    INSERT INTO members (whatsapp_number, name, points, tier_points, tier_id, prefer_digital_receipt)
    VALUES (
      v_norm_phone,
      COALESCE(NULLIF(trim(p_name), ''), 'Pelanggan Toko Bagus'),
      0,
      0,
      v_default_tier_id,
      true
    )
    RETURNING * INTO v_member;
  END IF;

  -- Ambil detail tier
  SELECT * INTO v_tier FROM member_tiers WHERE id = v_member.tier_id LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'member', jsonb_build_object(
      'id', v_member.id,
      'name', v_member.name,
      'whatsapp_number', v_member.whatsapp_number,
      'points', v_member.points,
      'tier_points', v_member.tier_points,
      'tier_id', v_member.tier_id,
      'tier_name', COALESCE(v_tier.name, 'BRONZE'),
      'discount_percentage', COALESCE(v_tier.discount_percentage, 0.0),
      'point_multiplier', COALESCE(v_tier.point_multiplier, 1.0),
      'prefer_digital_receipt', v_member.prefer_digital_receipt,
      'created_at', v_member.created_at,
      'updated_at', v_member.updated_at
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'Verifikasi gagal: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.request_member_otp(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_member_otp(TEXT, TEXT, TEXT) TO anon, authenticated;
