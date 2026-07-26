-- CORE REALTIME & SEED

-- Idempotent script to add print_jobs to supabase_realtime publication
ALTER TABLE print_jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'print_jobs'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs';
    END IF;
END
$$;

-- Seed Data

INSERT INTO kategori (nama) VALUES
('Umum'),
('Elektronik'),
('Makanan')
ON CONFLICT (nama) DO NOTHING;

INSERT INTO supplier (nama, kontak, alamat) VALUES
('PT. Sample Supplier', '021-12345678', 'Jl. Sample No. 1')
ON CONFLICT (nama) DO NOTHING;

INSERT INTO inventory (nama_barang, kode_barcode, harga_jual, stok, minimum_stock, unit, id_kategori) VALUES
('Sample Product 1', '123456789', 10000, 50, 10, 'pcs', (SELECT id FROM kategori WHERE nama = 'Umum' LIMIT 1)),
('Sample Product 2', '987654321', 15000, 30, 5, 'pcs', (SELECT id FROM kategori WHERE nama = 'Elektronik' LIMIT 1))
ON CONFLICT (nama_barang) DO NOTHING;

-- Create a default receipt template
INSERT INTO receipt_templates (name, type, template, is_active) VALUES
('Default Sale Template', 'SALE', '{"header": "TOKO SAMPLE\nJl. Sample No. 1\nTelp: 021-12345678\n\nSTRUK PENJUALAN\nTanggal: {tanggal}", "footer": "\nTotal: Rp {total}\n\nTerima Kasih\nAtas Kunjungan Anda"}', true),
('Default Return Template', 'RETURN', '{"header": "TOKO SAMPLE\nJl. Sample No. 1\nTelp: 021-12345678\n\nSTRUK RETURN\nTanggal: {tanggal}", "footer": "\nTotal Return: Rp {total}\n\nTerima Kasih"}', false)
ON CONFLICT DO NOTHING;

-- Allow NULL for supplier_id in purchases
ALTER TABLE pembelian ALTER COLUMN supplier_id DROP NOT NULL;

-- RPC Function: tambah_pembelian_batch
CREATE OR REPLACE FUNCTION tambah_pembelian_batch(
  p_items JSONB,
  p_supplier_id UUID,
  p_tanggal DATE,
  p_user UUID,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_harga_final NUMERIC;
BEGIN
  -- Validate input
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_pembelian_id
    FROM pembelian
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_pembelian_id IS NOT NULL THEN
      RETURN v_pembelian_id;
    END IF;
  END IF;

  -- Generate idempotency key if not provided
  IF p_idempotency_key IS NULL THEN
    p_idempotency_key := gen_random_uuid();
  END IF;

  INSERT INTO pembelian (
    supplier_id,
    tanggal,
    created_by,
    supplier_nama,
    idempotency_key
  )
  SELECT 
    p_supplier_id,
    p_tanggal,
    p_user,
    COALESCE((SELECT nama FROM supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
    p_idempotency_key
  RETURNING id INTO v_pembelian_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    IF v_inventory_id IS NOT NULL THEN
      -- Validate existing inventory update
      IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
        RAISE EXCEPTION 'harga tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;
      IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
        RAISE EXCEPTION 'qty harus > 0 untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;

      UPDATE inventory 
      SET 
        is_discontinued = false,
        discontinued_at = NULL,
        discontinued_by = NULL,
        updated_at = NOW(),
        updated_by = p_user
      WHERE id = v_inventory_id AND is_discontinued = true;
    END IF;

    IF v_inventory_id IS NULL THEN
      IF v_item->>'nama_barang' IS NULL OR TRIM(v_item->>'nama_barang') = '' THEN
        RAISE EXCEPTION 'nama_barang tidak boleh kosong';
      END IF;
      IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
        RAISE EXCEPTION 'harga tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;
      IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
        RAISE EXCEPTION 'qty harus > 0 untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;

      INSERT INTO inventory (
        nama_barang,
        slug,
        harga_beli_terakhir,
        harga_jual,
        created_by,
        stok
      )
      VALUES (
        v_item->>'nama_barang',
        LOWER(REPLACE(REPLACE(v_item->>'nama_barang', ' ', '-'), '_', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        (v_item->>'harga')::NUMERIC,
        ((v_item->>'harga')::NUMERIC * 1.2),
        p_user,
        0
      )
      RETURNING id INTO v_inventory_id;
    END IF;

    v_harga_beli := (v_item->>'harga')::NUMERIC;
    v_qty := (v_item->>'qty')::INTEGER;
    v_harga_final := v_harga_beli * v_qty;

    INSERT INTO pembelian_items (
      pembelian_id,
      inventory_id,
      nama_barang,
      qty,
      harga_beli,
      harga_final
    )
    VALUES (
      v_pembelian_id,
      v_inventory_id,
      v_item->>'nama_barang',
      v_qty,
      v_harga_beli,
      v_harga_final
    );

    UPDATE inventory 
    SET 
      stok = COALESCE(stok, 0) + v_qty,
      harga_beli_terakhir = v_harga_beli,
      updated_by = p_user,
      updated_at = NOW()
    WHERE id = v_inventory_id;

    INSERT INTO stock_movements (inventory_id, tipe, qty, referensi)
    VALUES (v_inventory_id, 'IN', v_qty, v_pembelian_id::TEXT);

    v_total_sistem := v_total_sistem + v_harga_final;
  END LOOP;

  UPDATE pembelian SET total_sistem = v_total_sistem WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$$;

GRANT EXECUTE ON FUNCTION tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid) TO authenticated;

-- ========== RESOLVE USERNAME RPC ==========
CREATE OR REPLACE FUNCTION resolve_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE username = p_username LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_username(TEXT) TO anon, authenticated;

-- ========== STORAGE POLICIES ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

-- ========== AUTHENTICATION TRIGGERS ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama, role)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1), 'user'),
    'staff'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Note: The following trigger is created in the auth schema automatically by Supabase
-- or needs to be executed via Supabase SQL editor:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
