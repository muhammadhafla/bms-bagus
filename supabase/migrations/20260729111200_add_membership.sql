-- Migration: Tambah Fitur Membership & Tier
-- Date: 2026-07-29

-- 1. Buat Tabel member_tiers
CREATE TABLE IF NOT EXISTS public.member_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL UNIQUE,
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    point_multiplier NUMERIC(5,2) DEFAULT 1.0,
    min_points_required INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Tiers (Bronze, Silver, Gold)
INSERT INTO public.member_tiers (name, discount_percentage, point_multiplier) VALUES 
('BRONZE', 0, 1.0), 
('SILVER', 5, 1.5), 
('GOLD', 10, 2.0)
ON CONFLICT (name) DO NOTHING;

-- 2. Buat Tabel members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    points NUMERIC(12,2) DEFAULT 0,
    tier_id UUID REFERENCES public.member_tiers(id),
    prefer_digital_receipt BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Modifikasi Tabel penjualan (Menghapus legacy, menambah kolom member)
ALTER TABLE public.penjualan 
DROP COLUMN IF EXISTS inventory_id CASCADE,
DROP COLUMN IF EXISTS qty CASCADE,
DROP COLUMN IF EXISTS harga_jual CASCADE;

ALTER TABLE public.penjualan 
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS points_earned NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_redeemed NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_member_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS receipt_sent_via_wa BOOLEAN DEFAULT false;

-- 4. Trigger Penambahan Poin (AFTER INSERT penjualan)
CREATE OR REPLACE FUNCTION update_member_points()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.member_id IS NOT NULL THEN
        UPDATE public.members
        SET 
            points = points + COALESCE(NEW.points_earned, 0) - COALESCE(NEW.points_redeemed, 0),
            updated_at = NOW()
        WHERE id = NEW.member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_member_points ON public.penjualan;
CREATE TRIGGER trigger_update_member_points
AFTER INSERT ON public.penjualan
FOR EACH ROW
EXECUTE FUNCTION update_member_points();


-- 5. Trigger Pengurangan Poin (AFTER INSERT penjualan_return)
-- Jika transaksi di-retur, tarik kembali poin yang sudah masuk, dan kembalikan poin yang ditukar
CREATE OR REPLACE FUNCTION reverse_member_points_on_return()
RETURNS TRIGGER AS $$
DECLARE
    v_member_id UUID;
    v_earned NUMERIC;
    v_redeemed NUMERIC;
BEGIN
    -- Ambil data member dari transaksi asli
    SELECT member_id, points_earned, points_redeemed
    INTO v_member_id, v_earned, v_redeemed
    FROM public.penjualan
    WHERE id = NEW.penjualan_id;

    IF v_member_id IS NOT NULL THEN
        UPDATE public.members
        SET 
            -- Kurangi poin yang didapat, tambahkan poin yang dipakai
            points = points - COALESCE(v_earned, 0) + COALESCE(v_redeemed, 0),
            updated_at = NOW()
        WHERE id = v_member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reverse_member_points ON public.penjualan_return;
CREATE TRIGGER trigger_reverse_member_points
AFTER INSERT ON public.penjualan_return
FOR EACH ROW
EXECUTE FUNCTION reverse_member_points_on_return();
