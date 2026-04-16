-- Database Schema for Inventory Management System
-- Based on actual Supabase schema

-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  updated_by UUID REFERENCES profiles(id),
  is_discontinued BOOLEAN DEFAULT false,
  discontinued_at TIMESTAMP WITHOUT TIME ZONE,
  discontinued_by UUID REFERENCES profiles(id)
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
  tipe TEXT NOT NULL CHECK (tipe = ANY (ARRAY['IN', 'OUT', 'ADJUSTMENT'])),
  qty INTEGER CHECK (qty > 0),
  referensi TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Stock Opname Header
CREATE TABLE IF NOT EXISTS stock_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft', 'pending', 'approved', 'rejected', 'completed'])),
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Stock Opname Items (Detail Per Barang)
CREATE TABLE IF NOT EXISTS stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_opname_id UUID NOT NULL REFERENCES stock_opname(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  system_stock INTEGER NOT NULL,
  physical_stock INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason TEXT CHECK (reason = ANY (ARRAY['salah_input', 'rusak', 'hilang', 'kadaluarsa', 'salah_hitung', 'lainnya'])),
  note TEXT,
  adjusted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_opname_item_id UUID REFERENCES stock_opname_items(id),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  adjustment_qty INTEGER NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type = ANY (ARRAY['increase', 'decrease'])),
  reason TEXT NOT NULL,
  note TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'receipt_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE receipt_type AS ENUM ('SALE', 'RETURN');
  END IF;
