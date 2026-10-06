-- =============================================================================
-- Migration: 20261006154500_comprehensive_security_and_robustness_fixes.sql
-- Purpose:
--   1. Apply pending warehouse & POS auth RBAC/RLS rules (kepala_cabang support)
--   2. Drop duplicate triggers on payroll_mutasi & deduplicate buku_besar
--   3. Fix 6 broken SQL functions referencing dropped/wrong columns & tables
--   4. Create atomic create_transfer_stok_batch & record transfer/outbound selisih
--   5. Align HR/Payroll & Finance RPCs + RLS with is_finance_or_admin()
--   6. Create SQL aggregation RPCs (get_kas_summary, get_warehouse_stock_summary)
--   7. Add 19 missing FK indexes, drop 3 duplicate indexes, optimize RLS InitPlan
--   8. Lock search_path on all public functions & revoke anon EXECUTE on SECURITY DEFINER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HELPER FUNCTION & RLS TRANSFER STOK / POS AUTHORIZATIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_default_gudang()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_gudang_id UUID;
BEGIN
    SELECT p.default_gudang_id
    INTO v_gudang_id
    FROM public.profiles p
    WHERE p.id = auth.uid();

    RETURN v_gudang_id;
END;
$$;

DROP POLICY IF EXISTS "transfer_stok_select" ON public.transfer_stok;
CREATE POLICY "transfer_stok_select" ON public.transfer_stok
FOR SELECT TO authenticated
USING (
    public.is_admin() OR
    gudang_asal_id = public.get_auth_user_default_gudang() OR
    gudang_tujuan_id = public.get_auth_user_default_gudang()
);

DROP POLICY IF EXISTS "transfer_stok_update" ON public.transfer_stok;
CREATE POLICY "transfer_stok_update" ON public.transfer_stok
FOR UPDATE TO authenticated
USING (public.is_admin_or_lead_warehouse() OR (created_by = (SELECT auth.uid())))
WITH CHECK (public.is_admin_or_lead_warehouse() OR (created_by = (SELECT auth.uid())));

DROP POLICY IF EXISTS "transfer_items_select" ON public.transfer_stok_items;
DROP POLICY IF EXISTS "transfer_items_all_auth" ON public.transfer_stok_items;
CREATE POLICY "transfer_items_select" ON public.transfer_stok_items
FOR SELECT TO authenticated
USING (
    public.is_admin() OR
    EXISTS (
        SELECT 1 FROM public.transfer_stok ts
        WHERE ts.id = transfer_stok_items.transfer_id
        AND (
            ts.gudang_asal_id = public.get_auth_user_default_gudang() OR
            ts.gudang_tujuan_id = public.get_auth_user_default_gudang()
        )
    )
);

CREATE POLICY "transfer_items_write_auth" ON public.transfer_stok_items
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "transfer_items_update_auth" ON public.transfer_stok_items
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "transfer_items_delete_auth" ON public.transfer_stok_items
FOR DELETE TO authenticated
USING (public.is_admin_or_lead_warehouse());

-- POS Authorizations RLS (hapus policy duplikat Kepala Gudang, gunakan (SELECT auth.uid()))
DROP POLICY IF EXISTS "Admin and Kepala Gudang can view pos authorizations" ON public.pos_authorizations;
DROP POLICY IF EXISTS "Admin and Kepala Cabang can view pos authorizations" ON public.pos_authorizations;
CREATE POLICY "Admin and Kepala Cabang can view pos authorizations"
    ON public.pos_authorizations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                'admin' = ANY(p.roles)
                OR (
                    ('kepala_cabang' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
                    AND (public.pos_authorizations.gudang_id IS NULL OR public.pos_authorizations.gudang_id = p.default_gudang_id)
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admin and Kepala Gudang can update pos authorizations" ON public.pos_authorizations;
DROP POLICY IF EXISTS "Admin and Kepala Cabang can update pos authorizations" ON public.pos_authorizations;
CREATE POLICY "Admin and Kepala Cabang can update pos authorizations"
    ON public.pos_authorizations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = (SELECT auth.uid())
            AND (
                'admin' = ANY(p.roles)
                OR (
                    ('kepala_cabang' = ANY(p.roles) OR 'kepala_gudang' = ANY(p.roles))
                    AND (public.pos_authorizations.gudang_id IS NULL OR public.pos_authorizations.gudang_id = p.default_gudang_id)
                )
            )
        )
    );

