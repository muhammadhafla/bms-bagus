-- ==========================================================
-- Migration: 20260901150000_multi_role_and_warehouse_rbac.sql
-- Description: Arsitektur Multi-Role, Smart Location Binding,
--              dan Pengamanan Modul Gudang & Pengeluaran Khusus
-- ==========================================================

-- 1. EXTEND PROFILES WITH MULTI-ROLE & DEFAULT GUDANG
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['kasir', 'staff_gudang'],
  ADD COLUMN IF NOT EXISTS default_gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_default_gudang ON public.profiles(default_gudang_id);
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON public.profiles USING GIN(roles);

-- 2. BACKFILL DATA USER EKSISTING
DO $$
DECLARE
    v_def_gudang_id UUID;
BEGIN
    SELECT id INTO v_def_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    IF v_def_gudang_id IS NULL THEN
        SELECT id INTO v_def_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Update Admin
    UPDATE public.profiles
    SET roles = ARRAY['admin']
    WHERE role = 'admin' AND (roles IS NULL OR roles = ARRAY['kasir', 'staff_gudang']);

    -- Update Staff eksisting
    UPDATE public.profiles
    SET roles = ARRAY['kasir', 'staff_gudang'],
        default_gudang_id = COALESCE(default_gudang_id, v_def_gudang_id)
    WHERE (role = 'staff' OR role IS NULL) AND (roles IS NULL OR roles = ARRAY['kasir', 'staff_gudang']);
END $$;

-- 3. TRIGGER SINKRONISASI KOLOM 'role' (BACKWARD COMPATIBILITY)
CREATE OR REPLACE FUNCTION public.sync_profile_role_column()
RETURNS TRIGGER AS $$
BEGIN
    IF 'admin' = ANY(NEW.roles) THEN
        NEW.role := 'admin';
    ELSIF 'staff' = ANY(NEW.roles) THEN
        NEW.role := 'staff';
    ELSE
        NEW.role := 'staff';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_role ON public.profiles;
CREATE TRIGGER trg_sync_profile_role
  BEFORE INSERT OR UPDATE OF roles ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_role_column();

-- 4. POSTGRES HELPER FUNCTIONS FOR MULTI-ROLE
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_has BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN p.role = p_role OR p_role = ANY(p.roles) OR ('admin' = ANY(p.roles) AND p_role <> 'none') THEN true 
        ELSE false 
    END
    INTO v_has
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_has, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_has BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN 'admin' = ANY(p.roles) OR p.role = 'admin' OR p.roles && p_roles THEN true 
        ELSE false 
    END
    INTO v_has
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_has, false);
END;
$$;