END $$;
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
CREATE INDEX IF NOT EXISTS idx_stock_opname_date ON stock_opname(opname_date);
CREATE INDEX IF NOT EXISTS idx_stock_opname_status ON stock_opname(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname_id ON stock_opname_items(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_inventory_id ON stock_opname_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_inventory_id ON stock_adjustments(inventory_id);

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

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
BEGIN
  SELECT CASE WHEN p.role = 'admin' THEN true ELSE false END
  INTO v_is_admin
  FROM profiles p
  WHERE p.id = auth.uid();
  
  RETURN COALESCE(v_is_admin, false);
END;
$$;

REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Drop all existing policies first
DROP POLICY IF EXISTS "inventory anon select" ON inventory;
DROP POLICY IF EXISTS "inventory anon insert" ON inventory;
DROP POLICY IF EXISTS "inventory anon update" ON inventory;
DROP POLICY IF EXISTS "inventory anon delete" ON inventory;
DROP POLICY IF EXISTS "kategori anon select" ON kategori;
DROP POLICY IF EXISTS "kategori anon insert" ON kategori;
DROP POLICY IF EXISTS "kategori anon update" ON kategori;
DROP POLICY IF EXISTS "kategori anon delete" ON kategori;
DROP POLICY IF EXISTS "supplier anon select" ON supplier;
DROP POLICY IF EXISTS "supplier anon insert" ON supplier;
DROP POLICY IF EXISTS "supplier anon update" ON supplier;
DROP POLICY IF EXISTS "supplier anon delete" ON supplier;
DROP POLICY IF EXISTS "pembelian anon select" ON pembelian;
DROP POLICY IF EXISTS "pembelian anon insert" ON pembelian;
DROP POLICY IF EXISTS "pembelian anon update" ON pembelian;
DROP POLICY IF EXISTS "pembelian anon delete" ON pembelian;
DROP POLICY IF EXISTS "pembelian_items anon select" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items anon insert" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items anon update" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items anon delete" ON pembelian_items;
DROP POLICY IF EXISTS "penjualan anon select" ON penjualan;
DROP POLICY IF EXISTS "penjualan anon insert" ON penjualan;
DROP POLICY IF EXISTS "penjualan anon update" ON penjualan;
DROP POLICY IF EXISTS "penjualan anon delete" ON penjualan;
DROP POLICY IF EXISTS "penjualan_items anon select" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items anon insert" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items anon update" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items anon delete" ON penjualan_items;
DROP POLICY IF EXISTS "stock_movements anon select" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements anon insert" ON stock_movements;
DROP POLICY IF EXISTS "stock_opname all access" ON stock_opname;
DROP POLICY IF EXISTS "stock_opname_items all access" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_adjustments all access" ON stock_adjustments;
DROP POLICY IF EXISTS "inventory_barcodes anon select" ON inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes anon insert" ON inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes anon update" ON inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes anon delete" ON inventory_barcodes;

-- Drop new policy names (for re-runnable script)
DROP POLICY IF EXISTS "kategori_select" ON kategori;
DROP POLICY IF EXISTS "kategori_all_admin" ON kategori;
DROP POLICY IF EXISTS "inventory_select" ON inventory;
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
DROP POLICY IF EXISTS "inventory_update_admin" ON inventory;
DROP POLICY IF EXISTS "inventory_delete_admin" ON inventory;
DROP POLICY IF EXISTS "inventory_barcodes_anon_select" ON inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes_insert" ON inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes_update" ON inventory_barcodes;
DROP POLICY IF EXISTS "inventory_barcodes_delete" ON inventory_barcodes;
DROP POLICY IF EXISTS "pembelian_anon_select" ON pembelian;
DROP POLICY IF EXISTS "pembelian_select" ON pembelian;
DROP POLICY IF EXISTS "pembelian_insert_staff" ON pembelian;
DROP POLICY IF EXISTS "pembelian_update_admin" ON pembelian;
DROP POLICY IF EXISTS "pembelian_delete_admin" ON pembelian;
DROP POLICY IF EXISTS "pembelian_items_anon_select" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items_select" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items_insert_staff" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items_update_admin" ON pembelian_items;
DROP POLICY IF EXISTS "pembelian_items_delete_admin" ON pembelian_items;
DROP POLICY IF EXISTS "penjualan_anon_select" ON penjualan;
DROP POLICY IF EXISTS "penjualan_select" ON penjualan;
DROP POLICY IF EXISTS "penjualan_insert_staff" ON penjualan;
DROP POLICY IF EXISTS "penjualan_update_admin" ON penjualan;
DROP POLICY IF EXISTS "penjualan_delete_admin" ON penjualan;
DROP POLICY IF EXISTS "penjualan_items_anon_select" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_select" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_insert_staff" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_update_admin" ON penjualan_items;
DROP POLICY IF EXISTS "penjualan_items_delete_admin" ON penjualan_items;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_all_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "supplier_anon_select" ON supplier;
DROP POLICY IF EXISTS "supplier_select" ON supplier;
DROP POLICY IF EXISTS "supplier_all_admin" ON supplier;
DROP POLICY IF EXISTS "stock_movements_select" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert_service" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_update_none" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_delete_none" ON stock_movements;
DROP POLICY IF EXISTS "stock_opname_select" ON stock_opname;
DROP POLICY IF EXISTS "stock_opname_insert_draft" ON stock_opname;
DROP POLICY IF EXISTS "stock_opname_update_allow" ON stock_opname;
DROP POLICY IF EXISTS "stock_opname_delete_allow" ON stock_opname;
DROP POLICY IF EXISTS "stock_opname_items_select" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_opname_items_insert_allow" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_opname_items_update_allow" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_opname_items_delete_allow" ON stock_opname_items;
DROP POLICY IF EXISTS "stock_adjustments_select" ON stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_insert_admin" ON stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_update_none" ON stock_adjustments;
DROP POLICY IF EXISTS "stock_adjustments_delete_none" ON stock_adjustments;
DROP POLICY IF EXISTS "pembelian_return_select" ON pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_insert_staff" ON pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_update_admin" ON pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_delete_admin" ON pembelian_return;
DROP POLICY IF EXISTS "pembelian_return_items_select" ON pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_insert_staff" ON pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_update_admin" ON pembelian_return_items;
DROP POLICY IF EXISTS "pembelian_return_items_delete_admin" ON pembelian_return_items;
DROP POLICY IF EXISTS "penjualan_return_select" ON penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_insert_staff" ON penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_update_admin" ON penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_delete_admin" ON penjualan_return;
DROP POLICY IF EXISTS "penjualan_return_items_select" ON penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_insert_staff" ON penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_update_admin" ON penjualan_return_items;
DROP POLICY IF EXISTS "penjualan_return_items_delete_admin" ON penjualan_return_items;
DROP POLICY IF EXISTS "receipt_templates_select" ON receipt_templates;
DROP POLICY IF EXISTS "receipt_templates_insert_admin" ON receipt_templates;
DROP POLICY IF EXISTS "receipt_templates_update_admin" ON receipt_templates;
DROP POLICY IF EXISTS "receipt_templates_delete_admin" ON receipt_templates;

-- ========== KATEGORI POLICIES ==========
CREATE POLICY "kategori_select" ON kategori FOR SELECT TO authenticated USING (true);
CREATE POLICY "kategori_insert" ON kategori FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kategori_all_admin" ON kategori FOR ALL TO authenticated USING (is_admin());

-- ========== INVENTORY POLICIES ==========
CREATE POLICY "inventory_select" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "inventory_insert" ON inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inventory_update_allow_stock_purchase" ON inventory FOR UPDATE TO authenticated USING (true);
CREATE POLICY "inventory_delete_admin" ON inventory FOR DELETE TO authenticated USING (is_admin());

-- ========== INVENTORY_BARCODES POLICIES ==========
CREATE POLICY "inventory_barcodes_anon_select" ON inventory_barcodes FOR SELECT TO public USING (true);
CREATE POLICY "inventory_barcodes_insert" ON inventory_barcodes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inventory_barcodes_update" ON inventory_barcodes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "inventory_barcodes_delete" ON inventory_barcodes FOR DELETE TO authenticated USING (true);

-- ========== PEMBELIAN POLICIES ==========
CREATE POLICY "pembelian_anon_select" ON pembelian FOR SELECT TO public USING (true);
CREATE POLICY "pembelian_select" ON pembelian FOR SELECT TO authenticated USING (true);
CREATE POLICY "pembelian_insert_staff" ON pembelian FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pembelian_update_own_or_admin" ON pembelian FOR UPDATE TO authenticated USING (is_admin() OR created_by = auth.uid());
CREATE POLICY "pembelian_delete_admin" ON pembelian FOR DELETE TO authenticated USING (is_admin());

-- ========== PEMBELIAN_ITEMS POLICIES ==========
CREATE POLICY "pembelian_items_anon_select" ON pembelian_items FOR SELECT TO public USING (true);
CREATE POLICY "pembelian_items_select" ON pembelian_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "pembelian_items_insert_staff" ON pembelian_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pembelian_items_update_admin" ON pembelian_items FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "pembelian_items_delete_admin" ON pembelian_items FOR DELETE TO authenticated USING (is_admin());

-- ========== PENJUALAN POLICIES ==========
CREATE POLICY "penjualan_anon_select" ON penjualan FOR SELECT TO public USING (true);
CREATE POLICY "penjualan_select" ON penjualan FOR SELECT TO authenticated USING (true);
CREATE POLICY "penjualan_insert_staff" ON penjualan FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "penjualan_update_admin" ON penjualan FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "penjualan_delete_admin" ON penjualan FOR DELETE TO authenticated USING (is_admin());

-- ========== PENJUALAN_ITEMS POLICIES ==========
CREATE POLICY "penjualan_items_anon_select" ON penjualan_items FOR SELECT TO public USING (true);
CREATE POLICY "penjualan_items_select" ON penjualan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "penjualan_items_insert_staff" ON penjualan_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "penjualan_items_update_admin" ON penjualan_items FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "penjualan_items_delete_admin" ON penjualan_items FOR DELETE TO authenticated USING (is_admin());

-- ========== PROFILES POLICIES ==========
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_all_admin" ON profiles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- ========== SUPPLIER POLICIES ==========
CREATE POLICY "supplier_anon_select" ON supplier FOR SELECT TO public USING (true);
CREATE POLICY "supplier_select" ON supplier FOR SELECT TO authenticated USING (true);
CREATE POLICY "supplier_all_admin" ON supplier FOR ALL TO authenticated USING (is_admin());

-- ========== STOCK_MOVEMENTS POLICIES ==========
CREATE POLICY "stock_movements_select" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_movements_insert_service" ON stock_movements FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "stock_movements_insert_authenticated" ON stock_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stock_movements_update_none" ON stock_movements FOR UPDATE TO authenticated USING (false);
CREATE POLICY "stock_movements_delete_none" ON stock_movements FOR DELETE TO authenticated USING (false);

-- ========== STOCK_OPNAME POLICIES ==========
ALTER TABLE stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_opname_select" ON stock_opname FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_opname_insert_draft" ON stock_opname FOR INSERT TO authenticated WITH CHECK (status = 'draft');
CREATE POLICY "stock_opname_update_allow" ON stock_opname FOR UPDATE TO authenticated USING (is_admin() OR ((status='draft') AND (created_by = auth.uid())));
CREATE POLICY "stock_opname_delete_allow" ON stock_opname FOR DELETE TO authenticated USING (is_admin() OR ((status='draft') AND (created_by = auth.uid())));

-- ========== STOCK_OPNAME_ITEMS POLICIES ==========
CREATE POLICY "stock_opname_items_select" ON stock_opname_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_opname_items_insert_allow" ON stock_opname_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stock_opname WHERE id = stock_opname_items.stock_opname_id AND status = 'draft')
);
CREATE POLICY "stock_opname_items_update_allow" ON stock_opname_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stock_opname so 
    WHERE so.id = stock_opname_items.stock_opname_id 
    AND (is_admin() OR (so.status = 'draft' AND so.created_by = auth.uid())))
);
CREATE POLICY "stock_opname_items_delete_allow" ON stock_opname_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM stock_opname so 
    WHERE so.id = stock_opname_items.stock_opname_id 
    AND (is_admin() OR (so.status = 'draft' AND so.created_by = auth.uid())))
);

  -- ========== STOCK_ADJUSTMENTS POLICIES ==========
  CREATE POLICY "stock_adjustments_select" ON stock_adjustments FOR SELECT TO authenticated USING (true);
  CREATE POLICY "stock_adjustments_insert_admin" ON stock_adjustments FOR INSERT TO authenticated WITH CHECK (is_admin());
  CREATE POLICY "stock_adjustments_update_none" ON stock_adjustments FOR UPDATE TO authenticated USING (false);
  CREATE POLICY "stock_adjustments_delete_none" ON stock_adjustments FOR DELETE TO authenticated USING (false);
  
  -- ========== FUNCTION CLEANUP ==========
  DROP FUNCTION IF EXISTS tambah_pembelian_batch(jsonb, uuid, date, uuid);
  DROP FUNCTION IF EXISTS tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid);
  DROP FUNCTION IF EXISTS public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid);
  
  -- ========== PEMBELIAN_RETURN POLICIES ==========
