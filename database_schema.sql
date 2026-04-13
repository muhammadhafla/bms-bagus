-- Database Schema for Inventory Management System
-- Based on actual Supabase schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (for users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  nama TEXT,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Kategori table
CREATE TABLE IF NOT EXISTS kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Supplier table
CREATE TABLE IF NOT EXISTS supplier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT UNIQUE,
  kontak TEXT,
  alamat TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_barang TEXT UNIQUE,
  slug TEXT UNIQUE,
  kode_barcode TEXT,
  harga_beli_terakhir NUMERIC,
  harga_jual NUMERIC NOT NULL,
  stok INTEGER DEFAULT 0,
  id_kategori UUID REFERENCES kategori(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  minimum_stock INTEGER,
  unit TEXT DEFAULT 'pcs',
  diskon NUMERIC DEFAULT 0,
  updated_by UUID REFERENCES profiles(id)
);

-- Pembelian (Purchase) transactions
CREATE TABLE IF NOT EXISTS pembelian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES supplier(id),
  tanggal DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  supplier_nama TEXT,
  total_sistem NUMERIC,
  total_supplier NUMERIC,
  note TEXT,
  nomor_nota TEXT,
  idempotency_key UUID UNIQUE
);

-- Pembelian items
CREATE TABLE IF NOT EXISTS pembelian_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pembelian_id UUID NOT NULL REFERENCES pembelian(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  nama_barang TEXT NOT NULL,
  qty INTEGER NOT NULL,
  harga_beli NUMERIC NOT NULL,
  diskon NUMERIC,
  harga_final NUMERIC NOT NULL
);

-- Penjualan (Sales) - individual sales records
CREATE TABLE IF NOT EXISTS penjualan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id),
  qty INTEGER NOT NULL,
  harga_jual NUMERIC NOT NULL,
  tanggal DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  total NUMERIC DEFAULT 0
);