-- Perbarui RPC POS Authorizations untuk mendukung kepala_cabang & SET search_path = public
CREATE OR REPLACE FUNCTION public.claim_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_roles TEXT[];
    v_user_gudang_id UUID;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Admin')
    INTO v_user_roles, v_user_gudang_id, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    v_is_authorized := ('admin' = ANY(v_user_roles))
        OR ('kepala_cabang' = ANY(v_user_roles))
        OR ('kepala_gudang' = ANY(v_user_roles));

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak berwenang menarik permohonan ini');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id
    FOR UPDATE;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF v_req.status != 'pending' OR v_req.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan sudah tidak aktif atau kedaluwarsa');
    END IF;

    IF NOT ('admin' = ANY(v_user_roles)) THEN
        IF v_req.gudang_id IS NOT NULL AND v_user_gudang_id IS NOT NULL AND v_req.gudang_id != v_user_gudang_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Anda hanya dapat menangani permohonan dari cabang Anda');
        END IF;
    END IF;

    UPDATE public.pos_authorizations
    SET claimed_by_id = v_user_id,
        claimed_by_name = v_user_name,
        claimed_at = now(),
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object(
        'success', true,
        'pin_code', v_req.pin_code,
        'claimed_by_name', v_user_name,
        'message', 'Permintaan berhasil ditarik'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.takeover_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_roles TEXT[];
    v_user_gudang_id UUID;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Admin')
    INTO v_user_roles, v_user_gudang_id, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    v_is_authorized := ('admin' = ANY(v_user_roles))
        OR ('kepala_cabang' = ANY(v_user_roles))
        OR ('kepala_gudang' = ANY(v_user_roles));

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak berwenang mengambil alih permohonan ini');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id
    FOR UPDATE;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF v_req.status != 'pending' OR v_req.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan sudah tidak aktif atau kedaluwarsa');
    END IF;

    IF NOT ('admin' = ANY(v_user_roles)) THEN
        IF v_req.gudang_id IS NOT NULL AND v_user_gudang_id IS NOT NULL AND v_req.gudang_id != v_user_gudang_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Anda hanya dapat mengambil alih permohonan dari cabang Anda');
        END IF;
    END IF;

    UPDATE public.pos_authorizations
    SET claimed_by_id = v_user_id,
        claimed_by_name = v_user_name,
        claimed_at = now(),
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object(
        'success', true,
        'pin_code', v_req.pin_code,
        'claimed_by_name', v_user_name,
        'message', 'Tugas permohonan berhasil diambil alih'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_pos_authorization(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_name TEXT;
    v_user_roles TEXT[];
    v_user_gudang_id UUID;
    v_is_authorized BOOLEAN;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Admin')
    INTO v_user_roles, v_user_gudang_id, v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    v_is_authorized := ('admin' = ANY(v_user_roles))
        OR ('kepala_cabang' = ANY(v_user_roles))
        OR ('kepala_gudang' = ANY(v_user_roles));

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Anda tidak memiliki hak untuk menolak permohonan ini');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id
    FOR UPDATE;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF NOT ('admin' = ANY(v_user_roles)) THEN
        IF v_req.gudang_id IS NOT NULL AND v_user_gudang_id IS NOT NULL AND v_req.gudang_id != v_user_gudang_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Anda hanya dapat menolak permohonan dari cabang Anda');
        END IF;
    END IF;

    UPDATE public.pos_authorizations
    SET status = 'rejected',
        rejected_by_id = v_user_id,
        rejected_by_name = v_user_name,
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'message', 'Permohonan otorisasi berhasil ditolak');
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. HAPUS TRIGGER DUPLIKAT PAYROLL_MUTASI & DEDUP BUKU_BESAR
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_kasbon_approved_mutasi ON public.payroll_mutasi;
DROP FUNCTION IF EXISTS public.trigger_kasbon_approved_to_ledger();

DROP TRIGGER IF EXISTS on_mutasi_pencairan_approved ON public.payroll_mutasi;
DROP FUNCTION IF EXISTS public.trg_pencairan_to_ledger();

DELETE FROM public.buku_besar a
USING public.buku_besar b
WHERE a.id > b.id
  AND a.referensi_id IS NOT NULL
  AND a.referensi_id = b.referensi_id
  AND a.sumber = b.sumber
  AND a.sumber IN ('KASBON', 'GAJI');

-- -----------------------------------------------------------------------------
-- 3. PERBAIKI 6 FUNGSI SQL YANG MERUJUK KOLOM/TABEL SALAH
-- -----------------------------------------------------------------------------

-- 3a. update_stock_bin
CREATE OR REPLACE FUNCTION public.update_stock_bin(
    p_inventory_id UUID,
    p_gudang_id UUID,
    p_rak_lokasi TEXT,
    p_min_stok INTEGER DEFAULT NULL,
    p_max_stok INTEGER DEFAULT NULL
)
RETURNS public.inventory_stocks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res public.inventory_stocks;
    v_is_lead BOOLEAN := false;
    v_current_min INT;
    v_current_max INT;
BEGIN
    v_is_lead := public.is_admin_or_lead_warehouse();

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

-- 3b. Hapus overload 5-arg lama execute_pengeluaran_gudang & perbaiki 6-arg
DROP FUNCTION IF EXISTS public.execute_pengeluaran_gudang(UUID, tipe_pengeluaran_gudang, TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION public.execute_pengeluaran_gudang(
    p_gudang_id UUID,
    p_tipe tipe_pengeluaran_gudang,
    p_catatan TEXT,
    p_items JSONB,
    p_user UUID,
    p_auto_approve BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
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
    v_user_gudang UUID;
    v_status VARCHAR(20);
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi';
    END IF;

    v_is_lead := public.is_admin_or_lead_warehouse();
    v_user_gudang := public.get_auth_user_default_gudang();

    -- Isolasi cabang untuk non-admin
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND p_gudang_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Anda hanya dapat membuat dokumen pengeluaran untuk gudang tugas Anda.';
    END IF;

    IF p_auto_approve AND v_is_lead THEN
        v_status := 'APPROVED';
    ELSE
        v_status := 'DRAFT';
    END IF;

    v_nomor := public.generate_nomor_pengeluaran_gudang();
    SELECT nama INTO v_gudang_nama FROM public.gudang WHERE id = p_gudang_id;

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
        v_caller,
        CASE WHEN v_status = 'APPROVED' THEN v_caller ELSE NULL END,
        CASE WHEN v_status = 'APPROVED' THEN now() ELSE NULL END,
        CURRENT_DATE
    ) RETURNING id INTO v_pengeluaran_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty := (v_item->>'qty')::INT;
        v_hpp := COALESCE((v_item->>'harga_pokok')::NUMERIC, 0);
        v_alasan := v_item->>'alasan';

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Qty pengeluaran harus > 0 untuk item %', v_inv_id;
        END IF;

        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_inv_id AND gudang_id = p_gudang_id
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Stok di gudang tidak mencukupi untuk item %. Tersedia: %, Dikeluarkan: %',
                v_inv_id, COALESCE(v_current_stock, 0), v_qty;
        END IF;

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

            -- Catat ke stock_adjustments (Laporan Selisih)
            INSERT INTO public.stock_adjustments (
                inventory_id,
                adjustment_qty,
                adjustment_type,
                reason,
                note,
                created_by
            ) VALUES (
                v_inv_id,
                v_qty,
                'decrease',
                'Pengeluaran Gudang (' || replace(p_tipe::TEXT, '_', ' ') || ')',
                v_nomor || COALESCE(' - ' || v_gudang_nama, '') || COALESCE(': ' || NULLIF(v_alasan, ''), NULLIF(': ' || p_catatan, ': '), ''),
                v_caller
            );

            v_total_nominal := v_total_nominal + (v_qty * v_hpp);
        END IF;
    END LOOP;

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
            v_caller,
            p_gudang_id
        );
    END IF;

    RETURN v_pengeluaran_id;
END;
$$;

-- 3c. approve_pengeluaran_gudang
CREATE OR REPLACE FUNCTION public.approve_pengeluaran_gudang(
    p_pengeluaran_id UUID,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_doc RECORD;
    v_item RECORD;
    v_current_stock INT;
    v_total_nominal NUMERIC := 0;
    v_gudang_nama TEXT;
    v_user_gudang UUID;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);
    IF NOT public.is_admin_or_lead_warehouse() THEN
        RAISE EXCEPTION 'Hanya Admin atau Kepala Cabang yang berhak menyetujui pengeluaran barang';
    END IF;

    SELECT * INTO v_doc
    FROM public.pengeluaran_gudang
    WHERE id = p_pengeluaran_id
    FOR UPDATE;

    IF v_doc IS NULL THEN
        RAISE EXCEPTION 'Dokumen pengeluaran tidak ditemukan';
    END IF;

    IF v_doc.status <> 'DRAFT' THEN
        RAISE EXCEPTION 'Dokumen sudah diproses sebelumnya (Status: %)', v_doc.status;
    END IF;

    v_user_gudang := public.get_auth_user_default_gudang();
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND v_doc.gudang_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Anda hanya dapat menyetujui pengeluaran untuk gudang tugas Anda.';
    END IF;

    SELECT nama INTO v_gudang_nama FROM public.gudang WHERE id = v_doc.gudang_id;

    FOR v_item IN SELECT * FROM public.pengeluaran_gudang_items WHERE pengeluaran_id = p_pengeluaran_id
    LOOP
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_doc.gudang_id
        FOR UPDATE;

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

        -- Catat ke stock_adjustments (Laporan Selisih)
        INSERT INTO public.stock_adjustments (
            inventory_id,
            adjustment_qty,
            adjustment_type,
            reason,
            note,
            created_by
        ) VALUES (
            v_item.inventory_id,
            v_item.qty,
            'decrease',
            'Pengeluaran Gudang (' || replace(v_doc.tipe::TEXT, '_', ' ') || ')',
            v_doc.nomor_dokumen || COALESCE(' - ' || v_gudang_nama, '') || COALESCE(': ' || NULLIF(v_item.alasan, ''), NULLIF(': ' || v_doc.catatan, ': '), ''),
            v_caller
        );

        v_total_nominal := v_total_nominal + (v_item.qty * COALESCE(v_item.harga_pokok, 0));
    END LOOP;

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
            v_caller,
            v_doc.gudang_id
        );
    END IF;

    UPDATE public.pengeluaran_gudang
    SET status = 'APPROVED',
        approved_by = v_caller,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_pengeluaran_id;

    RETURN jsonb_build_object('success', true, 'status', 'APPROVED');
END;
$$;

-- 3d. reject_pengeluaran_gudang
CREATE OR REPLACE FUNCTION public.reject_pengeluaran_gudang(
    p_pengeluaran_id UUID,
    p_note TEXT,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_doc RECORD;
    v_user_gudang UUID;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);
    IF NOT public.is_admin_or_lead_warehouse() THEN
        RAISE EXCEPTION 'Hanya Admin atau Kepala Cabang yang berhak menolak pengajuan pengeluaran';
    END IF;

    SELECT * INTO v_doc
    FROM public.pengeluaran_gudang
    WHERE id = p_pengeluaran_id
    FOR UPDATE;

    IF v_doc IS NULL THEN
        RAISE EXCEPTION 'Dokumen pengeluaran tidak ditemukan';
    END IF;

    v_user_gudang := public.get_auth_user_default_gudang();
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND v_doc.gudang_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Anda hanya dapat menolak pengeluaran untuk gudang tugas Anda.';
    END IF;

    UPDATE public.pengeluaran_gudang
    SET status = 'REJECTED',
        rejected_note = p_note,
        approved_by = v_caller,
        approved_at = now(),
        updated_at = now()
    WHERE id = p_pengeluaran_id AND status = 'DRAFT';

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
END;
$$;

-- 3e. get_available_return_items & find_suppliers_for_return_by_barcode
CREATE OR REPLACE FUNCTION public.get_available_return_items(p_supplier_id UUID)
RETURNS TABLE (
  pembelian_item_id UUID,
  pembelian_id UUID,
  inventory_id UUID,
  nama_barang TEXT,
  barcode TEXT,
  harga_beli NUMERIC,
  diskon NUMERIC,
  qty_original INTEGER,
  qty_returned INTEGER,
  qty_remaining INTEGER,
  tanggal_pembelian DATE,
  nomor_nota TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id AS pembelian_item_id,
    pi.pembelian_id,
    pi.inventory_id,
    pi.nama_barang,
    i.kode_barcode::TEXT AS barcode,
    pi.harga_beli,
    COALESCE(pi.diskon, 0) AS diskon,
    pi.qty AS qty_original,
    COALESCE(SUM(pri.qty)::INTEGER, 0) AS qty_returned,
    (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) AS qty_remaining,
    p.tanggal AS tanggal_pembelian,
    p.nomor_nota
  FROM public.pembelian_items pi
  JOIN public.pembelian p ON p.id = pi.pembelian_id
  JOIN public.inventory i ON i.id = pi.inventory_id
  LEFT JOIN public.pembelian_return_items pri ON pri.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  GROUP BY 
    pi.id, pi.pembelian_id, pi.inventory_id, pi.nama_barang, 
    i.kode_barcode, pi.harga_beli, pi.diskon, pi.qty, p.tanggal, p.nomor_nota
  HAVING (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) > 0
  ORDER BY p.tanggal DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_suppliers_for_return_by_barcode(p_barcode TEXT)
RETURNS TABLE (
  supplier_id UUID,
  supplier_nama TEXT,
  total_qty_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS supplier_id,
    s.nama::TEXT AS supplier_nama,
    CAST(SUM(pi.qty - COALESCE(pri_qty.returned, 0)) AS INTEGER) AS total_qty_remaining
  FROM public.inventory i
  JOIN public.pembelian_items pi ON pi.inventory_id = i.id
  JOIN public.pembelian p ON p.id = pi.pembelian_id
  JOIN public.supplier s ON s.id = p.supplier_id
  LEFT JOIN (
    SELECT pembelian_item_id, SUM(qty) AS returned 
    FROM public.pembelian_return_items 
    GROUP BY pembelian_item_id
  ) pri_qty ON pri_qty.pembelian_item_id = pi.id
  WHERE (i.kode_barcode = p_barcode OR i.nama_barang ILIKE '%' || p_barcode || '%')
  GROUP BY s.id, s.nama
  HAVING SUM(pi.qty - COALESCE(pri_qty.returned, 0)) > 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. TRANSFER STOK: KIRIM, TERIMA (DENGAN SELISIH), & CREATE BATCH ATOMIK
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kirim_transfer_stok(
    p_transfer_id UUID,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_transfer RECORD;
    v_item RECORD;
    v_current_stock INT;
    v_user_gudang UUID;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);

    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_transfer.status NOT IN ('DRAFT', 'REQUESTED', 'APPROVED') THEN
        RAISE EXCEPTION 'Transfer tidak dapat dikirim karena status saat ini: %', v_transfer.status;
    END IF;

    v_user_gudang := public.get_auth_user_default_gudang();
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND v_transfer.gudang_asal_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Hanya staf dari gudang asal atau Administrator yang dapat mengirim barang.';
    END IF;

    FOR v_item IN SELECT * FROM public.transfer_stok_items WHERE transfer_id = p_transfer_id
    LOOP
        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < v_item.qty_kirim THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk item % di gudang asal. Tersedia: %, Diminta: %', 
                v_item.inventory_id, COALESCE(v_current_stock, 0), v_item.qty_kirim;
        END IF;

        IF v_item.qty_kirim <= 0 THEN
            RAISE EXCEPTION 'Kuantitas kirim harus lebih besar dari 0 untuk item %', v_item.inventory_id;
        END IF;

        UPDATE public.inventory_stocks
        SET stok = stok - v_item.qty_kirim,
            updated_at = now()
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id;

        INSERT INTO public.stock_movements (
            inventory_id,
            tipe,
            qty,
            referensi,
            gudang_id,
            gudang_tujuan_id,
            created_at
        ) VALUES (
            v_item.inventory_id,
            'OUT',
            v_item.qty_kirim,
            'Transfer keluar: ' || v_transfer.nomor_transfer,
            v_transfer.gudang_asal_id,
            v_transfer.gudang_tujuan_id,
            now()
        );
    END LOOP;

    UPDATE public.transfer_stok
    SET status = 'IN_TRANSIT',
        approved_by = v_caller,
        tanggal_kirim = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'IN_TRANSIT');
END;
$$;

CREATE OR REPLACE FUNCTION public.terima_transfer_stok(
    p_transfer_id UUID,
    p_items JSONB,
    p_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_transfer RECORD;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_kirim INT;
    v_qty_terima INT;
    v_selisih INT;
    v_catatan TEXT;
    v_user_gudang UUID;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);

    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_transfer.status <> 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Transfer hanya dapat diterima saat berstatus IN_TRANSIT. Status saat ini: %', v_transfer.status;
    END IF;

    v_user_gudang := public.get_auth_user_default_gudang();
    IF NOT public.is_admin() AND v_user_gudang IS NOT NULL AND v_transfer.gudang_tujuan_id != v_user_gudang THEN
        RAISE EXCEPTION 'Otoritas Ditolak: Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty_terima := (v_item->>'qty_terima')::INT;
        v_catatan := v_item->>'catatan';

        IF v_qty_terima IS NULL OR v_qty_terima < 0 THEN
            RAISE EXCEPTION 'Qty terima tidak boleh negatif untuk item %', v_inv_id;
        END IF;

        SELECT qty_kirim INTO v_qty_kirim
        FROM public.transfer_stok_items
        WHERE transfer_id = p_transfer_id AND inventory_id = v_inv_id;

        IF v_qty_kirim IS NULL THEN
            RAISE EXCEPTION 'Item % tidak ditemukan pada dokumen transfer ini', v_inv_id;
        END IF;

        IF v_qty_terima > v_qty_kirim THEN
            RAISE EXCEPTION 'Qty terima (%) tidak boleh melebihi qty kirim (%) untuk item %', v_qty_terima, v_qty_kirim, v_inv_id;
        END IF;

        UPDATE public.transfer_stok_items
        SET qty_terima = v_qty_terima,
            catatan = COALESCE(NULLIF(v_catatan, ''), catatan)
        WHERE transfer_id = p_transfer_id AND inventory_id = v_inv_id;

        IF v_qty_terima > 0 THEN
            INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
            VALUES (v_inv_id, v_transfer.gudang_tujuan_id, v_qty_terima, now())
            ON CONFLICT (inventory_id, gudang_id)
            DO UPDATE SET stok = public.inventory_stocks.stok + v_qty_terima,
                          updated_at = now();

            INSERT INTO public.stock_movements (
                inventory_id,
                tipe,
                qty,
                referensi,
                gudang_id,
                gudang_tujuan_id,
                created_at
            ) VALUES (
                v_inv_id,
                'IN',
                v_qty_terima,
                'Transfer masuk: ' || v_transfer.nomor_transfer,
                v_transfer.gudang_tujuan_id,
                v_transfer.gudang_asal_id,
                now()
            );
        END IF;

        -- Catat selisih kurang (jika ada) ke stock_adjustments (Laporan Selisih)
        v_selisih := v_qty_kirim - v_qty_terima;
        IF v_selisih > 0 THEN
            INSERT INTO public.stock_adjustments (
                inventory_id,
                adjustment_qty,
                adjustment_type,
                reason,
                note,
                created_by
            ) VALUES (
                v_inv_id,
                v_selisih,
                'decrease',
                'Selisih Transfer Stok (' || v_transfer.nomor_transfer || ')',
                COALESCE(NULLIF(v_catatan, ''), 'Selisih kurang saat penerimaan transfer ' || v_transfer.nomor_transfer),
                v_caller
            );
        END IF;
    END LOOP;

    UPDATE public.transfer_stok
    SET status = 'RECEIVED',
        received_by = v_caller,
        tanggal_terima = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'RECEIVED');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_transfer_stok_batch(
    p_gudang_asal_id UUID,
    p_gudang_tujuan_id UUID,
    p_kurir_pengirim TEXT DEFAULT NULL,
    p_catatan TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_user UUID DEFAULT NULL,
    p_auto_kirim BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID;
    v_nomor TEXT;
    v_header public.transfer_stok;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_kirim INT;
    v_item_catatan TEXT;
BEGIN
    v_caller := COALESCE(auth.uid(), p_user);
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi';
    END IF;

    IF p_gudang_asal_id = p_gudang_tujuan_id THEN
        RAISE EXCEPTION 'Gudang asal dan gudang tujuan tidak boleh sama';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Daftar barang transfer tidak boleh kosong';
    END IF;

    v_nomor := COALESCE(public.generate_nomor_transfer(), 'TRF/' || extract(epoch from now())::bigint::text);

    INSERT INTO public.transfer_stok (
        nomor_transfer,
        gudang_asal_id,
        gudang_tujuan_id,
        kurir_pengirim,
        catatan,
        status,
        created_by
    ) VALUES (
        v_nomor,
        p_gudang_asal_id,
        p_gudang_tujuan_id,
        p_kurir_pengirim,
        p_catatan,
        'DRAFT',
        v_caller
    ) RETURNING * INTO v_header;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty_kirim := (v_item->>'qty_kirim')::INT;
        v_item_catatan := v_item->>'catatan';

        IF v_qty_kirim IS NULL OR v_qty_kirim <= 0 THEN
            RAISE EXCEPTION 'Kuantitas kirim harus lebih besar dari 0 untuk item %', v_inv_id;
        END IF;

        INSERT INTO public.transfer_stok_items (
            transfer_id,
            inventory_id,
            qty_kirim,
            qty_terima,
            catatan
        ) VALUES (
            v_header.id,
            v_inv_id,
            v_qty_kirim,
            0,
            v_item_catatan
        );
    END LOOP;

    IF p_auto_kirim THEN
        PERFORM public.kirim_transfer_stok(v_header.id, v_caller);
        SELECT * INTO v_header FROM public.transfer_stok WHERE id = v_header.id;
    END IF;

    RETURN to_jsonb(v_header);
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. SELARASKAN RPC & RLS HR/PAYROLL DAN FINANCE DENGAN is_finance_or_admin()
-- -----------------------------------------------------------------------------

-- 5a. disburse_payroll_via_cashier (tambahkan cek is_finance_or_admin())
CREATE OR REPLACE FUNCTION public.disburse_payroll_via_cashier(
    p_mutasi_id UUID,
    p_shift_id UUID,
    p_gudang_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mutasi RECORD;
    v_shift RECORD;
    v_user_nama TEXT;
    v_target_gudang UUID;
    v_kas_log_id UUID;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Admin atau Finance yang dapat mencairkan dana via kasir.';
    END IF;

    SELECT * INTO v_mutasi FROM public.payroll_mutasi WHERE id = p_mutasi_id FOR UPDATE;
    IF v_mutasi IS NULL THEN
        RAISE EXCEPTION 'Data mutasi payroll tidak ditemukan';
    END IF;

    SELECT * INTO v_shift FROM public.shift_sessions WHERE id = p_shift_id;
    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Sesi shift kasir tidak ditemukan';
    END IF;
    IF v_shift.status != 'OPEN' THEN
        RAISE EXCEPTION 'Sesi shift kasir sudah ditutup (tidak aktif)';
    END IF;

    SELECT COALESCE(nama, 'Karyawan') INTO v_user_nama 
    FROM public.profiles 
    WHERE id = v_mutasi.user_id;

    v_target_gudang := COALESCE(v_shift.gudang_id, p_gudang_id);
    IF v_target_gudang IS NULL THEN
        SELECT id INTO v_target_gudang FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    UPDATE public.payroll_mutasi 
    SET status = 'disetujui',
        updated_at = NOW()
    WHERE id = p_mutasi_id;

    IF NOT EXISTS (SELECT 1 FROM public.kas_log WHERE referensi_id = p_mutasi_id AND tipe = 'TARIK') THEN
        INSERT INTO public.kas_log (
            id, tipe, kategori, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id, shift_id
        ) VALUES (
            gen_random_uuid(),
            'TARIK',
            'GAJI',
            v_mutasi.nominal,
            'CASH',
            p_mutasi_id,
            'Pencairan Gaji: ' || v_user_nama || ' (Kasir: ' || COALESCE(v_shift.kasir_name, 'Kasir') || ')',
            v_shift.kasir_id,
            NOW(),
            v_target_gudang,
            p_shift_id
        ) RETURNING id INTO v_kas_log_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mutasi_id', p_mutasi_id,
        'shift_id', p_shift_id,
        'kas_log_id', v_kas_log_id,
        'nominal', v_mutasi.nominal,
        'kasir_name', v_shift.kasir_name
    );
END;
$$;

-- 5b. bulk_approve_lembur, review_pulang_awal, bulk_review_pulang_awal, get_today_kehadiran_summary, proses_gaji
CREATE OR REPLACE FUNCTION public.bulk_approve_lembur(p_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang bisa menyetujui lembur.';
    END IF;

    UPDATE public.kehadiran
    SET 
        status_lembur = 'disetujui',
        menit_lembur_disetujui = menit_lembur_aktual
    WHERE id = ANY(p_ids) AND status_lembur = 'pending';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_pulang_awal(
    p_kehadiran_id UUID,
    p_keputusan VARCHAR,
    p_catatan_admin TEXT DEFAULT NULL
)
RETURNS public.kehadiran
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_kehadiran public.kehadiran;
    v_karyawan public.karyawan;
    v_tanggal_str TEXT;
    v_standard_pulang TIMESTAMPTZ;
    v_menit_kerja INTEGER;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang dapat mereview kepulangan awal.';
    END IF;

    SELECT * INTO v_kehadiran FROM public.kehadiran WHERE id = p_kehadiran_id;
    IF v_kehadiran.id IS NULL THEN
        RAISE EXCEPTION 'Data kehadiran tidak ditemukan.';
    END IF;

    IF v_kehadiran.status_pulang_awal NOT IN ('pending', 'disetujui_penuh', 'disetujui_durasi') THEN
        RAISE EXCEPTION 'Status kehadiran ini bukan pengajuan pulang awal yang valid.';
    END IF;

    SELECT * INTO v_karyawan FROM public.karyawan WHERE user_id = v_kehadiran.user_id;
    v_tanggal_str := to_char(v_kehadiran.tanggal, 'YYYY-MM-DD');
    v_standard_pulang := (v_tanggal_str || ' ' || COALESCE(to_char(v_karyawan.jam_pulang, 'HH24:MI:SS'), '17:00:00'))::timestamp at time zone 'Asia/Jakarta';

    IF p_keputusan = 'hitung_penuh' THEN
        IF v_kehadiran.waktu_masuk IS NOT NULL THEN
            v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_standard_pulang - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
        ELSE
            v_menit_kerja := v_kehadiran.menit_kerja;
        END IF;

        UPDATE public.kehadiran SET
            waktu_pulang = v_standard_pulang,
            menit_kerja = v_menit_kerja,
            status_pulang_awal = 'disetujui_penuh'
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;

    ELSIF p_keputusan = 'sesuai_durasi' THEN
        IF v_kehadiran.waktu_masuk IS NOT NULL AND v_kehadiran.waktu_pulang_aktual IS NOT NULL THEN
            v_menit_kerja := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_kehadiran.waktu_pulang_aktual - v_kehadiran.waktu_masuk)) / 60.0)::INTEGER);
        ELSE
            v_menit_kerja := v_kehadiran.menit_kerja;
        END IF;

        UPDATE public.kehadiran SET
            waktu_pulang = COALESCE(v_kehadiran.waktu_pulang_aktual, v_kehadiran.waktu_pulang),
            menit_kerja = v_menit_kerja,
            status_pulang_awal = 'disetujui_durasi'
        WHERE id = p_kehadiran_id
        RETURNING * INTO v_kehadiran;
    ELSE
        RAISE EXCEPTION 'Keputusan tidak valid. Gunakan hitung_penuh atau sesuai_durasi.';
    END IF;

    RETURN v_kehadiran;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_review_pulang_awal(
    p_ids UUID[],
    p_keputusan VARCHAR
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_count INTEGER := 0;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang dapat mereview kepulangan awal.';
    END IF;

    FOREACH v_id IN ARRAY p_ids LOOP
        PERFORM public.review_pulang_awal(v_id, p_keputusan);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_today_kehadiran_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
    v_total_karyawan_aktif INTEGER := 0;
    v_hadir_tepat INTEGER := 0;
    v_hadir_telat INTEGER := 0;
    v_izin INTEGER := 0;
    v_sakit INTEGER := 0;
    v_off INTEGER := 0;
    v_pending_lembur INTEGER := 0;
    v_pending_pulang_awal INTEGER := 0;
    v_total_pulang_awal INTEGER := 0;
    v_belum_hadir INTEGER := 0;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak.';
    END IF;

    SELECT COUNT(*) INTO v_total_karyawan_aktif
    FROM public.karyawan
    WHERE status_karyawan = 'aktif';

    SELECT 
        COUNT(*) FILTER (WHERE status_hadir = 'hadir' AND menit_telat = 0),
        COUNT(*) FILTER (WHERE status_hadir = 'hadir' AND menit_telat > 0),
        COUNT(*) FILTER (WHERE status_hadir = 'izin'),
        COUNT(*) FILTER (WHERE status_hadir = 'sakit'),
        COUNT(*) FILTER (WHERE status_hadir = 'off'),
        COUNT(*) FILTER (WHERE status_lembur = 'pending'),
        COUNT(*) FILTER (WHERE status_pulang_awal = 'pending'),
        COUNT(*) FILTER (WHERE status_pulang_awal IN ('pending', 'disetujui_penuh', 'disetujui_durasi'))
    INTO
        v_hadir_tepat,
        v_hadir_telat,
        v_izin,
        v_sakit,
        v_off,
        v_pending_lembur,
        v_pending_pulang_awal,
        v_total_pulang_awal
    FROM public.kehadiran
    WHERE tanggal = v_today;

    v_belum_hadir := GREATEST(0, v_total_karyawan_aktif - (v_hadir_tepat + v_hadir_telat + v_izin + v_sakit + v_off));

    RETURN json_build_object(
        'tanggal', v_today,
        'total_aktif', v_total_karyawan_aktif,
        'hadir_tepat', v_hadir_tepat,
        'hadir_telat', v_hadir_telat,
        'total_hadir', v_hadir_tepat + v_hadir_telat,
        'izin', v_izin,
        'sakit', v_sakit,
        'off', v_off,
        'pending_lembur', v_pending_lembur,
        'pending_pulang_awal', v_pending_pulang_awal,
        'total_pulang_awal', v_total_pulang_awal,
        'belum_hadir', v_belum_hadir
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.proses_gaji(p_periode VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_start_date DATE;
    v_end_date DATE;
    v_total_hari_hadir INTEGER;
    v_total_menit_telat NUMERIC;
    v_total_jam_lembur NUMERIC;
    v_total_denda_telat NUMERIC;
    v_total_potongan_kasbon NUMERIC;
    v_total_potongan_libur NUMERIC;
    v_total_bonus NUMERIC;
    v_total_potongan_lain NUMERIC;
    v_total_gaji_harian NUMERIC;
    v_total_gaji_lembur NUMERIC;
    v_gaji_bersih NUMERIC;
    v_hari_aktif_sebulan INTEGER := 26;
    v_hari_potongan INTEGER;
BEGIN
    IF NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Finance yang bisa memproses gaji.';
    END IF;

    v_start_date := to_date(p_periode || '-01', 'YYYY-MM-DD');
    v_end_date := (v_start_date + interval '1 month' - interval '1 day')::DATE;

    FOR r IN SELECT k.* FROM public.karyawan k WHERE k.status_karyawan = 'aktif'
    LOOP
        SELECT COUNT(*), COALESCE(SUM(menit_telat), 0), COALESCE(SUM(menit_lembur)/60.0, 0)
        INTO v_total_hari_hadir, v_total_menit_telat, v_total_jam_lembur
        FROM public.kehadiran
        WHERE kehadiran.user_id = r.user_id 
          AND status_hadir = 'hadir' 
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date;

        v_total_denda_telat := (v_total_menit_telat / 60.0) * r.denda_telat_per_jam;

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_kasbon
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori IN ('kasbon', 'pencairan');

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_bonus
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'kredit'
          AND kategori = 'lainnya';

        SELECT COALESCE(SUM(nominal), 0) INTO v_total_potongan_lain
        FROM public.payroll_mutasi
        WHERE user_id = r.user_id
          AND status = 'disetujui'
          AND tanggal >= v_start_date 
          AND tanggal <= v_end_date
          AND jenis = 'debit'
          AND kategori = 'lainnya';

        v_total_gaji_lembur := v_total_jam_lembur * r.lembur_per_jam;
        v_total_potongan_libur := 0;
        v_hari_potongan := 0;

        IF r.tipe_gaji = 'bulanan' THEN
            DELETE FROM public.payroll_mutasi
            WHERE user_id = r.user_id 
              AND tanggal >= v_start_date AND tanggal <= v_end_date
              AND kategori = 'gaji' 
              AND referensi_id NOT LIKE 'gaji_bulanan_%'
              AND keterangan ILIKE 'Gaji Pokok%';

            v_hari_potongan := GREATEST(0, v_hari_aktif_sebulan - v_total_hari_hadir - COALESCE(r.jatah_libur_bulanan, 0));
            v_total_potongan_libur := v_hari_potongan * r.gaji_harian;
            v_total_gaji_harian := r.gaji_bulanan;

            INSERT INTO public.payroll_mutasi (
                user_id, tanggal, jenis, kategori, nominal, 
                keterangan, status, referensi_id
            ) VALUES (
                r.user_id, v_end_date, 'kredit', 'gaji', (v_total_gaji_harian - v_total_potongan_libur), 
                'Gaji Pokok Bulanan (' || p_periode || ')', 'disetujui', 
                'gaji_bulanan_' || r.user_id::text || '_' || p_periode
            ) ON CONFLICT (referensi_id) 
              DO UPDATE SET nominal = EXCLUDED.nominal;
        ELSE
            v_total_gaji_harian := v_total_hari_hadir * r.gaji_harian;
        END IF;

        v_gaji_bersih := v_total_gaji_harian + v_total_gaji_lembur + v_total_bonus 
                         - v_total_potongan_libur - v_total_denda_telat - v_total_potongan_kasbon - v_total_potongan_lain;

        INSERT INTO public.slip_gaji (
            user_id, 
            periode_bulan, 
            total_hari_hadir,
            total_jam_telat,
            total_jam_lembur,
            total_gaji_harian,
            total_denda_telat,
            total_gaji_lembur,
            total_potongan_kasbon,
            total_potongan_libur,
            total_bonus,
            total_potongan_lain,
            gaji_bersih,
            status_pembayaran,
            tipe_gaji,
            gaji_bulanan
        ) VALUES (
            r.user_id, 
            p_periode,
            v_total_hari_hadir,
            v_total_menit_telat / 60.0,
            v_total_jam_lembur,
            v_total_gaji_harian,
            v_total_denda_telat,
            v_total_gaji_lembur,
            v_total_potongan_kasbon,
            v_total_potongan_libur,
            v_total_bonus,
            v_total_potongan_lain,
            v_gaji_bersih,
            'draft',
            r.tipe_gaji,
            r.gaji_bulanan
        ) ON CONFLICT (user_id, periode_bulan) DO UPDATE SET
            total_hari_hadir = EXCLUDED.total_hari_hadir,
            total_jam_telat = EXCLUDED.total_jam_telat,
            total_jam_lembur = EXCLUDED.total_jam_lembur,
            total_gaji_harian = EXCLUDED.total_gaji_harian,
            total_denda_telat = EXCLUDED.total_denda_telat,
            total_gaji_lembur = EXCLUDED.total_gaji_lembur,
            total_potongan_kasbon = EXCLUDED.total_potongan_kasbon,
            total_potongan_libur = EXCLUDED.total_potongan_libur,
            total_bonus = EXCLUDED.total_bonus,
            total_potongan_lain = EXCLUDED.total_potongan_lain,
            gaji_bersih = EXCLUDED.gaji_bersih,
            tipe_gaji = EXCLUDED.tipe_gaji,
            gaji_bulanan = EXCLUDED.gaji_bulanan;
    END LOOP;
END;
$$;

-- 5c. Perbarui RLS HR & Payroll (is_finance_or_admin) dan Finance (buku_besar & kas_log)
DROP POLICY IF EXISTS "karyawan_select" ON public.karyawan;
CREATE POLICY "karyawan_select" ON public.karyawan
FOR SELECT TO authenticated
USING ((user_id = (SELECT auth.uid())) OR public.is_finance_or_admin());

DROP POLICY IF EXISTS "kehadiran_select" ON public.kehadiran;
CREATE POLICY "kehadiran_select" ON public.kehadiran
FOR SELECT TO authenticated
USING ((user_id = (SELECT auth.uid())) OR public.is_finance_or_admin());

DROP POLICY IF EXISTS "kehadiran_insert" ON public.kehadiran;
CREATE POLICY "kehadiran_insert" ON public.kehadiran
FOR INSERT TO authenticated
WITH CHECK ((user_id = (SELECT auth.uid())) OR public.is_finance_or_admin());

DROP POLICY IF EXISTS "kehadiran_update" ON public.kehadiran;
CREATE POLICY "kehadiran_update" ON public.kehadiran
FOR UPDATE TO authenticated
USING ((user_id = (SELECT auth.uid())) OR public.is_finance_or_admin());

DROP POLICY IF EXISTS "kehadiran_delete_admin" ON public.kehadiran;
CREATE POLICY "kehadiran_delete_admin" ON public.kehadiran
FOR DELETE TO authenticated
USING (public.is_finance_or_admin());

DROP POLICY IF EXISTS "Admins have full access to payroll_mutasi" ON public.payroll_mutasi;
DROP POLICY IF EXISTS "Users can view their own mutasi" ON public.payroll_mutasi;
DROP POLICY IF EXISTS "Users can create their own pending mutasi (kasbon)" ON public.payroll_mutasi;

CREATE POLICY "payroll_mutasi_select" ON public.payroll_mutasi
FOR SELECT TO authenticated
USING ((user_id = (SELECT auth.uid())) OR public.is_finance_or_admin());

CREATE POLICY "payroll_mutasi_insert" ON public.payroll_mutasi
FOR INSERT TO authenticated
WITH CHECK (
    public.is_finance_or_admin()
    OR ((user_id = (SELECT auth.uid())) AND status = 'pending'::payroll_mutasi_status)
);

CREATE POLICY "payroll_mutasi_update" ON public.payroll_mutasi
FOR UPDATE TO authenticated
USING (public.is_finance_or_admin())
WITH CHECK (public.is_finance_or_admin());

CREATE POLICY "payroll_mutasi_delete" ON public.payroll_mutasi
FOR DELETE TO authenticated
USING (public.is_finance_or_admin());

DROP POLICY IF EXISTS "slip_gaji_select" ON public.slip_gaji;
CREATE POLICY "slip_gaji_select" ON public.slip_gaji
FOR SELECT TO authenticated
USING ((user_id = (SELECT auth.uid())) OR public.is_finance_or_admin());

DROP POLICY IF EXISTS "slip_gaji_insert_admin" ON public.slip_gaji;
CREATE POLICY "slip_gaji_insert_admin" ON public.slip_gaji
FOR INSERT TO authenticated
WITH CHECK (public.is_finance_or_admin());

DROP POLICY IF EXISTS "slip_gaji_update_admin" ON public.slip_gaji;
CREATE POLICY "slip_gaji_update_admin" ON public.slip_gaji
FOR UPDATE TO authenticated
USING (public.is_finance_or_admin());

DROP POLICY IF EXISTS "slip_gaji_delete_admin" ON public.slip_gaji;
CREATE POLICY "slip_gaji_delete_admin" ON public.slip_gaji
FOR DELETE TO authenticated
USING (public.is_finance_or_admin());

-- buku_besar: Kunci untuk Admin & Finance (trigger buku_besar sudah SECURITY DEFINER)
DROP POLICY IF EXISTS "buku_besar_select_policy" ON public.buku_besar;
DROP POLICY IF EXISTS "buku_besar_insert_policy" ON public.buku_besar;
CREATE POLICY "buku_besar_select_policy" ON public.buku_besar
FOR SELECT TO authenticated
USING (public.is_finance_or_admin());

CREATE POLICY "buku_besar_insert_policy" ON public.buku_besar
FOR INSERT TO authenticated
WITH CHECK (public.is_finance_or_admin());

CREATE POLICY "buku_besar_update_policy" ON public.buku_besar
FOR UPDATE TO authenticated
USING (public.is_finance_or_admin())
WITH CHECK (public.is_finance_or_admin());

CREATE POLICY "buku_besar_delete_policy" ON public.buku_besar
FOR DELETE TO authenticated
USING (public.is_finance_or_admin());

-- kas_log: Izinkan SELECT & INSERT untuk authenticated (termasuk POS C#), kunci UPDATE & DELETE untuk Admin/Finance
DROP POLICY IF EXISTS "kas_log_all_access" ON public.kas_log;
CREATE POLICY "kas_log_select_auth" ON public.kas_log
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "kas_log_insert_auth" ON public.kas_log
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "kas_log_update_finance_admin" ON public.kas_log
FOR UPDATE TO authenticated
USING (public.is_finance_or_admin())
WITH CHECK (public.is_finance_or_admin());

CREATE POLICY "kas_log_delete_finance_admin" ON public.kas_log
FOR DELETE TO authenticated
USING (public.is_finance_or_admin());

-- -----------------------------------------------------------------------------
-- 6. RPC AGREGASI BEBAS TRUNCATION 1.000 BARIS (P1-2)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_kas_summary(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_gudang_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pemasukan NUMERIC := 0;
    v_pengeluaran NUMERIC := 0;
BEGIN
    SELECT
        COALESCE(SUM(jumlah) FILTER (WHERE tipe IN ('JUAL', 'SETOR')), 0),
        COALESCE(SUM(jumlah) FILTER (WHERE tipe IN ('TARIK', 'RETURN')), 0)
    INTO v_pemasukan, v_pengeluaran
    FROM public.kas_log
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
      AND (p_gudang_id IS NULL OR gudang_id = p_gudang_id)
      AND (p_user_id IS NULL OR created_by = p_user_id);

    RETURN jsonb_build_object(
        'pemasukan', v_pemasukan,
        'pengeluaran', v_pengeluaran,
        'saldo', v_pemasukan - v_pengeluaran
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_warehouse_stock_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_gudang INT := 0;
    v_total_item_unique INT := 0;
    v_stok_pusat BIGINT := 0;
    v_stok_cabang BIGINT := 0;
    v_in_transit INT := 0;
    v_low_stock INT := 0;
BEGIN
    SELECT COUNT(*) INTO v_total_gudang
    FROM public.gudang
    WHERE is_active = true;

    SELECT COUNT(*) INTO v_total_item_unique
    FROM public.inventory
    WHERE is_discontinued = false;

    SELECT
        COALESCE(SUM(s.stok) FILTER (WHERE g.tipe = 'PUSAT'), 0),
        COALESCE(SUM(s.stok) FILTER (WHERE g.tipe <> 'PUSAT'), 0),
        COUNT(*) FILTER (WHERE s.stok <= 3)
    INTO v_stok_pusat, v_stok_cabang, v_low_stock
    FROM public.inventory_stocks s
    JOIN public.gudang g ON g.id = s.gudang_id
    JOIN public.inventory i ON i.id = s.inventory_id
    WHERE g.is_active = true
      AND i.is_discontinued = false;

    SELECT COUNT(*) INTO v_in_transit
    FROM public.transfer_stok
    WHERE status = 'IN_TRANSIT';

    RETURN jsonb_build_object(
        'total_gudang', v_total_gudang,
        'total_item_unique', v_total_item_unique,
        'total_stok_pusat', v_stok_pusat,
        'total_stok_cabang', v_stok_cabang,
        'total_transfer_in_transit', v_in_transit,
        'total_low_stock_items', v_low_stock
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. OPTIMASI RLS INITPLAN, INDEKS 19 FK & HAPUS 3 INDEKS DUPLIKAT (P2-1)
-- -----------------------------------------------------------------------------

-- 7a. Optimasi RLS InitPlan yang tersisa
DROP POLICY IF EXISTS "Allow authenticated users with admin role to delete help articl" ON public.help_articles;
DROP POLICY IF EXISTS "Allow authenticated users with admin role to insert help articl" ON public.help_articles;
DROP POLICY IF EXISTS "Allow authenticated users with admin role to update help articl" ON public.help_articles;

CREATE POLICY "help_articles_insert_admin" ON public.help_articles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "help_articles_update_admin" ON public.help_articles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "help_articles_delete_admin" ON public.help_articles
FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "member_tiers_all" ON public.member_tiers;
CREATE POLICY "member_tiers_all" ON public.member_tiers
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "members_all" ON public.members;
CREATE POLICY "members_all" ON public.members
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.promosi;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.promosi;
CREATE POLICY "promosi_select_auth" ON public.promosi
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "promosi_insert_admin" ON public.promosi
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "promosi_update_admin" ON public.promosi
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "promosi_delete_admin" ON public.promosi
FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.promosi_items;
CREATE POLICY "promosi_items_select_auth" ON public.promosi_items
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "pengeluaran_gudang_update" ON public.pengeluaran_gudang;
CREATE POLICY "pengeluaran_gudang_update" ON public.pengeluaran_gudang
FOR UPDATE TO authenticated
USING (public.is_admin_or_lead_warehouse() OR ((created_by = (SELECT auth.uid())) AND (status::text = 'DRAFT'::text)))
WITH CHECK (public.is_admin_or_lead_warehouse() OR ((created_by = (SELECT auth.uid())) AND (status::text = 'DRAFT'::text)));

DROP POLICY IF EXISTS "pengeluaran_items_select" ON public.pengeluaran_gudang_items;

-- 7b. Hapus Indeks & Constraint Duplikat
DROP INDEX IF EXISTS public.idx_inventory_barcode;
DROP INDEX IF EXISTS public.idx_inventory_stocks_gudang;
DROP INDEX IF EXISTS public.idx_inventory_stocks_inventory;
ALTER TABLE public.inventory_barcodes DROP CONSTRAINT IF EXISTS inventory_barcodes_barcode_unique;
DROP INDEX IF EXISTS public.inventory_barcodes_barcode_unique;
ALTER TABLE public.kategori DROP CONSTRAINT IF EXISTS kategori_nama_unique;
DROP INDEX IF EXISTS public.kategori_nama_unique;

-- 7c. Tambahkan 19 Indeks Foreign Key yang Belum Terindeks
CREATE INDEX IF NOT EXISTS idx_buku_besar_created_by ON public.buku_besar(created_by);
CREATE INDEX IF NOT EXISTS idx_gudang_lokasi_kerja_id ON public.gudang(lokasi_kerja_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_created_by ON public.help_articles(created_by);
CREATE INDEX IF NOT EXISTS idx_kehadiran_lokasi_masuk_id ON public.kehadiran(lokasi_masuk_id);
CREATE INDEX IF NOT EXISTS idx_kehadiran_lokasi_pulang_id ON public.kehadiran(lokasi_pulang_id);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_gudang_approved_by ON public.pengeluaran_gudang(approved_by);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_gudang_created_by ON public.pengeluaran_gudang(created_by);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_gudang_items_inventory_id ON public.pengeluaran_gudang_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_operasional_created_by ON public.pengeluaran_operasional(created_by);
CREATE INDEX IF NOT EXISTS idx_penjualan_gudang_id ON public.penjualan(gudang_id);
CREATE INDEX IF NOT EXISTS idx_penjualan_shift_id ON public.penjualan(shift_id);
CREATE INDEX IF NOT EXISTS idx_penjualan_return_gudang_id ON public.penjualan_return(gudang_id);
CREATE INDEX IF NOT EXISTS idx_pos_authorizations_rejected_by_id ON public.pos_authorizations(rejected_by_id);
CREATE INDEX IF NOT EXISTS idx_promosi_items_inventory_id ON public.promosi_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_shift_sessions_gudang_id ON public.shift_sessions(gudang_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_gudang_tujuan_id ON public.stock_movements(gudang_tujuan_id);
CREATE INDEX IF NOT EXISTS idx_transfer_stok_approved_by ON public.transfer_stok(approved_by);
CREATE INDEX IF NOT EXISTS idx_transfer_stok_created_by ON public.transfer_stok(created_by);
CREATE INDEX IF NOT EXISTS idx_transfer_stok_received_by ON public.transfer_stok(received_by);

-- -----------------------------------------------------------------------------
-- 8. LOCK SEARCH_PATH & CABUT EXECUTE ANON PADA SELURUH FUNGSI SECURITY DEFINER
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    func RECORD;
BEGIN
    -- 8a. Kunci search_path = public pada semua fungsi di skema public yang belum memiliki proconfig
    FOR func IN
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS argtypes
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND (p.proconfig IS NULL OR NOT EXISTS (
              SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
          ))
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION public.%I(%s) SET search_path = public',
                func.proname, func.argtypes
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Skipped setting search_path on public.%(%): %', func.proname, func.argtypes, SQLERRM;
        END;
    END LOOP;

    -- 8b. Cabut EXECUTE dari PUBLIC dan anon pada seluruh fungsi SECURITY DEFINER
    FOR func IN
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS argtypes, p.prorettype
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
    LOOP
        BEGIN
            EXECUTE format(
                'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                func.proname, func.argtypes
            );
            IF func.prorettype != 'trigger'::regtype::oid THEN
                EXECUTE format(
                    'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
                    func.proname, func.argtypes
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Skipped revoking anon on public.%(%): %', func.proname, func.argtypes, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- 8c. Pastikan resolve_username tetap bisa diakses oleh anon untuk layar Login
GRANT EXECUTE ON FUNCTION public.resolve_username(TEXT) TO anon, authenticated, service_role;

-- 8d. Set default privileges di skema public agar fungsi masa depan tidak otomatis terbuka ke anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;
