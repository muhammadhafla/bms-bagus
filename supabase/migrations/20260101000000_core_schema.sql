-- CORE SCHEMA

-- Database Schema for Inventory Management System
-- Based on actual Supabase schema

-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (for users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  nama TEXT,
  email TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
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


-- BMS POS Database Setup Script
-- Run this in Supabase SQL Editor
-- Version: 1.0
-- Date: 2026-04-21


-- 1. CREATE kas_log TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS kas_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipe TEXT NOT NULL, -- 'SETOR', 'TARIK', 'JUAL', 'RETURN', 'BUKA_LACI'
    jumlah NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'CASH',
    referensi_id UUID,
    catatan TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'SALE',
    template TEXT NOT NULL, -- JSON string representation
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to penjualan_return_items if not exist
ALTER TABLE IF EXISTS penjualan_return_items ADD COLUMN IF NOT EXISTS penjualan_item_id UUID;

-- Add columns to stock_movements if not exist
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS qty INT;
ALTER TABLE IF EXISTS stock_movements ADD COLUMN IF NOT EXISTS referensi TEXT;

-- ============================================
-- 2. ADD COLUMNS TO penjualan TABLE
-- ============================================
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH';
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS diskon_nominal NUMERIC DEFAULT 0;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS diskon_persen NUMERIC DEFAULT 0;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS subtotal_sebelum_diskon NUMERIC;

-- Split payment support
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS cash_amount NUMERIC DEFAULT 0;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS qris_amount NUMERIC DEFAULT 0;
ALTER TABLE penjualan ADD COLUMN IF NOT EXISTS kembalian NUMERIC DEFAULT 0;

-- ============================================
-- 3. CREATE INDEXES
-- ============================================
-- Inventory search indexes
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(kode_barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_nama ON inventory USING gin(nama_barang gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_stok ON inventory(stok) WHERE stok > 0;

-- Penjualan queries indexes
CREATE INDEX IF NOT EXISTS idx_penjualan_created_by ON penjualan(created_by);
CREATE INDEX IF NOT EXISTS idx_penjualan_tanggal ON penjualan(tanggal);
CREATE INDEX IF NOT EXISTS idx_penjualan_status ON penjualan(status);

-- Kasir reports indexes
CREATE INDEX IF NOT EXISTS idx_kas_log_created_by ON kas_log(created_by);
CREATE INDEX IF NOT EXISTS idx_kas_log_tanggal ON kas_log(created_at);

-- ============================================

-- BMS POS Migration V2 - Atomic Transaction RPC
-- Run this in Supabase SQL Editor or via apply_migration MCP tool

-- Add idempotency_key column if not exists
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS idempotency_key UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_penjualan_idempotency 
    ON public.penjualan(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add payment_method to kas_log if not exists
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH';


-- Migration V3: Add shift_sessions table
CREATE TABLE IF NOT EXISTS public.shift_sessions (
    id UUID PRIMARY KEY,
    kasir_id UUID NOT NULL,
    kasir_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    opening_cash NUMERIC NOT NULL DEFAULT 0,
    closing_cash NUMERIC,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Migration: Tambahkan kolom voided_at pada tabel pembelian_return_items
-- Tanggal: 2026-04-16

ALTER TABLE public.pembelian_return_items
ADD COLUMN IF NOT EXISTS voided_at timestamptz;

CREATE INDEX IF NOT EXISTS pembelian_return_items_voided_at_idx
ON public.pembelian_return_items(voided_at);

CREATE POLICY "pembelian_return_items_void_update_all_auth" 
ON public.pembelian_return_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


CREATE OR REPLACE FUNCTION public.void_pembelian_return_item(
  p_pembelian_return_item_id uuid,
  p_note text DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS TABLE(void_return_item_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_inventory_id uuid;
  v_qty int;
  v_now timestamptz := now();
  v_already_voided boolean;
BEGIN
  SELECT pri.inventory_id, pri.qty,
         (pri.voided_at IS NOT NULL) AS already_voided
  INTO v_inventory_id, v_qty, v_already_voided
  FROM public.pembelian_return_items pri
  WHERE pri.id = p_pembelian_return_item_id
  FOR UPDATE;

  IF v_inventory_id IS NULL THEN
    RAISE EXCEPTION 'pembelian_return_items % tidak ditemukan', p_pembelian_return_item_id;
  END IF;

  IF v_already_voided THEN
    RETURN QUERY SELECT p_pembelian_return_item_id;
    RETURN;
  END IF;

  -- lock inventory row agar stok update atomic
  PERFORM 1
  FROM public.inventory
  WHERE id = v_inventory_id
  FOR UPDATE;

  UPDATE public.pembelian_return_items
  SET voided_at = v_now
  WHERE id = p_pembelian_return_item_id;

  -- koreksi stok: void -> tambah balik qty
  UPDATE public.inventory
  SET stok = stok + v_qty,
      updated_at = v_now,
      updated_by = p_created_by
  WHERE id = v_inventory_id;

  INSERT INTO public.stock_movements (
    inventory_id,
    tipe,
    qty,
    referensi,
    created_at
  ) VALUES (
    v_inventory_id,
    'IN',
    v_qty,
    'VOID_RETURN_ITEM:' || p_pembelian_return_item_id::text,
    v_now
  );

  RETURN QUERY SELECT p_pembelian_return_item_id;
END;
$$;
-- Migration: add_label_printing_module
-- Description: Adds tables for label templates and print jobs

-- Master: Label Templates
CREATE TABLE IF NOT EXISTS label_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    language VARCHAR NOT NULL CHECK (language IN ('TSPL', 'ZPL', 'ESC-POS')),
    content_json JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operational: Print Jobs
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES label_templates(id) NOT NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Printing', 'Done', 'Failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    printed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS (Row Level Security) if not already enabled (assuming standard Supabase setup)
ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage templates and print jobs
-- (Adjust these policies according to your app's specific role requirements)
CREATE POLICY "Allow authenticated users to read label templates" 
ON label_templates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert label templates" 
ON label_templates FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update label templates" 
ON label_templates FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete label templates" 
ON label_templates FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to read print jobs" 
ON print_jobs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert print jobs" 
ON print_jobs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update print jobs" 
ON print_jobs FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete print jobs" 
ON print_jobs FOR DELETE 
TO authenticated 
USING (true);

-- Migration: Add last_sign_in_at to profiles table

ALTER TABLE profiles
ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;

-- Alignment script to guarantee exactly the live schema

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.inventory ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS nama_barang text;
ALTER TABLE public.inventory ALTER COLUMN nama_barang SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN nama_barang DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.inventory ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN slug DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS kode_barcode text;
ALTER TABLE public.inventory ALTER COLUMN kode_barcode SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN kode_barcode DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS harga_beli_terakhir numeric;
ALTER TABLE public.inventory ALTER COLUMN harga_beli_terakhir DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN harga_beli_terakhir DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS harga_jual numeric;
ALTER TABLE public.inventory ALTER COLUMN harga_jual SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN harga_jual DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS stok integer;
ALTER TABLE public.inventory ALTER COLUMN stok DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN stok SET DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS id_kategori uuid;
ALTER TABLE public.inventory ALTER COLUMN id_kategori DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN id_kategori DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.inventory ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.inventory ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone;
ALTER TABLE public.inventory ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS minimum_stock integer;
ALTER TABLE public.inventory ALTER COLUMN minimum_stock DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN minimum_stock DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE public.inventory ALTER COLUMN unit DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN unit SET DEFAULT 'pcs'::text;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS diskon numeric;
ALTER TABLE public.inventory ALTER COLUMN diskon DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN diskon SET DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.inventory ALTER COLUMN updated_by DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN updated_by DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS is_discontinued boolean;
ALTER TABLE public.inventory ALTER COLUMN is_discontinued DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN is_discontinued SET DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS discontinued_at timestamp without time zone;
ALTER TABLE public.inventory ALTER COLUMN discontinued_at DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN discontinued_at DROP DEFAULT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS discontinued_by uuid;
ALTER TABLE public.inventory ALTER COLUMN discontinued_by DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN discontinued_by DROP DEFAULT;
ALTER TABLE public.inventory_barcodes ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.inventory_barcodes ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.inventory_barcodes ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.inventory_barcodes ALTER COLUMN inventory_id DROP NOT NULL;
ALTER TABLE public.inventory_barcodes ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.inventory_barcodes ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE public.inventory_barcodes ALTER COLUMN barcode SET NOT NULL;
ALTER TABLE public.inventory_barcodes ALTER COLUMN barcode DROP DEFAULT;
ALTER TABLE public.inventory_barcodes ADD COLUMN IF NOT EXISTS is_primary boolean;
ALTER TABLE public.inventory_barcodes ALTER COLUMN is_primary DROP NOT NULL;
ALTER TABLE public.inventory_barcodes ALTER COLUMN is_primary SET DEFAULT true;
ALTER TABLE public.inventory_barcodes ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.inventory_barcodes ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.inventory_barcodes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.kas_log ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS tipe text;
ALTER TABLE public.kas_log ALTER COLUMN tipe SET NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN tipe DROP DEFAULT;
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS jumlah numeric;
ALTER TABLE public.kas_log ALTER COLUMN jumlah SET NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN jumlah DROP DEFAULT;
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS referensi_id uuid;
ALTER TABLE public.kas_log ALTER COLUMN referensi_id DROP NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN referensi_id DROP DEFAULT;
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS catatan text;
ALTER TABLE public.kas_log ALTER COLUMN catatan DROP NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN catatan DROP DEFAULT;
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.kas_log ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.kas_log ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.kas_log ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.kas_log ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE public.kas_log ALTER COLUMN payment_method SET DEFAULT 'CASH'::text;
ALTER TABLE public.kategori ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.kategori ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.kategori ADD COLUMN IF NOT EXISTS nama text;
ALTER TABLE public.kategori ALTER COLUMN nama SET NOT NULL;
ALTER TABLE public.kategori ALTER COLUMN nama DROP DEFAULT;
ALTER TABLE public.kategori ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.kategori ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.kategori ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.label_templates ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS name character varying;
ALTER TABLE public.label_templates ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.label_templates ALTER COLUMN name DROP DEFAULT;
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS language character varying;
ALTER TABLE public.label_templates ALTER COLUMN language SET NOT NULL;
ALTER TABLE public.label_templates ALTER COLUMN language DROP DEFAULT;
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS content_json jsonb;
ALTER TABLE public.label_templates ALTER COLUMN content_json SET NOT NULL;
ALTER TABLE public.label_templates ALTER COLUMN content_json DROP DEFAULT;
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS active boolean;
ALTER TABLE public.label_templates ALTER COLUMN active DROP NOT NULL;
ALTER TABLE public.label_templates ALTER COLUMN active SET DEFAULT true;
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.label_templates ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.label_templates ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.pembelian ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE public.pembelian ALTER COLUMN supplier_id DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN supplier_id DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS tanggal date;
ALTER TABLE public.pembelian ALTER COLUMN tanggal SET NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN tanggal DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.pembelian ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.pembelian ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS supplier_nama text;
ALTER TABLE public.pembelian ALTER COLUMN supplier_nama DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN supplier_nama DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS total_sistem numeric;
ALTER TABLE public.pembelian ALTER COLUMN total_sistem DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN total_sistem DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS total_supplier numeric;
ALTER TABLE public.pembelian ALTER COLUMN total_supplier DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN total_supplier DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.pembelian ALTER COLUMN note DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS nomor_nota text;
ALTER TABLE public.pembelian ALTER COLUMN nomor_nota DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN nomor_nota DROP DEFAULT;
ALTER TABLE public.pembelian ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.pembelian ALTER COLUMN idempotency_key DROP NOT NULL;
ALTER TABLE public.pembelian ALTER COLUMN idempotency_key DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.pembelian_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS pembelian_id uuid;
ALTER TABLE public.pembelian_items ALTER COLUMN pembelian_id SET NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN pembelian_id DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.pembelian_items ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS nama_barang text;
ALTER TABLE public.pembelian_items ALTER COLUMN nama_barang SET NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN nama_barang DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.pembelian_items ALTER COLUMN qty SET NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN qty DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS harga_beli numeric;
ALTER TABLE public.pembelian_items ALTER COLUMN harga_beli SET NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN harga_beli DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS diskon numeric;
ALTER TABLE public.pembelian_items ALTER COLUMN diskon DROP NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN diskon DROP DEFAULT;
ALTER TABLE public.pembelian_items ADD COLUMN IF NOT EXISTS harga_final numeric;
ALTER TABLE public.pembelian_items ALTER COLUMN harga_final SET NOT NULL;
ALTER TABLE public.pembelian_items ALTER COLUMN harga_final DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.pembelian_return ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS pembelian_id uuid;
ALTER TABLE public.pembelian_return ALTER COLUMN pembelian_id DROP NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN pembelian_id DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS supplier_id uuid;
ALTER TABLE public.pembelian_return ALTER COLUMN supplier_id SET NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN supplier_id DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS supplier_nama text;
ALTER TABLE public.pembelian_return ALTER COLUMN supplier_nama SET NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN supplier_nama DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS tanggal date;
ALTER TABLE public.pembelian_return ALTER COLUMN tanggal SET NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN tanggal DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.pembelian_return ALTER COLUMN note DROP NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.pembelian_return ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.pembelian_return ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.pembelian_return ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.pembelian_return ALTER COLUMN idempotency_key DROP NOT NULL;
ALTER TABLE public.pembelian_return ALTER COLUMN idempotency_key DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.pembelian_return_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS pembelian_return_id uuid;
ALTER TABLE public.pembelian_return_items ALTER COLUMN pembelian_return_id SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN pembelian_return_id DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.pembelian_return_items ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS nama_barang text;
ALTER TABLE public.pembelian_return_items ALTER COLUMN nama_barang SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN nama_barang DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.pembelian_return_items ALTER COLUMN qty SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN qty DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS harga_beli numeric;
ALTER TABLE public.pembelian_return_items ALTER COLUMN harga_beli SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN harga_beli DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS diskon numeric;
ALTER TABLE public.pembelian_return_items ALTER COLUMN diskon SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN diskon SET DEFAULT 0;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS harga_final numeric;
ALTER TABLE public.pembelian_return_items ALTER COLUMN harga_final SET NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN harga_final DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS pembelian_item_id uuid;
ALTER TABLE public.pembelian_return_items ALTER COLUMN pembelian_item_id DROP NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN pembelian_item_id DROP DEFAULT;
ALTER TABLE public.pembelian_return_items ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone;
ALTER TABLE public.pembelian_return_items ALTER COLUMN voided_at DROP NOT NULL;
ALTER TABLE public.pembelian_return_items ALTER COLUMN voided_at DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.penjualan ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.penjualan ALTER COLUMN inventory_id DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.penjualan ALTER COLUMN qty DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN qty DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS harga_jual numeric;
ALTER TABLE public.penjualan ALTER COLUMN harga_jual DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN harga_jual DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS tanggal date;
ALTER TABLE public.penjualan ALTER COLUMN tanggal SET NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN tanggal DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.penjualan ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.penjualan ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.penjualan ALTER COLUMN total SET NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN total SET DEFAULT 0;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.penjualan ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN status SET DEFAULT 'draft'::text;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;
ALTER TABLE public.penjualan ALTER COLUMN paid_at DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN paid_at DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone;
ALTER TABLE public.penjualan ALTER COLUMN voided_at DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN voided_at DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;
ALTER TABLE public.penjualan ALTER COLUMN refunded_at DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN refunded_at DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.penjualan ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN payment_method SET DEFAULT 'CASH'::text;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS diskon_nominal numeric;
ALTER TABLE public.penjualan ALTER COLUMN diskon_nominal DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN diskon_nominal SET DEFAULT 0;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS diskon_persen numeric;
ALTER TABLE public.penjualan ALTER COLUMN diskon_persen DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN diskon_persen SET DEFAULT 0;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS subtotal_sebelum_diskon numeric;
ALTER TABLE public.penjualan ALTER COLUMN subtotal_sebelum_diskon DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN subtotal_sebelum_diskon DROP DEFAULT;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS cash_amount numeric;
ALTER TABLE public.penjualan ALTER COLUMN cash_amount DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN cash_amount SET DEFAULT 0;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS qris_amount numeric;
ALTER TABLE public.penjualan ALTER COLUMN qris_amount DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN qris_amount SET DEFAULT 0;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS kembalian numeric;
ALTER TABLE public.penjualan ALTER COLUMN kembalian DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN kembalian SET DEFAULT 0;
ALTER TABLE public.penjualan ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.penjualan ALTER COLUMN idempotency_key DROP NOT NULL;
ALTER TABLE public.penjualan ALTER COLUMN idempotency_key DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.penjualan_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS penjualan_id uuid;
ALTER TABLE public.penjualan_items ALTER COLUMN penjualan_id SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN penjualan_id DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.penjualan_items ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS nama_barang text;
ALTER TABLE public.penjualan_items ALTER COLUMN nama_barang SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN nama_barang DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.penjualan_items ALTER COLUMN qty SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN qty DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS harga_jual numeric;
ALTER TABLE public.penjualan_items ALTER COLUMN harga_jual SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN harga_jual DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS diskon numeric;
ALTER TABLE public.penjualan_items ALTER COLUMN diskon SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN diskon SET DEFAULT 0;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS harga_final numeric;
ALTER TABLE public.penjualan_items ALTER COLUMN harga_final SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN harga_final DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS cost_at_sale numeric;
ALTER TABLE public.penjualan_items ALTER COLUMN cost_at_sale SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN cost_at_sale DROP DEFAULT;
ALTER TABLE public.penjualan_items ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.penjualan_items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.penjualan_items ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.penjualan_return ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS penjualan_id uuid;
ALTER TABLE public.penjualan_return ALTER COLUMN penjualan_id SET NOT NULL;
ALTER TABLE public.penjualan_return ALTER COLUMN penjualan_id DROP DEFAULT;
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS tanggal date;
ALTER TABLE public.penjualan_return ALTER COLUMN tanggal SET NOT NULL;
ALTER TABLE public.penjualan_return ALTER COLUMN tanggal DROP DEFAULT;
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.penjualan_return ALTER COLUMN note DROP NOT NULL;
ALTER TABLE public.penjualan_return ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.penjualan_return ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.penjualan_return ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.penjualan_return ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.penjualan_return ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.penjualan_return ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.penjualan_return ALTER COLUMN idempotency_key DROP NOT NULL;
ALTER TABLE public.penjualan_return ALTER COLUMN idempotency_key DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.penjualan_return_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS penjualan_return_id uuid;
ALTER TABLE public.penjualan_return_items ALTER COLUMN penjualan_return_id SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN penjualan_return_id DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.penjualan_return_items ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS nama_barang text;
ALTER TABLE public.penjualan_return_items ALTER COLUMN nama_barang SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN nama_barang DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.penjualan_return_items ALTER COLUMN qty SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN qty DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS harga_jual numeric;
ALTER TABLE public.penjualan_return_items ALTER COLUMN harga_jual SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN harga_jual DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS diskon numeric;
ALTER TABLE public.penjualan_return_items ALTER COLUMN diskon SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN diskon SET DEFAULT 0;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS harga_final numeric;
ALTER TABLE public.penjualan_return_items ALTER COLUMN harga_final SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN harga_final DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS cost_at_sale numeric;
ALTER TABLE public.penjualan_return_items ALTER COLUMN cost_at_sale SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN cost_at_sale DROP DEFAULT;
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.penjualan_return_items ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.penjualan_return_items ADD COLUMN IF NOT EXISTS penjualan_item_id uuid;
ALTER TABLE public.penjualan_return_items ALTER COLUMN penjualan_item_id DROP NOT NULL;
ALTER TABLE public.penjualan_return_items ALTER COLUMN penjualan_item_id DROP DEFAULT;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.print_jobs ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS template_id uuid;
ALTER TABLE public.print_jobs ALTER COLUMN template_id SET NOT NULL;
ALTER TABLE public.print_jobs ALTER COLUMN template_id DROP DEFAULT;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS payload_json jsonb;
ALTER TABLE public.print_jobs ALTER COLUMN payload_json SET NOT NULL;
ALTER TABLE public.print_jobs ALTER COLUMN payload_json DROP DEFAULT;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS status character varying;
ALTER TABLE public.print_jobs ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.print_jobs ALTER COLUMN status SET DEFAULT 'Pending'::character varying;
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.print_jobs ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.print_jobs ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS printed_at timestamp with time zone;
ALTER TABLE public.print_jobs ALTER COLUMN printed_at DROP NOT NULL;
ALTER TABLE public.print_jobs ALTER COLUMN printed_at DROP DEFAULT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nama text;
ALTER TABLE public.profiles ALTER COLUMN nama DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN nama DROP DEFAULT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'staff'::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.profiles ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN username DROP DEFAULT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ALTER COLUMN avatar_url DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN avatar_url DROP DEFAULT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN email DROP DEFAULT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone;
ALTER TABLE public.profiles ALTER COLUMN last_sign_in_at DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_sign_in_at DROP DEFAULT;
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.receipt_templates ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.receipt_templates ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.receipt_templates ALTER COLUMN name DROP DEFAULT;
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS type USER-DEFINED;
ALTER TABLE public.receipt_templates ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.receipt_templates ALTER COLUMN type DROP DEFAULT;
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS template jsonb;
ALTER TABLE public.receipt_templates ALTER COLUMN template SET NOT NULL;
ALTER TABLE public.receipt_templates ALTER COLUMN template DROP DEFAULT;
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS is_active boolean;
ALTER TABLE public.receipt_templates ALTER COLUMN is_active DROP NOT NULL;
ALTER TABLE public.receipt_templates ALTER COLUMN is_active SET DEFAULT false;
ALTER TABLE public.receipt_templates ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.receipt_templates ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.receipt_templates ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.shift_sessions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS kasir_id uuid;
ALTER TABLE public.shift_sessions ALTER COLUMN kasir_id SET NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN kasir_id DROP DEFAULT;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS kasir_name text;
ALTER TABLE public.shift_sessions ALTER COLUMN kasir_name SET NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN kasir_name DROP DEFAULT;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
ALTER TABLE public.shift_sessions ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN start_time DROP DEFAULT;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
ALTER TABLE public.shift_sessions ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN end_time DROP DEFAULT;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS opening_cash numeric;
ALTER TABLE public.shift_sessions ALTER COLUMN opening_cash SET NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN opening_cash SET DEFAULT 0;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS closing_cash numeric;
ALTER TABLE public.shift_sessions ALTER COLUMN closing_cash DROP NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN closing_cash DROP DEFAULT;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.shift_sessions ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN status SET DEFAULT 'OPEN'::text;
ALTER TABLE public.shift_sessions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.shift_sessions ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.shift_sessions ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.stock_adjustments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS stock_opname_item_id uuid;
ALTER TABLE public.stock_adjustments ALTER COLUMN stock_opname_item_id DROP NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN stock_opname_item_id DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.stock_adjustments ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_qty integer;
ALTER TABLE public.stock_adjustments ALTER COLUMN adjustment_qty SET NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN adjustment_qty DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS adjustment_type text;
ALTER TABLE public.stock_adjustments ALTER COLUMN adjustment_type SET NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN adjustment_type DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.stock_adjustments ALTER COLUMN reason SET NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN reason DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.stock_adjustments ALTER COLUMN note DROP NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.stock_adjustments ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.stock_adjustments ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.stock_adjustments ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.stock_adjustments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.stock_movements ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.stock_movements ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.stock_movements ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tipe text;
ALTER TABLE public.stock_movements ALTER COLUMN tipe SET NOT NULL;
ALTER TABLE public.stock_movements ALTER COLUMN tipe DROP DEFAULT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.stock_movements ALTER COLUMN qty DROP NOT NULL;
ALTER TABLE public.stock_movements ALTER COLUMN qty DROP DEFAULT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS referensi text;
ALTER TABLE public.stock_movements ALTER COLUMN referensi DROP NOT NULL;
ALTER TABLE public.stock_movements ALTER COLUMN referensi DROP DEFAULT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.stock_movements ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.stock_movements ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.stock_opname ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS opname_date date;
ALTER TABLE public.stock_opname ALTER COLUMN opname_date SET NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN opname_date DROP DEFAULT;
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.stock_opname ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN status SET DEFAULT 'draft'::text;
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.stock_opname ALTER COLUMN note DROP NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.stock_opname ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.stock_opname ALTER COLUMN approved_by DROP NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN approved_by DROP DEFAULT;
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.stock_opname ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.stock_opname ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone;
ALTER TABLE public.stock_opname ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.stock_opname ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.stock_opname_items ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS stock_opname_id uuid;
ALTER TABLE public.stock_opname_items ALTER COLUMN stock_opname_id SET NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN stock_opname_id DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS inventory_id uuid;
ALTER TABLE public.stock_opname_items ALTER COLUMN inventory_id SET NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN inventory_id DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS system_stock integer;
ALTER TABLE public.stock_opname_items ALTER COLUMN system_stock SET NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN system_stock DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS physical_stock integer;
ALTER TABLE public.stock_opname_items ALTER COLUMN physical_stock SET NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN physical_stock DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS difference integer;
ALTER TABLE public.stock_opname_items ALTER COLUMN difference SET NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN difference DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.stock_opname_items ALTER COLUMN reason DROP NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN reason DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.stock_opname_items ALTER COLUMN note DROP NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS adjusted boolean;
ALTER TABLE public.stock_opname_items ALTER COLUMN adjusted DROP NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN adjusted SET DEFAULT false;
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.stock_opname_items ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.stock_opname_items ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone;
ALTER TABLE public.stock_opname_items ALTER COLUMN updated_at DROP NOT NULL;
ALTER TABLE public.stock_opname_items ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.supplier ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.supplier ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.supplier ADD COLUMN IF NOT EXISTS nama text;
ALTER TABLE public.supplier ALTER COLUMN nama SET NOT NULL;
ALTER TABLE public.supplier ALTER COLUMN nama DROP DEFAULT;
ALTER TABLE public.supplier ADD COLUMN IF NOT EXISTS kontak text;
ALTER TABLE public.supplier ALTER COLUMN kontak DROP NOT NULL;
ALTER TABLE public.supplier ALTER COLUMN kontak DROP DEFAULT;
ALTER TABLE public.supplier ADD COLUMN IF NOT EXISTS alamat text;
ALTER TABLE public.supplier ALTER COLUMN alamat DROP NOT NULL;
ALTER TABLE public.supplier ALTER COLUMN alamat DROP DEFAULT;
ALTER TABLE public.supplier ADD COLUMN IF NOT EXISTS created_at timestamp without time zone;
ALTER TABLE public.supplier ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE public.supplier ALTER COLUMN created_at SET DEFAULT now();