-- Penjualan items
CREATE TABLE IF NOT EXISTS penjualan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penjualan_id UUID NOT NULL REFERENCES penjualan(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  nama_barang TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  harga_jual NUMERIC NOT NULL CHECK (harga_jual >= 0),
  diskon NUMERIC DEFAULT 0 CHECK (diskon >= 0),
  harga_final NUMERIC NOT NULL CHECK (harga_final >= 0),
  cost_at_sale NUMERIC NOT NULL CHECK (cost_at_sale >= 0),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Stock movements for reporting
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  tipe TEXT NOT NULL CHECK (tipe = ANY (ARRAY['IN', 'OUT'])),
  qty INTEGER CHECK (qty > 0),
  referensi TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inventory barcodes
CREATE TABLE IF NOT EXISTS inventory_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES inventory(id),
  barcode TEXT UNIQUE,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Pembelian return transactions
CREATE TABLE IF NOT EXISTS pembelian_return (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pembelian_id UUID REFERENCES pembelian(id),
  supplier_id UUID NOT NULL REFERENCES supplier(id),
  supplier_nama TEXT NOT NULL,
  tanggal DATE NOT NULL,
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  idempotency_key UUID UNIQUE
);

-- Pembelian return items
CREATE TABLE IF NOT EXISTS pembelian_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pembelian_return_id UUID NOT NULL REFERENCES pembelian_return(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  nama_barang TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  harga_beli NUMERIC NOT NULL CHECK (harga_beli >= 0),
  diskon NUMERIC DEFAULT 0 CHECK (diskon >= 0),
  harga_final NUMERIC NOT NULL CHECK (harga_final >= 0),
  pembelian_item_id UUID REFERENCES pembelian_items(id)
);

-- Penjualan return transactions
CREATE TABLE IF NOT EXISTS penjualan_return (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penjualan_id UUID NOT NULL REFERENCES penjualan(id),
  tanggal DATE NOT NULL,
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  idempotency_key UUID UNIQUE
);

-- Penjualan return items
CREATE TABLE IF NOT EXISTS penjualan_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penjualan_return_id UUID NOT NULL REFERENCES penjualan_return(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  nama_barang TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  harga_jual NUMERIC NOT NULL CHECK (harga_jual >= 0),
  diskon NUMERIC DEFAULT 0 CHECK (diskon >= 0),
  harga_final NUMERIC NOT NULL CHECK (harga_final >= 0),
  cost_at_sale NUMERIC NOT NULL CHECK (cost_at_sale >= 0),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  penjualan_item_id UUID REFERENCES penjualan_items(id)
);

-- Receipt templates
CREATE TYPE receipt_type AS ENUM ('SALE', 'RETURN');
CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type receipt_type NOT NULL,
  template JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_nama_barang ON inventory(nama_barang);
CREATE INDEX IF NOT EXISTS idx_inventory_kode_barcode ON inventory(kode_barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_slug ON inventory(slug);
CREATE INDEX IF NOT EXISTS idx_pembelian_tanggal ON pembelian(tanggal);
CREATE INDEX IF NOT EXISTS idx_penjualan_tanggal ON penjualan(tanggal);
CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_id ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_barcodes_barcode ON inventory_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_barcodes_inventory_id ON inventory_barcodes(inventory_id);

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembelian ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembelian_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_barcodes ENABLE ROW LEVEL SECURITY;

-- Allow anon key to insert inventory (for development/testing)
-- For production, use authenticated users or service role
CREATE POLICY "inventory anon insert" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "inventory anon update" ON inventory FOR UPDATE USING (true);
CREATE POLICY "inventory anon delete" ON inventory FOR DELETE USING (true);

-- Allow anon key for kategori
CREATE POLICY "kategori anon insert" ON kategori FOR INSERT WITH CHECK (true);
CREATE POLICY "kategori anon update" ON kategori FOR UPDATE USING (true);
CREATE POLICY "kategori anon delete" ON kategori FOR DELETE USING (true);

-- Allow anon key for supplier
CREATE POLICY "supplier anon insert" ON supplier FOR INSERT WITH CHECK (true);
CREATE POLICY "supplier anon update" ON supplier FOR UPDATE USING (true);
CREATE POLICY "supplier anon delete" ON supplier FOR DELETE USING (true);

-- Allow anon key for pembelian
CREATE POLICY "pembelian anon insert" ON pembelian FOR INSERT WITH CHECK (true);
CREATE POLICY "pembelian anon update" ON pembelian FOR UPDATE USING (true);
CREATE POLICY "pembelian anon delete" ON pembelian FOR DELETE USING (true);

-- Allow anon key for pembelian_items
CREATE POLICY "pembelian_items anon insert" ON pembelian_items FOR INSERT WITH CHECK (true);
CREATE POLICY "pembelian_items anon update" ON pembelian_items FOR UPDATE USING (true);
CREATE POLICY "pembelian_items anon delete" ON pembelian_items FOR DELETE USING (true);

-- Allow anon key for penjualan
CREATE POLICY "penjualan anon insert" ON penjualan FOR INSERT WITH CHECK (true);
CREATE POLICY "penjualan anon update" ON penjualan FOR UPDATE USING (true);
CREATE POLICY "penjualan anon delete" ON penjualan FOR DELETE USING (true);

-- Allow anon key for penjualan_items
CREATE POLICY "penjualan_items anon insert" ON penjualan_items FOR INSERT WITH CHECK (true);
CREATE POLICY "penjualan_items anon update" ON penjualan_items FOR UPDATE USING (true);
CREATE POLICY "penjualan_items anon delete" ON penjualan_items FOR DELETE USING (true);

-- Allow anon key for stock_movements insert
CREATE POLICY "stock_movements anon insert" ON stock_movements FOR INSERT WITH CHECK (true);

-- Allow anon key for inventory_barcodes
CREATE POLICY "inventory_barcodes anon insert" ON inventory_barcodes FOR INSERT WITH CHECK (true);
CREATE POLICY "inventory_barcodes anon update" ON inventory_barcodes FOR UPDATE USING (true);
CREATE POLICY "inventory_barcodes anon delete" ON inventory_barcodes FOR DELETE USING (true);

-- Insert some sample data
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
  p_user UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
BEGIN
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
    gen_random_uuid()
  RETURNING id INTO v_pembelian_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    IF v_inventory_id IS NULL THEN
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

    DECLARE
      v_harga_beli NUMERIC := (v_item->>'harga')::NUMERIC;
      v_qty INTEGER := (v_item->>'qty')::INTEGER;
      v_harga_final NUMERIC := v_harga_beli * v_qty;
    BEGIN
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
    END;
  END LOOP;

  UPDATE pembelian SET total_sistem = v_total_sistem WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$$;