ALTER TABLE pembelian_return ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembelian_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pembelian_return_select" ON pembelian_return FOR SELECT TO authenticated USING (true);
CREATE POLICY "pembelian_return_insert_staff" ON pembelian_return FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pembelian_return_update_admin" ON pembelian_return FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "pembelian_return_delete_admin" ON pembelian_return FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "pembelian_return_items_select" ON pembelian_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "pembelian_return_items_insert_staff" ON pembelian_return_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pembelian_return_items_update_admin" ON pembelian_return_items FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "pembelian_return_items_delete_admin" ON pembelian_return_items FOR DELETE TO authenticated USING (is_admin());

-- ========== PENJUALAN_RETURN POLICIES ==========
ALTER TABLE penjualan_return ENABLE ROW LEVEL SECURITY;
ALTER TABLE penjualan_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "penjualan_return_select" ON penjualan_return FOR SELECT TO authenticated USING (true);
CREATE POLICY "penjualan_return_insert_staff" ON penjualan_return FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "penjualan_return_update_admin" ON penjualan_return FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "penjualan_return_delete_admin" ON penjualan_return FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "penjualan_return_items_select" ON penjualan_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "penjualan_return_items_insert_staff" ON penjualan_return_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "penjualan_return_items_update_admin" ON penjualan_return_items FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "penjualan_return_items_delete_admin" ON penjualan_return_items FOR DELETE TO authenticated USING (is_admin());

-- ========== RECEIPT_TEMPLATES POLICIES ==========
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipt_templates_select" ON receipt_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "receipt_templates_insert_admin" ON receipt_templates FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "receipt_templates_update_admin" ON receipt_templates FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "receipt_templates_delete_admin" ON receipt_templates FOR DELETE TO authenticated USING (is_admin());

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