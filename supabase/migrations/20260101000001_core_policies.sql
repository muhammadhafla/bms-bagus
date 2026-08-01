-- CORE POLICIES

-- Base Policies

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
CREATE POLICY "pembelian_select_admin" ON pembelian FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "pembelian_insert_admin" ON pembelian FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "pembelian_update_admin" ON pembelian FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "pembelian_delete_admin" ON pembelian FOR DELETE TO authenticated USING (is_admin());

-- ========== PEMBELIAN_ITEMS POLICIES ==========
CREATE POLICY "pembelian_items_select_admin" ON pembelian_items FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "pembelian_items_insert_admin" ON pembelian_items FOR INSERT TO authenticated WITH CHECK (is_admin());
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
CREATE POLICY "supplier_select_admin" ON supplier FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "supplier_insert_admin" ON supplier FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "supplier_update_admin" ON supplier FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "supplier_delete_admin" ON supplier FOR DELETE TO authenticated USING (is_admin());

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
CREATE POLICY "stock_opname_update_allow" ON stock_opname FOR UPDATE TO authenticated USING (is_admin() OR status='draft') WITH CHECK (is_admin() OR status IN ('draft', 'pending'));
CREATE POLICY "stock_opname_delete_allow" ON stock_opname FOR DELETE TO authenticated USING (is_admin() OR status='draft');

-- ========== STOCK_OPNAME_ITEMS POLICIES ==========
CREATE POLICY "stock_opname_items_select" ON stock_opname_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_opname_items_insert_allow" ON stock_opname_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM stock_opname WHERE id = stock_opname_items.stock_opname_id AND status = 'draft')
);
CREATE POLICY "stock_opname_items_update_allow" ON stock_opname_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM stock_opname so 
    WHERE so.id = stock_opname_items.stock_opname_id 
    AND (is_admin() OR so.status = 'draft'))
);
CREATE POLICY "stock_opname_items_delete_allow" ON stock_opname_items FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM stock_opname so 
    WHERE so.id = stock_opname_items.stock_opname_id 
    AND (is_admin() OR so.status = 'draft'))
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


-- POS Policies

-- ============================================

-- inventory RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_all_access" ON inventory;
CREATE POLICY "inventory_all_access" ON inventory
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- stock_movements RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_movements_all_access" ON stock_movements;
CREATE POLICY "stock_movements_all_access" ON stock_movements
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- penjualan RLS
ALTER TABLE penjualan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "penjualan_all_access" ON penjualan;
CREATE POLICY "penjualan_all_access" ON penjualan
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- penjualan_items RLS
ALTER TABLE penjualan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "penjualan_items_all_access" ON penjualan_items;
CREATE POLICY "penjualan_items_all_access" ON penjualan_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- penjualan_return RLS
ALTER TABLE penjualan_return ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "penjualan_return_all_access" ON penjualan_return;
CREATE POLICY "penjualan_return_all_access" ON penjualan_return
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- penjualan_return_items RLS
ALTER TABLE penjualan_return_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "penjualan_return_items_all_access" ON penjualan_return_items;
CREATE POLICY "penjualan_return_items_all_access" ON penjualan_return_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- kas_log RLS
ALTER TABLE kas_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kas_log_all_access" ON kas_log;
CREATE POLICY "kas_log_all_access" ON kas_log
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- receipt_templates RLS
ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipt_templates_all_access" ON receipt_templates;
CREATE POLICY "receipt_templates_all_access" ON receipt_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================

-- V3 Policies

ALTER TABLE public.shift_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for shift_sessions
CREATE POLICY "shift_sessions_select_policy" ON public.shift_sessions 
    FOR SELECT TO authenticated 
    USING (true);

CREATE POLICY "shift_sessions_insert_policy" ON public.shift_sessions 
    FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "shift_sessions_update_policy" ON public.shift_sessions 
    FOR UPDATE TO authenticated 
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_sessions TO service_role;

-- Label Policies