-- Perbarui is_admin() agar mendukung multi-role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_is_admin BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN p.role = 'admin' OR 'admin' = ANY(p.roles) THEN true 
        ELSE false 
    END
    INTO v_is_admin
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_is_admin, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_lead_warehouse()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN p.role = 'admin' OR 'admin' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles) THEN true 
        ELSE false 
    END
    INTO v_allowed
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_allowed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_finance_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN p.role = 'admin' OR 'admin' = ANY(p.roles) OR 'finance' = ANY(p.roles) THEN true 
        ELSE false 
    END
    INTO v_allowed
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN COALESCE(v_allowed, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_lead_warehouse() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_or_admin() TO authenticated;

-- 5. UPDATE SKEMA PENGELUARAN GUDANG
ALTER TABLE public.pengeluaran_gudang
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('DRAFT', 'APPROVED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_note TEXT;

CREATE INDEX IF NOT EXISTS idx_pengeluaran_gudang_status ON public.pengeluaran_gudang(status);

-- 6. RPC: EXECUTE / DRAFT PENGELUARAN GUDANG
CREATE OR REPLACE FUNCTION rpc.execute_pengeluaran_gudang(
    p_gudang_id UUID,
    p_tipe tipe_pengeluaran_gudang,
    p_catatan TEXT,
    p_items JSONB, -- Array of { inventory_id: UUID, qty: INT, harga_pokok?: NUMERIC, alasan?: TEXT }
    p_user UUID,
    p_auto_approve BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
AS $$
DECLARE
    v_pengeluaran_id UUID;
    v_nomor TEXT;
    v_item JSONB;
    v_inv_id UUID;
    v_qty INT;
    v_hpp NUMERIC;
    v_alasan TEXT;
    v_current_stock INT;
    v_total_nominal NUMERIC := 0;
    v_gudang_nama TEXT;
    v_is_lead BOOLEAN := false;
    v_status VARCHAR(20);
BEGIN
    -- Cek wewenang user untuk auto approval
    IF p_user IS NOT NULL THEN
        SELECT CASE 
            WHEN role = 'admin' OR 'admin' = ANY(roles) OR 'kepala_gudang' = ANY(roles) THEN true 
            ELSE false 
        END INTO v_is_lead
        FROM public.profiles
        WHERE id = p_user;
    END IF;

    IF p_auto_approve AND v_is_lead THEN
        v_status := 'APPROVED';
    ELSIF v_is_lead THEN
        v_status := 'APPROVED';
    ELSE
        v_status := 'DRAFT';
    END IF;

    v_nomor := public.generate_nomor_pengeluaran_gudang();
    SELECT nama INTO v_gudang_nama FROM public.gudang WHERE id = p_gudang_id;

    -- Insert Header
    INSERT INTO public.pengeluaran_gudang (
        nomor_dokumen,
        gudang_id,
        tipe,
        catatan,
        status,
        created_by,
        approved_by,
        approved_at,
        tanggal
    ) VALUES (
        v_nomor,
        p_gudang_id,
        p_tipe,
        p_catatan,
        v_status,
        p_user,
        CASE WHEN v_status = 'APPROVED' THEN p_user ELSE NULL END,
        CASE WHEN v_status = 'APPROVED' THEN now() ELSE NULL END,
        CURRENT_DATE
    ) RETURNING id INTO v_pengeluaran_id;

    -- Proses Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty := (v_item->>'qty')::INT;
        v_hpp := COALESCE((v_item->>'harga_pokok')::NUMERIC, 0);
        v_alasan := v_item->>'alasan';

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Qty pengeluaran harus > 0 untuk item %', v_inv_id;
        END IF;

        -- Validasi ketersediaan stok di gudang
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_inv_id AND gudang_id = p_gudang_id;

        IF v_current_stock IS NULL OR v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Stok di gudang tidak mencukupi untuk item %. Tersedia: %, Dikeluarkan: %',
                v_inv_id, COALESCE(v_current_stock, 0), v_qty;
        END IF;

        -- Insert item record
        INSERT INTO public.pengeluaran_gudang_items (
            pengeluaran_id,
            inventory_id,
            qty,
            harga_pokok,
            alasan
        ) VALUES (
            v_pengeluaran_id,
            v_inv_id,
            v_qty,
            v_hpp,
            v_alasan
        );

        -- JIKA APPROVED: Potong stok dan catat stock movements
        IF v_status = 'APPROVED' THEN
            UPDATE public.inventory_stocks
            SET stok = stok - v_qty,
                updated_at = now()
            WHERE inventory_id = v_inv_id AND gudang_id = p_gudang_id;

            INSERT INTO public.stock_movements (
                inventory_id,
                tipe,
                qty,
                referensi,
                gudang_id,
                created_at
            ) VALUES (
                v_inv_id,
                'PENGELUARAN_' || p_tipe::TEXT,
                -v_qty,
                'Pengeluaran ' || p_tipe::TEXT || ': ' || v_nomor,
                p_gudang_id,
                now()
            );

            v_total_nominal := v_total_nominal + (v_qty * v_hpp);
        END IF;
    END LOOP;

    -- JIKA APPROVED dan ada nilai nominal HPP: Catat ke buku besar
    IF v_status = 'APPROVED' AND v_total_nominal > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal,
            tipe_transaksi,
            sumber,
            referensi_id,
            keterangan,
            nominal,
            created_by,
            gudang_id
        ) VALUES (
            CURRENT_DATE,
            'PENGELUARAN',
            'BEBAN_SUSUT_GUDANG',
            v_pengeluaran_id,
            'Beban Susut Gudang (' || p_tipe::TEXT || ': ' || v_nomor || COALESCE(' - ' || v_gudang_nama, '') || ')',
            v_total_nominal,
            p_user,
            p_gudang_id
        );
    END IF;

    RETURN v_pengeluaran_id;
END;
$$;

-- 7. RPC: APPROVE PENGELUARAN GUDANG
CREATE OR REPLACE FUNCTION rpc.approve_pengeluaran_gudang(
    p_pengeluaran_id UUID,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
AS $$
DECLARE
    v_doc RECORD;
    v_item RECORD;
    v_current_stock INT;
    v_total_nominal NUMERIC := 0;
    v_gudang_nama TEXT;
    v_is_lead BOOLEAN := false;
BEGIN
    -- Validasi wewenang approval
    SELECT CASE 
        WHEN role = 'admin' OR 'admin' = ANY(roles) OR 'kepala_gudang' = ANY(roles) THEN true 
        ELSE false 
    END INTO v_is_lead
    FROM public.profiles
    WHERE id = p_user;

    IF NOT v_is_lead THEN
        RAISE EXCEPTION 'Hanya Admin atau Kepala Gudang yang berhak menyetujui pengeluaran barang';
    END IF;

    SELECT * INTO v_doc FROM public.pengeluaran_gudang WHERE id = p_pengeluaran_id;
    IF v_doc IS NULL THEN
        RAISE EXCEPTION 'Dokumen pengeluaran tidak ditemukan';
    END IF;

    IF v_doc.status <> 'DRAFT' THEN
        RAISE EXCEPTION 'Dokumen sudah diproses sebelumnya (Status: %)', v_doc.status;
    END IF;

    SELECT nama INTO v_gudang_nama FROM public.gudang WHERE id = v_doc.gudang_id;

    -- Loop item: Potong stok dan catat mutasi
    FOR v_item IN SELECT * FROM public.pengeluaran_gudang_items WHERE pengeluaran_id = p_pengeluaran_id
    LOOP
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_doc.gudang_id;

        IF v_current_stock IS NULL OR v_current_stock < v_item.qty THEN
            RAISE EXCEPTION 'Stok tidak mencukupi saat approval untuk item %. Tersedia: %, Diminta: %',
                v_item.inventory_id, COALESCE(v_current_stock, 0), v_item.qty;
        END IF;

        UPDATE public.inventory_stocks
        SET stok = stok - v_item.qty,
            updated_at = now()
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_doc.gudang_id;

        INSERT INTO public.stock_movements (
            inventory_id,
            tipe,
            qty,
            referensi,
            gudang_id,
            created_at
        ) VALUES (
            v_item.inventory_id,
            'PENGELUARAN_' || v_doc.tipe::TEXT,
            -v_item.qty,
            'Pengeluaran ' || v_doc.tipe::TEXT || ': ' || v_doc.nomor_dokumen,
            v_doc.gudang_id,
            now()
        );

        v_total_nominal := v_total_nominal + (v_item.qty * COALESCE(v_item.harga_pokok, 0));
    END LOOP;

    -- Catat beban buku besar jika ada nominal HPP
    IF v_total_nominal > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal,
            tipe_transaksi,
            sumber,
            referensi_id,
            keterangan,
            nominal,
            created_by,
            gudang_id
        ) VALUES (
            CURRENT_DATE,
            'PENGELUARAN',
            'BEBAN_SUSUT_GUDANG',
            v_doc.id,
            'Beban Susut Gudang (' || v_doc.tipe::TEXT || ': ' || v_doc.nomor_dokumen || COALESCE(' - ' || v_gudang_nama, '') || ')',
            v_total_nominal,
            p_user,
            v_doc.gudang_id
        );
    END IF;

    -- Update status
    UPDATE public.pengeluaran_gudang
    SET status = 'APPROVED',
        approved_by = p_user,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_pengeluaran_id;

    RETURN jsonb_build_object('success', true, 'status', 'APPROVED');
END;
$$;

-- 8. RPC: REJECT PENGELUARAN GUDANG
CREATE OR REPLACE FUNCTION rpc.reject_pengeluaran_gudang(
    p_pengeluaran_id UUID,
    p_note TEXT,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
AS $$
DECLARE
    v_is_lead BOOLEAN := false;
BEGIN
    SELECT CASE 
        WHEN role = 'admin' OR 'admin' = ANY(roles) OR 'kepala_gudang' = ANY(roles) THEN true 
        ELSE false 
    END INTO v_is_lead
    FROM public.profiles
    WHERE id = p_user;

    IF NOT v_is_lead THEN
        RAISE EXCEPTION 'Hanya Admin atau Kepala Gudang yang berhak menolak pengajuan pengeluaran';
    END IF;

    UPDATE public.pengeluaran_gudang
    SET status = 'REJECTED',
        rejected_note = p_note,
        approved_by = p_user,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_pengeluaran_id AND status = 'DRAFT';

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
END;
$$;

-- 9. RPC: UPDATE STOCK BIN & THRESHOLDS
CREATE OR REPLACE FUNCTION rpc.update_stock_bin(
    p_inventory_id UUID,
    p_gudang_id UUID,
    p_rak_lokasi TEXT,
    p_min_stok INT DEFAULT NULL,
    p_max_stok INT DEFAULT NULL
)
RETURNS public.inventory_stocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rpc
AS $$
DECLARE
    v_res public.inventory_stocks;
    v_is_lead BOOLEAN := false;
    v_current_min INT;
    v_current_max INT;
BEGIN
    SELECT CASE 
        WHEN role = 'admin' OR 'admin' = ANY(roles) OR 'kepala_gudang' = ANY(roles) THEN true 
        ELSE false 
    END INTO v_is_lead
    FROM public.profiles
    WHERE id = auth.uid();

    SELECT min_stok, max_stok INTO v_current_min, v_current_max
    FROM public.inventory_stocks
    WHERE inventory_id = p_inventory_id AND gudang_id = p_gudang_id;

    INSERT INTO public.inventory_stocks (
        inventory_id,
        gudang_id,
        rak_lokasi,
        min_stok,
        max_stok,
        updated_at
    ) VALUES (
        p_inventory_id,
        p_gudang_id,
        p_rak_lokasi,
        CASE WHEN v_is_lead THEN COALESCE(p_min_stok, 0) ELSE COALESCE(v_current_min, 0) END,
        CASE WHEN v_is_lead THEN p_max_stok ELSE v_current_max END,
        now()
    )
    ON CONFLICT (inventory_id, gudang_id)
    DO UPDATE SET 
        rak_lokasi = EXCLUDED.rak_lokasi,
        min_stok = CASE WHEN v_is_lead THEN EXCLUDED.min_stok ELSE public.inventory_stocks.min_stok END,
        max_stok = CASE WHEN v_is_lead THEN EXCLUDED.max_stok ELSE public.inventory_stocks.max_stok END,
        updated_at = now()
    RETURNING * INTO v_res;

    RETURN v_res;
END;
$$;

-- 10. REFRESH & HARDEN ROW LEVEL SECURITY (RLS)
-- inventory_stocks: Hanya admin yang boleh update langsung via query client; aksi staf lewat RPC
DROP POLICY IF EXISTS "inv_stocks_auth_update" ON public.inventory_stocks;
CREATE POLICY "inv_stocks_auth_update" ON public.inventory_stocks 
FOR UPDATE TO authenticated 
USING (is_admin()) 
WITH CHECK (is_admin());

-- transfer_stok: Delete / Cancel hanya untuk admin atau kepala gudang
DROP POLICY IF EXISTS "transfer_stok_all_auth" ON public.transfer_stok;
DROP POLICY IF EXISTS "transfer_stok_insert" ON public.transfer_stok;
CREATE POLICY "transfer_stok_insert" ON public.transfer_stok 
FOR INSERT TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "transfer_stok_update" ON public.transfer_stok;
CREATE POLICY "transfer_stok_update" ON public.transfer_stok 
FOR UPDATE TO authenticated 
USING (is_admin_or_lead_warehouse() OR created_by = auth.uid()) 
WITH CHECK (is_admin_or_lead_warehouse() OR created_by = auth.uid());

DROP POLICY IF EXISTS "transfer_stok_delete" ON public.transfer_stok;
CREATE POLICY "transfer_stok_delete" ON public.transfer_stok 
FOR DELETE TO authenticated 
USING (is_admin_or_lead_warehouse());

-- pengeluaran_gudang: Delete hanya untuk admin atau kepala gudang saat DRAFT
DROP POLICY IF EXISTS "pengeluaran_gudang_all_auth" ON public.pengeluaran_gudang;
DROP POLICY IF EXISTS "pengeluaran_gudang_insert" ON public.pengeluaran_gudang;
CREATE POLICY "pengeluaran_gudang_insert" ON public.pengeluaran_gudang 
FOR INSERT TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "pengeluaran_gudang_update" ON public.pengeluaran_gudang;
CREATE POLICY "pengeluaran_gudang_update" ON public.pengeluaran_gudang 
FOR UPDATE TO authenticated 
USING (is_admin_or_lead_warehouse() OR (created_by = auth.uid() AND status = 'DRAFT')) 
WITH CHECK (is_admin_or_lead_warehouse() OR (created_by = auth.uid() AND status = 'DRAFT'));

DROP POLICY IF EXISTS "pengeluaran_gudang_delete" ON public.pengeluaran_gudang;
CREATE POLICY "pengeluaran_gudang_delete" ON public.pengeluaran_gudang 
FOR DELETE TO authenticated 
USING (is_admin_or_lead_warehouse() AND status = 'DRAFT');
