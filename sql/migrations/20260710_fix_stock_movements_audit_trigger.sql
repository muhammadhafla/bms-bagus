-- Migration: Fix Stock Movements Constraint and Audit Trigger
-- Date: 2026-07-10
-- Description: Menambahkan 'ADJUSTMENT' pada check constraint stock_movements dan memperbaiki fungsi audit agar aman dijalankan di background/RPC.

-- 1. Perbaiki constraint tipe pada stock_movements agar mendukung tipe ADJUSTMENT dari stock opname
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_tipe_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_tipe_check CHECK (tipe = ANY (ARRAY['IN', 'OUT', 'ADJUSTMENT']));

-- 2. Perbaiki fungsi trigger audit agar fallback menggunakan user uuid kosong (atau system id) 
-- ketika auth.uid() mengembalikan null (contoh: dipanggil via Security Definer Function)
CREATE OR REPLACE FUNCTION public.set_audit_created_by_created_at()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      -- Gunakan auth.uid() jika ada session, jika null fallback ke UUID kosong/sistem
      NEW.created_by := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    END IF;
    NEW.created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
