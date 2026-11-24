-- ==============================================================================
-- MIGRATION: 20261124101000_fase1b_warehouse_purchasing_opname_pos_auth.sql
-- FASE 1B:
--   1. [INT-05] Purchasing & Retur Supplier (drop overload lama, role gate,
--      fail-closed branch check, auth.uid() anti-spoofing, FOR UPDATE stock guard).
--   2. [INT-05] Transfer Stok & Pengeluaran Gudang (fail-closed branch isolation,
--      kelengkapan item terima_transfer_stok, HPP server-side dari inventory).
--   3. [INT-05] Atomik Stock Opname (approve_and_process_opname + hardening
--      process_opname_adjustments).
--   4. [INT-04/05] POS Authorization (cabut anon, CSPRNG PIN, fail-closed branch,
--      verifikasi pengklaim pada release_pos_authorization).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Drop overload lama / redundan
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.proses_return_batch(uuid, text, jsonb[], date, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.request_pos_authorization(text, uuid, text);
DROP FUNCTION IF EXISTS public.verify_pos_authorization(text, text, uuid);

-- ------------------------------------------------------------------------------
-- 2. [INT-05] Purchasing & Retur Supplier
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tambah_pembelian_batch(
    p_items jsonb,
    p_supplier_id uuid,
    p_tanggal date,
    p_user uuid,
    p_idempotency_key uuid DEFAULT NULL::uuid,
    p_nomor_nota text DEFAULT NULL::text,
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET row_security TO 'off'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin_or_finance BOOLEAN := false;

    v_pembelian_id UUID;
    v_item JSONB;
    v_inventory_id UUID;
    v_total_sistem NUMERIC := 0;
    v_harga_beli NUMERIC;
    v_qty INTEGER;
    v_diskon NUMERIC;
    v_harga_final NUMERIC;
    v_subtotal NUMERIC;
    v_gudang_id UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang', 'finance']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan menginput pembelian.';
        END IF;

        v_is_admin_or_finance := (v_roles && ARRAY['admin', 'finance']::TEXT[]);
        IF NOT v_is_admin_or_finance THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat menginput pembelian untuk cabang lain.';
            END IF;
            v_gudang_id := v_user_gudang;
        ELSE
            v_gudang_id := p_gudang_id;
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_actor := p_user;
        v_gudang_id := p_gudang_id;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
    END IF;

    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
        END IF;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_pembelian_id
        FROM public.pembelian
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;
        IF v_pembelian_id IS NOT NULL THEN
            RETURN v_pembelian_id;
        END IF;
    ELSE
        p_idempotency_key := gen_random_uuid();
    END IF;

    INSERT INTO public.pembelian (
        supplier_id, tanggal, created_by, supplier_nama,
        idempotency_key, nomor_nota, gudang_id
    )
    SELECT
        p_supplier_id,
        p_tanggal,
        v_actor,
        COALESCE((SELECT nama FROM public.supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
        p_idempotency_key,
        p_nomor_nota,
        v_gudang_id
    RETURNING id INTO v_pembelian_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_harga_beli := (v_item->>'harga')::NUMERIC;
        v_qty := (v_item->>'qty')::INTEGER;
        v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);

        IF v_harga_beli IS NULL OR v_harga_beli < 0 THEN
            RAISE EXCEPTION 'harga tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
        END IF;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'qty harus > 0 untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
        END IF;
        IF v_diskon < 0 OR v_diskon > v_harga_beli THEN
            RAISE EXCEPTION 'diskon tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
        END IF;

        v_harga_final := v_harga_beli - v_diskon;

        SELECT id INTO v_inventory_id
        FROM public.inventory
        WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
        LIMIT 1
        FOR UPDATE;

        IF v_inventory_id IS NOT NULL THEN
            UPDATE public.inventory
            SET is_discontinued = false,
                discontinued_at = NULL,
                discontinued_by = NULL,
                updated_at = NOW(),
                updated_by = v_actor
            WHERE id = v_inventory_id AND is_discontinued = true;
        ELSE
            IF v_item->>'nama_barang' IS NULL OR TRIM(v_item->>'nama_barang') = '' THEN
                RAISE EXCEPTION 'nama_barang tidak boleh kosong';
            END IF;

            INSERT INTO public.inventory (
                nama_barang, slug, harga_beli_terakhir, harga_jual, created_by, stok
            )
            VALUES (
                v_item->>'nama_barang',
                LOWER(REPLACE(REPLACE(v_item->>'nama_barang', ' ', '-'), '_', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
                v_harga_beli,
                (v_harga_beli * 1.2),
                v_actor,
                0
            )
            RETURNING id INTO v_inventory_id;
        END IF;

        IF v_gudang_id IS NOT NULL THEN
            PERFORM 1 FROM public.inventory_stocks
            WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id
            FOR UPDATE;
        END IF;

        v_subtotal := v_harga_final * v_qty;

        INSERT INTO public.pembelian_items (
            pembelian_id, inventory_id, nama_barang, qty, harga_beli, diskon, harga_final
        )
        VALUES (
            v_pembelian_id, v_inventory_id, v_item->>'nama_barang',
            v_qty, v_harga_beli, v_diskon, v_harga_final
        );

        UPDATE public.inventory
        SET harga_beli_terakhir = v_harga_beli,
            harga_jual = COALESCE(NULLIF((v_item->>'harga_jual')::NUMERIC, NULL), harga_jual),
            updated_by = v_actor,
            updated_at = NOW()
        WHERE id = v_inventory_id;

        INSERT INTO public.stock_movements (inventory_id, tipe, qty, referensi, gudang_id, created_at)
        VALUES (v_inventory_id, 'IN', v_qty, v_pembelian_id::TEXT, v_gudang_id, NOW());

        v_total_sistem := v_total_sistem + v_subtotal;
    END LOOP;

    UPDATE public.pembelian SET total_sistem = v_total_sistem WHERE id = v_pembelian_id;

    RETURN v_pembelian_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_pembelian_batch(
    p_pembelian_id uuid,
    p_items jsonb,
    p_supplier_id uuid,
    p_tanggal date,
    p_user uuid,
    p_nomor_nota text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
SET row_security TO 'off'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_pembelian RECORD;
    v_item JSONB;
    v_inventory_id UUID;
    v_total_sistem NUMERIC := 0;
    v_harga_beli NUMERIC;
    v_qty INTEGER;
    v_diskon NUMERIC;
    v_harga_final NUMERIC;

    v_existing_item RECORD;
    v_found BOOLEAN;
    v_stock_opname_id UUID := NULL;
    v_current_system_stock INTEGER;
    v_current_branch_stock INTEGER;
    v_qty_diff INTEGER;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya admin yang dapat mengubah transaksi pembelian.';
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_actor := p_user;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'p_items harus berupa JSON array';
    END IF;

    SELECT * INTO v_pembelian
    FROM public.pembelian
    WHERE id = p_pembelian_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi pembelian tidak ditemukan.';
    END IF;

    -- Lock semua pembelian_items eksisting
    PERFORM 1 FROM public.pembelian_items WHERE pembelian_id = p_pembelian_id FOR UPDATE;

    IF jsonb_array_length(p_items) = 0 THEN
        FOR v_existing_item IN
            SELECT inventory_id, qty, nama_barang
            FROM public.pembelian_items
            WHERE pembelian_id = p_pembelian_id
        LOOP
            SELECT stok INTO v_current_system_stock
            FROM public.inventory
            WHERE id = v_existing_item.inventory_id
            FOR UPDATE;

            IF v_pembelian.gudang_id IS NOT NULL THEN
                SELECT stok INTO v_current_branch_stock
                FROM public.inventory_stocks
                WHERE inventory_id = v_existing_item.inventory_id AND gudang_id = v_pembelian.gudang_id
                FOR UPDATE;

                IF COALESCE(v_current_branch_stock, 0) < v_existing_item.qty THEN
                    RAISE EXCEPTION 'Stok cabang tidak cukup untuk membatalkan item % (stok=%, qty=%)',
                        v_existing_item.nama_barang, COALESCE(v_current_branch_stock, 0), v_existing_item.qty;
                END IF;
            ELSIF COALESCE(v_current_system_stock, 0) < v_existing_item.qty THEN
                RAISE EXCEPTION 'Stok tidak cukup untuk membatalkan item %', v_existing_item.nama_barang;
            END IF;

            IF v_stock_opname_id IS NULL THEN
                SELECT id INTO v_stock_opname_id
                FROM public.stock_opname
                WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = v_actor
                LIMIT 1;

                IF v_stock_opname_id IS NULL THEN
                    INSERT INTO public.stock_opname (opname_date, status, created_by, gudang_id)
                    VALUES (CURRENT_DATE, 'draft', v_actor, v_pembelian.gudang_id)
                    RETURNING id INTO v_stock_opname_id;
                END IF;
            END IF;

            INSERT INTO public.stock_opname_items (
                stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note
            )
            VALUES (
                v_stock_opname_id, v_existing_item.inventory_id,
                v_current_system_stock, GREATEST(0, v_current_system_stock - v_existing_item.qty),
                -v_existing_item.qty, 'lainnya',
                'Pembatalan Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')'
            );
        END LOOP;

        DELETE FROM public.pembelian WHERE id = p_pembelian_id;
        RETURN jsonb_build_object('success', true, 'is_deleted', true);
    END IF;

    UPDATE public.pembelian
    SET supplier_id = p_supplier_id,
        supplier_nama = COALESCE((SELECT nama FROM public.supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
        tanggal = p_tanggal,
        nomor_nota = p_nomor_nota
    WHERE id = p_pembelian_id;

    FOR v_existing_item IN
        SELECT id, inventory_id, qty, nama_barang, harga_beli, diskon, harga_final
        FROM public.pembelian_items
        WHERE pembelian_id = p_pembelian_id
    LOOP
        v_found := false;

        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            IF (v_item->>'inventory_id' IS NOT NULL AND (v_item->>'inventory_id')::UUID = v_existing_item.inventory_id)
               OR (LOWER(v_item->>'nama_barang') = LOWER(v_existing_item.nama_barang)) THEN

                v_found := true;
                v_qty := (v_item->>'qty')::INTEGER;
                v_harga_beli := (v_item->>'harga')::NUMERIC;
                v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);

                IF v_qty IS NULL OR v_qty <= 0 THEN
                    RAISE EXCEPTION 'qty harus > 0 untuk item %', v_existing_item.nama_barang;
                END IF;
                IF v_harga_beli IS NULL OR v_harga_beli < 0 OR v_diskon < 0 OR v_diskon > v_harga_beli THEN
                    RAISE EXCEPTION 'harga/diskon tidak valid untuk item %', v_existing_item.nama_barang;
                END IF;

                v_harga_final := v_harga_beli - v_diskon;
                v_qty_diff := v_qty - v_existing_item.qty;

                IF v_qty_diff < 0 THEN
                    SELECT stok INTO v_current_system_stock
                    FROM public.inventory WHERE id = v_existing_item.inventory_id FOR UPDATE;
                    IF v_pembelian.gudang_id IS NOT NULL THEN
                        SELECT stok INTO v_current_branch_stock
                        FROM public.inventory_stocks
                        WHERE inventory_id = v_existing_item.inventory_id AND gudang_id = v_pembelian.gudang_id
                        FOR UPDATE;
                        IF COALESCE(v_current_branch_stock, 0) + v_qty_diff < 0 THEN
                            RAISE EXCEPTION 'Stok cabang tidak cukup untuk mengurangi qty item %', v_existing_item.nama_barang;
                        END IF;
                    ELSIF COALESCE(v_current_system_stock, 0) + v_qty_diff < 0 THEN
                        RAISE EXCEPTION 'Stok tidak cukup untuk mengurangi qty item %', v_existing_item.nama_barang;
                    END IF;
                END IF;

                UPDATE public.pembelian_items
                SET qty = v_qty,
                    harga_beli = v_harga_beli,
                    diskon = v_diskon,
                    harga_final = v_harga_final
                WHERE id = v_existing_item.id;

                UPDATE public.inventory
                SET harga_beli_terakhir = v_harga_beli,
                    harga_jual = COALESCE(NULLIF((v_item->>'harga_jual')::NUMERIC, NULL), harga_jual),
                    updated_by = v_actor,
                    updated_at = NOW()
                WHERE id = v_existing_item.inventory_id;

                IF v_qty_diff <> 0 THEN
                    SELECT stok INTO v_current_system_stock FROM public.inventory WHERE id = v_existing_item.inventory_id;

                    IF v_stock_opname_id IS NULL THEN
                        SELECT id INTO v_stock_opname_id
                        FROM public.stock_opname
                        WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = v_actor
                        LIMIT 1;
                        IF v_stock_opname_id IS NULL THEN
                            INSERT INTO public.stock_opname (opname_date, status, created_by, gudang_id)
                            VALUES (CURRENT_DATE, 'draft', v_actor, v_pembelian.gudang_id)
                            RETURNING id INTO v_stock_opname_id;
                        END IF;
                    END IF;

                    INSERT INTO public.stock_opname_items (
                        stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note
                    )
                    VALUES (
                        v_stock_opname_id, v_existing_item.inventory_id,
                        v_current_system_stock, GREATEST(0, v_current_system_stock + v_qty_diff),
                        v_qty_diff, 'lainnya',
                        'Koreksi Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')'
                    );
                END IF;

                EXIT;
            END IF;
        END LOOP;

        IF NOT v_found THEN
            SELECT stok INTO v_current_system_stock
            FROM public.inventory WHERE id = v_existing_item.inventory_id FOR UPDATE;

            IF v_pembelian.gudang_id IS NOT NULL THEN
                SELECT stok INTO v_current_branch_stock
                FROM public.inventory_stocks
                WHERE inventory_id = v_existing_item.inventory_id AND gudang_id = v_pembelian.gudang_id
                FOR UPDATE;
                IF COALESCE(v_current_branch_stock, 0) < v_existing_item.qty THEN
                    RAISE EXCEPTION 'Stok cabang tidak cukup untuk menghapus item %', v_existing_item.nama_barang;
                END IF;
            ELSIF COALESCE(v_current_system_stock, 0) < v_existing_item.qty THEN
                RAISE EXCEPTION 'Stok tidak cukup untuk menghapus item %', v_existing_item.nama_barang;
            END IF;

            IF v_stock_opname_id IS NULL THEN
                SELECT id INTO v_stock_opname_id
                FROM public.stock_opname
                WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = v_actor
                LIMIT 1;
                IF v_stock_opname_id IS NULL THEN
                    INSERT INTO public.stock_opname (opname_date, status, created_by, gudang_id)
                    VALUES (CURRENT_DATE, 'draft', v_actor, v_pembelian.gudang_id)
                    RETURNING id INTO v_stock_opname_id;
                END IF;
            END IF;

            INSERT INTO public.stock_opname_items (
                stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note
            )
            VALUES (
                v_stock_opname_id, v_existing_item.inventory_id,
                v_current_system_stock, GREATEST(0, v_current_system_stock - v_existing_item.qty),
                -v_existing_item.qty, 'lainnya',
                'Koreksi Hapus Item Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')'
            );

            DELETE FROM public.pembelian_items WHERE id = v_existing_item.id;
        END IF;
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_found := false;
        FOR v_existing_item IN
            SELECT inventory_id, nama_barang
            FROM public.pembelian_items
            WHERE pembelian_id = p_pembelian_id
        LOOP
            IF (v_item->>'inventory_id' IS NOT NULL AND (v_item->>'inventory_id')::UUID = v_existing_item.inventory_id)
               OR (LOWER(v_item->>'nama_barang') = LOWER(v_existing_item.nama_barang)) THEN
                v_found := true;
                EXIT;
            END IF;
        END LOOP;

        IF NOT v_found THEN
            v_harga_beli := (v_item->>'harga')::NUMERIC;
            v_qty := (v_item->>'qty')::INTEGER;
            v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);

            IF v_qty IS NULL OR v_qty <= 0 THEN
                RAISE EXCEPTION 'qty harus > 0 untuk item baru';
            END IF;
            IF v_harga_beli IS NULL OR v_harga_beli < 0 OR v_diskon < 0 OR v_diskon > v_harga_beli THEN
                RAISE EXCEPTION 'harga/diskon tidak valid untuk item baru';
            END IF;

            v_harga_final := v_harga_beli - v_diskon;

            IF v_item->>'inventory_id' IS NOT NULL THEN
                v_inventory_id := (v_item->>'inventory_id')::UUID;
            ELSE
                v_inventory_id := (SELECT id FROM public.inventory WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang') LIMIT 1);
            END IF;

            IF v_inventory_id IS NOT NULL THEN
                UPDATE public.inventory
                SET is_discontinued = false, discontinued_at = NULL, discontinued_by = NULL,
                    updated_at = NOW(), updated_by = v_actor
                WHERE id = v_inventory_id AND is_discontinued = true;
            ELSE
                INSERT INTO public.inventory (nama_barang, slug, harga_beli_terakhir, harga_jual, created_by, stok)
                VALUES (
                    v_item->>'nama_barang',
                    LOWER(REPLACE(REPLACE(v_item->>'nama_barang', ' ', '-'), '_', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
                    v_harga_beli,
                    (v_harga_beli * 1.2),
                    v_actor,
                    0
                ) RETURNING id INTO v_inventory_id;
            END IF;

            INSERT INTO public.pembelian_items (pembelian_id, inventory_id, nama_barang, qty, harga_beli, diskon, harga_final)
            VALUES (p_pembelian_id, v_inventory_id, v_item->>'nama_barang', v_qty, v_harga_beli, v_diskon, v_harga_final);

            UPDATE public.inventory
            SET harga_beli_terakhir = v_harga_beli,
                harga_jual = COALESCE(NULLIF((v_item->>'harga_jual')::NUMERIC, NULL), harga_jual),
                updated_by = v_actor,
                updated_at = NOW()
            WHERE id = v_inventory_id;

            INSERT INTO public.stock_movements (inventory_id, tipe, qty, referensi, gudang_id, created_at)
            VALUES (v_inventory_id, 'IN', v_qty, p_pembelian_id::TEXT, v_pembelian.gudang_id, NOW());
        END IF;
    END LOOP;

    SELECT COALESCE(SUM(harga_final * qty), 0) INTO v_total_sistem
    FROM public.pembelian_items WHERE pembelian_id = p_pembelian_id;

    UPDATE public.pembelian SET total_sistem = v_total_sistem WHERE id = p_pembelian_id;

    RETURN jsonb_build_object('success', true, 'pembelian_id', p_pembelian_id, 'is_deleted', false);
END;
$function$;

REVOKE ALL ON FUNCTION public.update_pembelian_batch(uuid, jsonb, uuid, date, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pembelian_batch(uuid, jsonb, uuid, date, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.proses_return_batch(
    p_supplier_id uuid,
    p_supplier_nama text,
    p_items jsonb,
    p_tanggal date DEFAULT CURRENT_DATE,
    p_note text DEFAULT NULL::text,
    p_idempotency_key uuid DEFAULT NULL::uuid,
    p_created_by uuid DEFAULT auth.uid(),
    p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(return_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin_or_finance BOOLEAN := false;

    v_return_id uuid;
    v_now timestamptz := now();
    v_item jsonb;
    v_pembelian_item_id uuid;
    v_inventory_id uuid;
    v_qty int;
    v_harga_beli numeric;
    v_diskon numeric;
    v_harga_final numeric;
    v_nama_barang text;
    v_sisa_return_qty int;
    v_current_stock int;
    v_gudang_id uuid;
    v_pembelian_gudang uuid;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang', 'finance']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan memproses retur supplier.';
        END IF;

        v_is_admin_or_finance := (v_roles && ARRAY['admin', 'finance']::TEXT[]);
        IF NOT v_is_admin_or_finance THEN
            IF v_user_gudang IS NULL THEN
                RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
            END IF;
            IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Tidak dapat memproses retur supplier untuk cabang lain.';
            END IF;
            v_gudang_id := v_user_gudang;
        ELSE
            v_gudang_id := p_gudang_id;
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_is_admin_or_finance := true;
        v_actor := p_created_by;
        v_gudang_id := p_gudang_id;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
    END IF;

    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
        END IF;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT pr.id INTO v_return_id
        FROM public.pembelian_return pr
        WHERE pr.idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_return_id IS NOT NULL THEN
            RETURN QUERY SELECT v_return_id;
            RETURN;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT (elem->>'pembelian_item_id')::uuid AS pembelian_item_id
            FROM jsonb_array_elements(p_items) elem
        ) s
        GROUP BY s.pembelian_item_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplikasi pembelian_item_id ditemukan dalam input';
    END IF;

    IF (SELECT COUNT(DISTINCT (elem->>'pembelian_item_id')::uuid) FROM jsonb_array_elements(p_items) elem)
       <>
       (
         SELECT COUNT(DISTINCT pi.id)
         FROM public.pembelian_items pi
         JOIN public.pembelian p ON p.id = pi.pembelian_id
         JOIN LATERAL (
             SELECT (elem->>'pembelian_item_id')::uuid AS pembelian_item_id
             FROM jsonb_array_elements(p_items) AS elem
         ) inp ON inp.pembelian_item_id = pi.id
         WHERE p.supplier_id = p_supplier_id
       )
    THEN
        RAISE EXCEPTION 'Ada pembelian_item_id yang tidak valid atau bukan milik supplier ini';
    END IF;

    INSERT INTO public.pembelian_return (
        pembelian_id, supplier_id, supplier_nama, tanggal, note,
        created_by, idempotency_key, gudang_id
    ) VALUES (
        NULL, p_supplier_id, p_supplier_nama, p_tanggal, p_note,
        v_actor, p_idempotency_key, v_gudang_id
    )
    RETURNING id INTO v_return_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
    LOOP
        v_pembelian_item_id := (v_item->>'pembelian_item_id')::uuid;
        v_qty := (v_item->>'qty')::int;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'qty harus > 0 (pembelian_item_id=%)', v_pembelian_item_id;
        END IF;

        SELECT pi.inventory_id, pi.nama_barang, pi.harga_beli, COALESCE(pi.diskon, 0), p.gudang_id
        INTO v_inventory_id, v_nama_barang, v_harga_beli, v_diskon, v_pembelian_gudang
        FROM public.pembelian_items pi
        JOIN public.pembelian p ON p.id = pi.pembelian_id
        WHERE pi.id = v_pembelian_item_id
          AND p.supplier_id = p_supplier_id
        FOR UPDATE OF pi;

        IF v_inventory_id IS NULL THEN
            RAISE EXCEPTION 'pembelian_item_id % tidak ditemukan atau tidak milik supplier %',
                v_pembelian_item_id, p_supplier_id;
        END IF;

        IF NOT v_is_admin_or_finance AND v_pembelian_gudang IS NOT NULL AND v_pembelian_gudang <> v_gudang_id THEN
            RAISE EXCEPTION 'Forbidden: Item pembelian berasal dari cabang lain.';
        END IF;

        SELECT (pi.qty - COALESCE(SUM(pri.qty), 0))::int
        INTO v_sisa_return_qty
        FROM public.pembelian_items pi
        LEFT JOIN public.pembelian_return_items pri
          ON pri.pembelian_item_id = pi.id AND pri.voided_at IS NULL
        WHERE pi.id = v_pembelian_item_id
        GROUP BY pi.qty;

        IF v_qty > v_sisa_return_qty THEN
            RAISE EXCEPTION 'Qty retur melebihi sisa untuk item % (qty=%, sisa=%)',
                v_nama_barang, v_qty, v_sisa_return_qty;
        END IF;

        v_harga_final := (v_harga_beli - v_diskon) * v_qty;
        IF v_harga_final < 0 THEN
            RAISE EXCEPTION 'harga_final menjadi negatif untuk item %', v_nama_barang;
        END IF;

        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id
        FOR UPDATE;

        IF COALESCE(v_current_stock, 0) < v_qty THEN
            RAISE EXCEPTION 'Stok fisik di gudang tidak cukup untuk item %: stok gudang=%, diminta retur=%',
                v_nama_barang, COALESCE(v_current_stock, 0), v_qty;
        END IF;

        UPDATE public.inventory_stocks
        SET stok = stok - v_qty,
            updated_at = v_now
        WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id;

        INSERT INTO public.pembelian_return_items (
            pembelian_return_id, pembelian_item_id, inventory_id, nama_barang,
            qty, harga_beli, diskon, harga_final
        ) VALUES (
            v_return_id, v_pembelian_item_id, v_inventory_id, v_nama_barang,
            v_qty, v_harga_beli, v_diskon, v_harga_final
        );

        INSERT INTO public.stock_movements (
            inventory_id, tipe, qty, referensi, gudang_id, created_at
        ) VALUES (
            v_inventory_id, 'OUT', v_qty, 'Retur Pembelian: ' || v_return_id::text, v_gudang_id, v_now
        );
    END LOOP;

    RETURN QUERY SELECT v_return_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pembelian_return_create(
    p_pembelian_id uuid,
    p_tanggal date,
    p_created_by uuid,
    p_note text,
    p_idempotency_key uuid,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_is_admin_or_finance BOOLEAN := false;
    v_pembelian RECORD;
    v_return_id uuid;
    v_now timestamptz := now();
    v_total_qty integer;
    v_item RECORD;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id
        INTO v_roles, v_user_gudang
        FROM public.profiles
        WHERE id = v_uid;

        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang', 'finance']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan memproses retur pembelian.';
        END IF;

        v_is_admin_or_finance := (v_roles && ARRAY['admin', 'finance']::TEXT[]);
        IF NOT v_is_admin_or_finance AND v_user_gudang IS NULL THEN
            RAISE EXCEPTION 'Forbidden: Akun belum memiliki penugasan cabang (default_gudang_id).';
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_is_admin_or_finance := true;
        v_actor := p_created_by;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT pr.id INTO v_return_id
        FROM public.pembelian_return pr
        WHERE pr.idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_return_id IS NOT NULL THEN
            RETURN jsonb_build_object('status', 'ok', 'pembelian_return_id', v_return_id, 'idempotent', true);
        END IF;
    END IF;

    SELECT * INTO v_pembelian FROM public.pembelian WHERE id = p_pembelian_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pembelian tidak ditemukan: %', p_pembelian_id;
    END IF;

    IF NOT v_is_admin_or_finance AND v_pembelian.gudang_id IS NOT NULL AND v_pembelian.gudang_id <> v_user_gudang THEN
        RAISE EXCEPTION 'Forbidden: Tidak dapat meretur pembelian cabang lain.';
    END IF;

    CREATE TEMP TABLE _ret_cart (
        pembelian_item_id uuid primary key,
        qty integer not null
    ) ON COMMIT DROP;

    INSERT INTO _ret_cart (pembelian_item_id, qty)
    SELECT c.pembelian_item_id, sum(c.qty) as qty
    FROM (
        SELECT nullif(btrim(coalesce(item->>'pembelian_item_id', '')), '')::uuid as pembelian_item_id,
               (item->>'qty')::int as qty
        FROM jsonb_array_elements(p_items) as item
    ) c
    GROUP BY c.pembelian_item_id;

    IF NOT EXISTS (SELECT 1 FROM _ret_cart) OR EXISTS (SELECT 1 FROM _ret_cart WHERE pembelian_item_id IS NULL OR qty IS NULL OR qty <= 0) THEN
        RAISE EXCEPTION 'VALIDASI gagal: qty harus > 0 dan pembelian_item_id tidak boleh null.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM _ret_cart c
        LEFT JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id AND pi.pembelian_id = p_pembelian_id
        WHERE pi.id IS NULL
    ) THEN
        RAISE EXCEPTION 'VALIDASI gagal: ada pembelian_item_id yang tidak valid untuk pembelian ini.';
    END IF;

    PERFORM 1
    FROM public.pembelian_items pi
    JOIN _ret_cart c ON c.pembelian_item_id = pi.id
    JOIN public.inventory inv ON inv.id = pi.inventory_id
    WHERE pi.pembelian_id = p_pembelian_id
    FOR UPDATE;

    PERFORM 1
    FROM public.pembelian_return pr
    JOIN public.pembelian_return_items pri ON pri.pembelian_return_id = pr.id
    WHERE pr.pembelian_id = p_pembelian_id
    FOR UPDATE;

    WITH returned_so_far AS (
        SELECT pri.pembelian_item_id, coalesce(sum(pri.qty), 0) as qty_return_total
        FROM public.pembelian_return_items pri
        JOIN public.pembelian_return pr ON pr.id = pri.pembelian_return_id
        WHERE pr.pembelian_id = p_pembelian_id
          AND pri.voided_at IS NULL
        GROUP BY pri.pembelian_item_id
    )
    SELECT 1 INTO v_return_id
    FROM (
        SELECT c.pembelian_item_id, c.qty as qty_new, pi.qty as qty_asli,
               coalesce(r.qty_return_total, 0) as qty_return_so_far
        FROM _ret_cart c
        JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id
        LEFT JOIN returned_so_far r ON r.pembelian_item_id = c.pembelian_item_id
    ) x
    WHERE (x.qty_return_so_far + x.qty_new) > x.qty_asli
    LIMIT 1;

    IF v_return_id IS NOT NULL THEN
        RAISE EXCEPTION 'RETURN LIMIT gagal: qty return melebihi qty asli per pembelian_item_id.';
    END IF;

    IF v_pembelian.gudang_id IS NOT NULL THEN
        FOR v_item IN (
            SELECT pi.inventory_id, sum(c.qty)::int as qty_sum
            FROM _ret_cart c
            JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id
            GROUP BY pi.inventory_id
        ) LOOP
            PERFORM 1 FROM public.inventory_stocks s
            WHERE s.inventory_id = v_item.inventory_id AND s.gudang_id = v_pembelian.gudang_id
            FOR UPDATE;

            IF NOT EXISTS (
                SELECT 1 FROM public.inventory_stocks s
                WHERE s.inventory_id = v_item.inventory_id
                  AND s.gudang_id = v_pembelian.gudang_id
                  AND s.stok >= v_item.qty_sum
            ) THEN
                RAISE EXCEPTION 'STOK cabang tidak cukup untuk return pembelian.';
            END IF;
        END LOOP;
    ELSIF EXISTS (
        SELECT 1
        FROM public.inventory inv
        JOIN (
            SELECT pi.inventory_id, sum(c.qty) as qty_sum
            FROM _ret_cart c
            JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id
            GROUP BY pi.inventory_id
        ) x ON x.inventory_id = inv.id
        WHERE inv.stok < x.qty_sum
    ) THEN
        RAISE EXCEPTION 'STOK tidak cukup untuk return pembelian';
    END IF;

    INSERT INTO public.pembelian_return (
        pembelian_id, tanggal, supplier_id, supplier_nama, note, created_by, created_at, idempotency_key, gudang_id
    )
    VALUES (
        p_pembelian_id, p_tanggal, v_pembelian.supplier_id, v_pembelian.supplier_nama,
        p_note, v_actor, v_now, p_idempotency_key, v_pembelian.gudang_id
    )
    RETURNING id INTO v_return_id;

    WITH ins AS (
        INSERT INTO public.pembelian_return_items (
            pembelian_return_id, pembelian_item_id, inventory_id, nama_barang,
            qty, harga_beli, diskon, harga_final
        )
        SELECT v_return_id, pi.id, pi.inventory_id, pi.nama_barang,
               c.qty, pi.harga_beli, coalesce(pi.diskon, 0), pi.harga_final
        FROM _ret_cart c
        JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id
        RETURNING qty
    )
    SELECT coalesce(sum(qty), 0) INTO v_total_qty FROM ins;

    IF v_pembelian.gudang_id IS NOT NULL THEN
        UPDATE public.inventory_stocks s
        SET stok = s.stok - x.qty_sum,
            updated_at = v_now
        FROM (
            SELECT pi.inventory_id, sum(c.qty) as qty_sum
            FROM _ret_cart c
            JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id
            GROUP BY pi.inventory_id
        ) x
        WHERE s.inventory_id = x.inventory_id AND s.gudang_id = v_pembelian.gudang_id;
    ELSE
        UPDATE public.inventory inv
        SET stok = inv.stok - x.qty_sum,
            updated_at = v_now
        FROM (
            SELECT pi.inventory_id, sum(c.qty) as qty_sum
            FROM _ret_cart c
            JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id
            GROUP BY pi.inventory_id
        ) x
        WHERE inv.id = x.inventory_id;
    END IF;

    INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, gudang_id, created_at)
    SELECT gen_random_uuid(), pi.inventory_id, 'OUT'::text, c.qty,
           'pembelian_return:' || v_return_id::text || ':' || c.pembelian_item_id::text,
           v_pembelian.gudang_id, v_now
    FROM _ret_cart c
    JOIN public.pembelian_items pi ON pi.id = c.pembelian_item_id;

    RETURN jsonb_build_object(
        'status', 'ok',
        'pembelian_return_id', v_return_id,
        'total_qty', v_total_qty,
        'idempotent', false,
        'affected_items', (
            SELECT jsonb_agg(jsonb_build_object('pembelian_item_id', pir.pembelian_item_id, 'qty', pir.qty))
            FROM public.pembelian_return_items pir
            WHERE pir.pembelian_return_id = v_return_id
        )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.pembelian_return_create(uuid, date, uuid, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pembelian_return_create(uuid, date, uuid, text, uuid, jsonb) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. [INT-05] Transfer Stok & Pengeluaran Gudang (Fail-Closed Branch Isolation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transfer_stok_batch(
    p_gudang_asal_id uuid,
    p_gudang_tujuan_id uuid,
    p_kurir_pengirim text DEFAULT NULL::text,
    p_catatan text DEFAULT NULL::text,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_user uuid DEFAULT NULL::uuid,
    p_auto_kirim boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_caller UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_nomor TEXT;
    v_header public.transfer_stok;
    v_item JSONB;
    v_inv_id UUID;
    v_qty_kirim INT;
    v_item_catatan TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang FROM public.profiles WHERE id = v_uid;
        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang', 'staff_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan membuat transfer stok.';
        END IF;
        IF NOT ('admin' = ANY(v_roles)) THEN
            IF v_user_gudang IS NULL OR p_gudang_asal_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Forbidden: Transfer stok hanya boleh dibuat dari gudang tugas Anda.';
            END IF;
        END IF;
        v_caller := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi';
        END IF;
        v_caller := p_user;
    END IF;

    IF p_gudang_asal_id = p_gudang_tujuan_id THEN
        RAISE EXCEPTION 'Gudang asal dan gudang tujuan tidak boleh sama';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Daftar barang transfer tidak boleh kosong';
    END IF;

    v_nomor := COALESCE(public.generate_nomor_transfer(), 'TRF/' || extract(epoch from now())::bigint::text);

    INSERT INTO public.transfer_stok (
        nomor_transfer, gudang_asal_id, gudang_tujuan_id,
        kurir_pengirim, catatan, status, created_by
    ) VALUES (
        v_nomor, p_gudang_asal_id, p_gudang_tujuan_id,
        p_kurir_pengirim, p_catatan, 'DRAFT', v_caller
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
            transfer_id, inventory_id, qty_kirim, qty_terima, catatan
        ) VALUES (
            v_header.id, v_inv_id, v_qty_kirim, 0, v_item_catatan
        );
    END LOOP;

    IF p_auto_kirim THEN
        PERFORM public.kirim_transfer_stok(v_header.id, v_caller);
        SELECT * INTO v_header FROM public.transfer_stok WHERE id = v_header.id;
    END IF;

    RETURN to_jsonb(v_header);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_transfer_stok_batch(uuid, uuid, text, text, jsonb, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_transfer_stok_batch(uuid, uuid, text, text, jsonb, uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.kirim_transfer_stok(
    p_transfer_id uuid,
    p_user uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_caller UUID;
    v_transfer RECORD;
    v_item RECORD;
    v_current_stock INT;
    v_user_gudang UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        IF NOT public.is_admin_or_lead_warehouse() THEN
            RAISE EXCEPTION 'Forbidden: Hanya Admin, Kepala Cabang, atau Kepala Gudang yang dapat mengirim transfer stok.';
        END IF;
        v_caller := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi.';
        END IF;
        v_caller := p_user;
    END IF;

    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_caller IS NULL THEN
        v_caller := v_transfer.created_by;
    END IF;

    IF v_transfer.status NOT IN ('DRAFT', 'REQUESTED', 'APPROVED') THEN
        RAISE EXCEPTION 'Transfer tidak dapat dikirim karena status saat ini: %', v_transfer.status;
    END IF;

    IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
        v_user_gudang := public.get_auth_user_default_gudang();
        IF v_user_gudang IS NULL OR v_transfer.gudang_asal_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Otoritas Ditolak: Hanya staf dari gudang asal atau Administrator yang dapat mengirim barang.';
        END IF;
    END IF;

    FOR v_item IN SELECT * FROM public.transfer_stok_items WHERE transfer_id = p_transfer_id
    LOOP
        IF v_item.qty_kirim IS NULL OR v_item.qty_kirim <= 0 THEN
            RAISE EXCEPTION 'Kuantitas kirim harus lebih besar dari 0 untuk item %', v_item.inventory_id;
        END IF;

        SELECT stok INTO v_current_stock
        FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id
        FOR UPDATE;

        IF v_current_stock IS NULL OR v_current_stock < v_item.qty_kirim THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk item % di gudang asal. Tersedia: %, Diminta: %',
                v_item.inventory_id, COALESCE(v_current_stock, 0), v_item.qty_kirim;
        END IF;

        UPDATE public.inventory_stocks
        SET stok = stok - v_item.qty_kirim,
            updated_at = now()
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_transfer.gudang_asal_id;

        INSERT INTO public.stock_movements (
            inventory_id, tipe, qty, referensi, gudang_id, gudang_tujuan_id, created_at
        ) VALUES (
            v_item.inventory_id, 'OUT', v_item.qty_kirim,
            'Transfer keluar: ' || v_transfer.nomor_transfer,
            v_transfer.gudang_asal_id, v_transfer.gudang_tujuan_id, now()
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
$function$;

REVOKE ALL ON FUNCTION public.kirim_transfer_stok(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kirim_transfer_stok(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.terima_transfer_stok(
    p_transfer_id uuid,
    p_items jsonb,
    p_user uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_caller UUID;
    v_roles TEXT[];
    v_transfer RECORD;
    v_item JSONB;
    v_inv_id UUID;
    v_real_inv_id UUID;
    v_qty_kirim INT;
    v_qty_terima INT;
    v_selisih INT;
    v_catatan TEXT;
    v_user_gudang UUID;
    v_expected_items_count INT;
    v_processed_inv_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang FROM public.profiles WHERE id = v_uid;
        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang', 'staff_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan mengonfirmasi penerimaan transfer.';
        END IF;
        v_caller := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi.';
        END IF;
        v_caller := p_user;
    END IF;

    SELECT * INTO v_transfer
    FROM public.transfer_stok
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Dokumen transfer tidak ditemukan';
    END IF;

    IF v_caller IS NULL THEN
        v_caller := v_transfer.created_by;
    END IF;

    IF v_transfer.status <> 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Transfer hanya dapat diterima saat berstatus IN_TRANSIT. Status saat ini: %', v_transfer.status;
    END IF;

    IF v_uid IS NOT NULL AND NOT ('admin' = ANY(v_roles)) THEN
        IF v_user_gudang IS NULL OR v_transfer.gudang_tujuan_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Otoritas Ditolak: Hanya staf dari cabang tujuan atau Administrator yang dapat mengonfirmasi penerimaan fisik.';
        END IF;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Daftar barang penerimaan transfer tidak boleh kosong.';
    END IF;

    SELECT COUNT(*) INTO v_expected_items_count
    FROM public.transfer_stok_items
    WHERE transfer_id = p_transfer_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := NULLIF(v_item->>'inventory_id', '')::UUID;
        v_qty_terima := (v_item->>'qty_terima')::INT;
        v_catatan := v_item->>'catatan';

        IF v_qty_terima IS NULL OR v_qty_terima < 0 THEN
            RAISE EXCEPTION 'Qty terima tidak boleh negatif';
        END IF;

        SELECT qty_kirim, inventory_id INTO v_qty_kirim, v_real_inv_id
        FROM public.transfer_stok_items
        WHERE transfer_id = p_transfer_id
          AND (
              (v_inv_id IS NOT NULL AND inventory_id = v_inv_id)
              OR (v_inv_id IS NOT NULL AND id = v_inv_id)
          )
        LIMIT 1
        FOR UPDATE;

        IF v_qty_kirim IS NULL AND jsonb_array_length(p_items) = 1 AND v_expected_items_count = 1 THEN
            SELECT qty_kirim, inventory_id INTO v_qty_kirim, v_real_inv_id
            FROM public.transfer_stok_items
            WHERE transfer_id = p_transfer_id
            LIMIT 1
            FOR UPDATE;
        END IF;

        IF v_qty_kirim IS NULL THEN
            RAISE EXCEPTION 'Item % tidak ditemukan pada dokumen transfer ini', COALESCE(v_inv_id::TEXT, 'unknown');
        END IF;

        IF v_real_inv_id = ANY(v_processed_inv_ids) THEN
            RAISE EXCEPTION 'Duplikasi item % pada daftar penerimaan transfer.', v_real_inv_id;
        END IF;
        v_processed_inv_ids := array_append(v_processed_inv_ids, v_real_inv_id);

        IF v_qty_terima > v_qty_kirim THEN
            RAISE EXCEPTION 'Qty terima (%) tidak boleh melebihi qty kirim (%) untuk item %', v_qty_terima, v_qty_kirim, v_real_inv_id;
        END IF;

        UPDATE public.transfer_stok_items
        SET qty_terima = v_qty_terima,
            catatan = COALESCE(NULLIF(v_catatan, ''), catatan)
        WHERE transfer_id = p_transfer_id AND inventory_id = v_real_inv_id;

        IF v_qty_terima > 0 THEN
            PERFORM 1 FROM public.inventory_stocks
            WHERE inventory_id = v_real_inv_id AND gudang_id = v_transfer.gudang_tujuan_id
            FOR UPDATE;

            INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
            VALUES (v_real_inv_id, v_transfer.gudang_tujuan_id, v_qty_terima, now())
            ON CONFLICT (inventory_id, gudang_id)
            DO UPDATE SET stok = public.inventory_stocks.stok + v_qty_terima,
                          updated_at = now();

            INSERT INTO public.stock_movements (
                inventory_id, tipe, qty, referensi, gudang_id, gudang_tujuan_id, created_at
            ) VALUES (
                v_real_inv_id, 'IN', v_qty_terima,
                'Transfer masuk: ' || v_transfer.nomor_transfer,
                v_transfer.gudang_tujuan_id, v_transfer.gudang_asal_id, now()
            );
        END IF;

        v_selisih := v_qty_kirim - v_qty_terima;
        IF v_selisih > 0 THEN
            INSERT INTO public.stock_adjustments (
                inventory_id, adjustment_qty, adjustment_type, reason, note, created_by
            ) VALUES (
                v_real_inv_id, v_selisih, 'decrease',
                'Selisih Transfer Stok (' || v_transfer.nomor_transfer || ')',
                COALESCE(NULLIF(v_catatan, ''), 'Selisih kurang saat penerimaan transfer ' || v_transfer.nomor_transfer),
                v_caller
            );
        END IF;
    END LOOP;

    IF array_length(v_processed_inv_ids, 1) IS DISTINCT FROM v_expected_items_count THEN
        RAISE EXCEPTION 'Seluruh item transfer (% item) wajib dikonfirmasi penerimaannya sekaligus.', v_expected_items_count;
    END IF;

    UPDATE public.transfer_stok
    SET status = 'RECEIVED',
        received_by = v_caller,
        tanggal_terima = now(),
        updated_at = now()
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', true, 'status', 'RECEIVED');
END;
$function$;

REVOKE ALL ON FUNCTION public.terima_transfer_stok(uuid, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terima_transfer_stok(uuid, jsonb, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.execute_pengeluaran_gudang(
    p_gudang_id uuid,
    p_tipe public.tipe_pengeluaran_gudang,
    p_catatan text,
    p_items jsonb,
    p_user uuid,
    p_auto_approve boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_caller UUID;
    v_roles TEXT[];
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
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT roles, default_gudang_id INTO v_roles, v_user_gudang FROM public.profiles WHERE id = v_uid;
        IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang', 'staff_gudang']::TEXT[]) THEN
            RAISE EXCEPTION 'Forbidden: Peran Anda tidak diizinkan membuat dokumen pengeluaran gudang.';
        END IF;
        v_is_lead := (v_roles && ARRAY['admin', 'kepala_gudang', 'kepala_cabang']::TEXT[]);
        IF NOT ('admin' = ANY(v_roles)) THEN
            IF v_user_gudang IS NULL OR p_gudang_id <> v_user_gudang THEN
                RAISE EXCEPTION 'Otoritas Ditolak: Anda hanya dapat membuat dokumen pengeluaran untuk gudang tugas Anda.';
            END IF;
        END IF;
        v_caller := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi';
        END IF;
        v_is_lead := true;
        v_caller := p_user;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Daftar barang pengeluaran tidak boleh kosong.';
    END IF;

    IF p_auto_approve AND v_is_lead THEN
        v_status := 'APPROVED';
    ELSE
        v_status := 'DRAFT';
    END IF;

    v_nomor := public.generate_nomor_pengeluaran_gudang();
    SELECT nama INTO v_gudang_nama FROM public.gudang WHERE id = p_gudang_id;

    INSERT INTO public.pengeluaran_gudang (
        nomor_dokumen, gudang_id, tipe, catatan, status,
        created_by, approved_by, approved_at, tanggal
    ) VALUES (
        v_nomor, p_gudang_id, p_tipe, p_catatan, v_status,
        v_caller,
        CASE WHEN v_status = 'APPROVED' THEN v_caller ELSE NULL END,
        CASE WHEN v_status = 'APPROVED' THEN now() ELSE NULL END,
        CURRENT_DATE
    ) RETURNING id INTO v_pengeluaran_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_inv_id := (v_item->>'inventory_id')::UUID;
        v_qty := (v_item->>'qty')::INT;
        v_alasan := v_item->>'alasan';

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Qty pengeluaran harus > 0 untuk item %', v_inv_id;
        END IF;

        -- Ambil HPP langsung dari master inventory (abaikan harga_pokok kiriman client)
        SELECT GREATEST(COALESCE(harga_beli_terakhir, 0), 0) INTO v_hpp
        FROM public.inventory
        WHERE id = v_inv_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Barang tidak ditemukan: %', v_inv_id;
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
            pengeluaran_id, inventory_id, qty, harga_pokok, alasan
        ) VALUES (
            v_pengeluaran_id, v_inv_id, v_qty, v_hpp, v_alasan
        );

        IF v_status = 'APPROVED' THEN
            UPDATE public.inventory_stocks
            SET stok = stok - v_qty,
                updated_at = now()
            WHERE inventory_id = v_inv_id AND gudang_id = p_gudang_id;

            INSERT INTO public.stock_movements (
                inventory_id, tipe, qty, referensi, gudang_id, created_at
            ) VALUES (
                v_inv_id, 'PENGELUARAN_' || p_tipe::TEXT, -v_qty,
                'Pengeluaran ' || p_tipe::TEXT || ': ' || v_nomor, p_gudang_id, now()
            );

            INSERT INTO public.stock_adjustments (
                inventory_id, adjustment_qty, adjustment_type, reason, note, created_by
            ) VALUES (
                v_inv_id, v_qty, 'decrease',
                'Pengeluaran Gudang (' || replace(p_tipe::TEXT, '_', ' ') || ')',
                v_nomor || COALESCE(' - ' || v_gudang_nama, '') || COALESCE(': ' || NULLIF(v_alasan, ''), NULLIF(': ' || p_catatan, ': '), ''),
                v_caller
            );

            v_total_nominal := v_total_nominal + (v_qty * v_hpp);
        END IF;
    END LOOP;

    IF v_status = 'APPROVED' AND v_total_nominal > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'BEBAN_SUSUT_GUDANG', v_pengeluaran_id,
            'Beban Susut Gudang (' || p_tipe::TEXT || ': ' || v_nomor || COALESCE(' - ' || v_gudang_nama, '') || ')',
            v_total_nominal, v_caller, p_gudang_id
        );
    END IF;

    RETURN v_pengeluaran_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.execute_pengeluaran_gudang(uuid, public.tipe_pengeluaran_gudang, text, jsonb, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_pengeluaran_gudang(uuid, public.tipe_pengeluaran_gudang, text, jsonb, uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_pengeluaran_gudang(
    p_pengeluaran_id uuid,
    p_user uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_caller UUID;
    v_doc RECORD;
    v_item RECORD;
    v_current_stock INT;
    v_hpp NUMERIC;
    v_total_nominal NUMERIC := 0;
    v_gudang_nama TEXT;
    v_user_gudang UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        IF NOT public.is_admin_or_lead_warehouse() THEN
            RAISE EXCEPTION 'Hanya Admin atau Kepala Cabang/Gudang yang berhak menyetujui pengeluaran barang';
        END IF;
        v_caller := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi';
        END IF;
        v_caller := p_user;
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

    IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
        v_user_gudang := public.get_auth_user_default_gudang();
        IF v_user_gudang IS NULL OR v_doc.gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Otoritas Ditolak: Anda hanya dapat menyetujui pengeluaran untuk gudang tugas Anda.';
        END IF;
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

        SELECT GREATEST(COALESCE(harga_beli_terakhir, v_item.harga_pokok, 0), 0)
        INTO v_hpp
        FROM public.inventory
        WHERE id = v_item.inventory_id;

        UPDATE public.inventory_stocks
        SET stok = stok - v_item.qty,
            updated_at = now()
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_doc.gudang_id;

        INSERT INTO public.stock_movements (
            inventory_id, tipe, qty, referensi, gudang_id, created_at
        ) VALUES (
            v_item.inventory_id, 'PENGELUARAN_' || v_doc.tipe::TEXT, -v_item.qty,
            'Pengeluaran ' || v_doc.tipe::TEXT || ': ' || v_doc.nomor_dokumen, v_doc.gudang_id, now()
        );

        INSERT INTO public.stock_adjustments (
            inventory_id, adjustment_qty, adjustment_type, reason, note, created_by
        ) VALUES (
            v_item.inventory_id, v_item.qty, 'decrease',
            'Pengeluaran Gudang (' || replace(v_doc.tipe::TEXT, '_', ' ') || ')',
            v_doc.nomor_dokumen || COALESCE(' - ' || v_gudang_nama, '') || COALESCE(': ' || NULLIF(v_item.alasan, ''), NULLIF(': ' || v_doc.catatan, ': '), ''),
            v_caller
        );

        v_total_nominal := v_total_nominal + (v_item.qty * COALESCE(v_hpp, 0));
    END LOOP;

    IF v_total_nominal > 0 THEN
        INSERT INTO public.buku_besar (
            tanggal, tipe_transaksi, sumber, referensi_id, keterangan, nominal, created_by, gudang_id
        ) VALUES (
            CURRENT_DATE, 'PENGELUARAN', 'BEBAN_SUSUT_GUDANG', v_doc.id,
            'Beban Susut Gudang (' || v_doc.tipe::TEXT || ': ' || v_doc.nomor_dokumen || COALESCE(' - ' || v_gudang_nama, '') || ')',
            v_total_nominal, v_caller, v_doc.gudang_id
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
$function$;

REVOKE ALL ON FUNCTION public.approve_pengeluaran_gudang(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pengeluaran_gudang(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reject_pengeluaran_gudang(
    p_pengeluaran_id uuid,
    p_note text,
    p_user uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_caller UUID;
    v_doc RECORD;
    v_user_gudang UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        IF NOT public.is_admin_or_lead_warehouse() THEN
            RAISE EXCEPTION 'Hanya Admin atau Kepala Cabang/Gudang yang berhak menolak pengajuan pengeluaran';
        END IF;
        v_caller := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Pengguna tidak terautentikasi';
        END IF;
        v_caller := p_user;
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

    IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
        v_user_gudang := public.get_auth_user_default_gudang();
        IF v_user_gudang IS NULL OR v_doc.gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Otoritas Ditolak: Anda hanya dapat menolak pengeluaran untuk gudang tugas Anda.';
        END IF;
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
$function$;

REVOKE ALL ON FUNCTION public.reject_pengeluaran_gudang(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_pengeluaran_gudang(uuid, text, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. [INT-05] Atomik Stock Opname Approval & Hardening
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_and_process_opname(p_opname_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_user_gudang UUID;
    v_opname RECORD;
    v_item RECORD;
    v_adjustment_type TEXT;
    v_adjustment_qty INTEGER;
    v_processed_count INTEGER := 0;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        IF NOT public.is_admin_or_lead_warehouse() THEN
            RAISE EXCEPTION 'Forbidden: Hanya Admin, Kepala Gudang, atau Kepala Cabang yang dapat menyetujui stock opname.';
        END IF;
    ELSIF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
    END IF;

    SELECT * INTO v_opname
    FROM public.stock_opname
    WHERE id = p_opname_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock opname dengan id % tidak ditemukan', p_opname_id;
    END IF;

    IF v_opname.status NOT IN ('draft', 'pending', 'submitted') THEN
        RAISE EXCEPTION 'Stock opname tidak dapat disetujui pada status saat ini: %', v_opname.status;
    END IF;

    IF v_opname.gudang_id IS NULL THEN
        RAISE EXCEPTION 'Stock opname wajib memiliki gudang_id yang valid.';
    END IF;

    IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
        v_user_gudang := public.get_auth_user_default_gudang();
        IF v_user_gudang IS NULL OR v_opname.gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Anda hanya dapat menyetujui stock opname untuk cabang tugas Anda.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.stock_opname_items
        WHERE stock_opname_id = p_opname_id AND physical_stock < 0
    ) THEN
        RAISE EXCEPTION 'Stok fisik (physical_stock) tidak boleh bernilai negatif.';
    END IF;

    UPDATE public.stock_opname
    SET status = 'approved',
        approved_by = COALESCE(v_uid, approved_by),
        updated_at = NOW()
    WHERE id = p_opname_id;

    FOR v_item IN
        SELECT *
        FROM public.stock_opname_items
        WHERE stock_opname_id = p_opname_id
          AND COALESCE(adjusted, false) = false
          AND difference <> 0
        FOR UPDATE
    LOOP
        v_adjustment_type := CASE WHEN v_item.difference > 0 THEN 'increase' ELSE 'decrease' END;
        v_adjustment_qty := ABS(v_item.difference);

        INSERT INTO public.stock_adjustments (
            stock_opname_item_id, inventory_id, adjustment_qty, adjustment_type, reason, note, created_by
        ) VALUES (
            v_item.id, v_item.inventory_id, v_adjustment_qty, v_adjustment_type,
            COALESCE(v_item.reason, 'lainnya'), v_item.note, COALESCE(v_uid, v_opname.created_by)
        );

        INSERT INTO public.stock_movements (
            inventory_id, gudang_id, tipe, qty, referensi
        ) VALUES (
            v_item.inventory_id, v_opname.gudang_id, 'ADJUSTMENT', v_adjustment_qty, p_opname_id::TEXT
        );

        PERFORM 1 FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_opname.gudang_id
        FOR UPDATE;

        INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
        VALUES (v_item.inventory_id, v_opname.gudang_id, v_item.physical_stock, NOW())
        ON CONFLICT (inventory_id, gudang_id)
        DO UPDATE SET stok = EXCLUDED.stok,
                      updated_at = NOW();

        UPDATE public.inventory
        SET stok = (SELECT COALESCE(SUM(stok), 0) FROM public.inventory_stocks WHERE inventory_id = v_item.inventory_id),
            updated_at = NOW()
        WHERE id = v_item.inventory_id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    UPDATE public.stock_opname_items
    SET adjusted = true
    WHERE stock_opname_id = p_opname_id
      AND difference <> 0;

    UPDATE public.stock_opname
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_opname_id;

    RETURN jsonb_build_object(
        'success', true,
        'processed_items', v_processed_count,
        'opname_id', p_opname_id,
        'gudang_id', v_opname.gudang_id
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_and_process_opname(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_and_process_opname(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_opname_adjustments(
    p_opname_id uuid,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID;
    v_actor UUID;
    v_user_gudang UUID;
    v_item RECORD;
    v_adjustment_type TEXT;
    v_adjustment_qty INTEGER;
    v_processed_count INTEGER := 0;
    v_opname RECORD;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        IF NOT public.is_admin_or_lead_warehouse() THEN
            RAISE EXCEPTION 'Forbidden: Hanya Admin, Kepala Gudang, atau Kepala Cabang yang dapat memproses penyesuaian opname.';
        END IF;
        v_actor := v_uid;
    ELSE
        IF current_setting('role', true) <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Sesi pengguna tidak ditemukan.';
        END IF;
        v_actor := p_user_id;
    END IF;

    SELECT * INTO v_opname
    FROM public.stock_opname
    WHERE id = p_opname_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock opname dengan id % tidak ditemukan', p_opname_id;
    END IF;

    IF v_opname.status <> 'approved' THEN
        RAISE EXCEPTION 'Stock opname harus berstatus approved sebelum diproses. Status saat ini: %', v_opname.status;
    END IF;

    IF v_opname.gudang_id IS NULL THEN
        RAISE EXCEPTION 'Stock opname wajib memiliki gudang_id yang valid.';
    END IF;

    IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
        v_user_gudang := public.get_auth_user_default_gudang();
        IF v_user_gudang IS NULL OR v_opname.gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Anda hanya dapat memproses stock opname untuk cabang tugas Anda.';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.stock_opname_items
        WHERE stock_opname_id = p_opname_id AND physical_stock < 0
    ) THEN
        RAISE EXCEPTION 'Stok fisik (physical_stock) tidak boleh bernilai negatif.';
    END IF;

    FOR v_item IN
        SELECT *
        FROM public.stock_opname_items
        WHERE stock_opname_id = p_opname_id
          AND COALESCE(adjusted, false) = false
          AND difference <> 0
        FOR UPDATE
    LOOP
        v_adjustment_type := CASE WHEN v_item.difference > 0 THEN 'increase' ELSE 'decrease' END;
        v_adjustment_qty := ABS(v_item.difference);

        INSERT INTO public.stock_adjustments (
            stock_opname_item_id, inventory_id, adjustment_qty, adjustment_type, reason, note, created_by
        ) VALUES (
            v_item.id, v_item.inventory_id, v_adjustment_qty, v_adjustment_type,
            COALESCE(v_item.reason, 'lainnya'), v_item.note, v_actor
        );

        INSERT INTO public.stock_movements (
            inventory_id, gudang_id, tipe, qty, referensi
        ) VALUES (
            v_item.inventory_id, v_opname.gudang_id, 'ADJUSTMENT', v_adjustment_qty, p_opname_id::TEXT
        );

        PERFORM 1 FROM public.inventory_stocks
        WHERE inventory_id = v_item.inventory_id AND gudang_id = v_opname.gudang_id
        FOR UPDATE;

        INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
        VALUES (v_item.inventory_id, v_opname.gudang_id, v_item.physical_stock, NOW())
        ON CONFLICT (inventory_id, gudang_id)
        DO UPDATE SET stok = EXCLUDED.stok,
                      updated_at = NOW();

        UPDATE public.inventory
        SET stok = (SELECT COALESCE(SUM(stok), 0) FROM public.inventory_stocks WHERE inventory_id = v_item.inventory_id),
            updated_at = NOW()
        WHERE id = v_item.inventory_id;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    UPDATE public.stock_opname_items
    SET adjusted = true
    WHERE stock_opname_id = p_opname_id
      AND difference <> 0;

    UPDATE public.stock_opname
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_opname_id;

    RETURN jsonb_build_object(
        'success', true,
        'processed_items', v_processed_count,
        'opname_id', p_opname_id,
        'gudang_id', v_opname.gudang_id
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.process_opname_adjustments(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_opname_adjustments(uuid, uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. [INT-04/05] POS Authorization (Cabut anon, CSPRNG PIN, Fail-Closed Branch)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_pos_authorization(
    p_action_type text DEFAULT 'access_settings'::text,
    p_gudang_id uuid DEFAULT NULL::uuid,
    p_device_name text DEFAULT NULL::text,
    p_action_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_cashier_name TEXT;
    v_gudang_id UUID;
    v_gudang_name TEXT;
    v_pin VARCHAR(6);
    v_new_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_action_type TEXT;
    v_active_req RECORD;
    v_retry_after INT;
    v_app_url TEXT;
    v_secret TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id, COALESCE(nama, username, 'Kasir')
    INTO v_roles, v_user_gudang, v_cashier_name
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang', 'staff_gudang']::TEXT[]) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Peran Anda tidak diizinkan meminta otorisasi POS');
    END IF;

    IF NOT ('admin' = ANY(v_roles)) THEN
        IF v_user_gudang IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Akun kasir belum memiliki penugasan cabang');
        END IF;
        IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
            RETURN jsonb_build_object('success', false, 'message', 'Tidak dapat meminta otorisasi untuk cabang lain');
        END IF;
        v_gudang_id := v_user_gudang;
    ELSE
        v_gudang_id := COALESCE(p_gudang_id, v_user_gudang);
    END IF;

    v_action_type := COALESCE(NULLIF(trim(p_action_type), ''), 'access_settings');

    SELECT id, created_at, expires_at
    INTO v_active_req
    FROM public.pos_authorizations
    WHERE cashier_id = v_user_id
      AND action_type = v_action_type
      AND status = 'pending'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_active_req IS NOT NULL AND v_active_req.created_at > now() - interval '30 seconds' THEN
        v_retry_after := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_active_req.created_at + interval '30 seconds' - now())))::INT);
        RETURN jsonb_build_object(
            'success', false,
            'request_id', v_active_req.id,
            'expires_at', v_active_req.expires_at,
            'retry_after_seconds', v_retry_after,
            'message', format('Permintaan sudah dikirim. Tunggu %s detik sebelum mengirim ulang.', v_retry_after)
        );
    END IF;

    IF v_cashier_name IS NULL THEN
        v_cashier_name := 'Kasir';
    END IF;

    IF v_gudang_id IS NOT NULL THEN
        SELECT nama INTO v_gudang_name FROM public.gudang WHERE id = v_gudang_id;
    END IF;

    UPDATE public.pos_authorizations
    SET status = 'expired', updated_at = now()
    WHERE cashier_id = v_user_id
      AND action_type = v_action_type
      AND status = 'pending';

    -- CSPRNG 6-digit PIN
    v_pin := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint & 2147483647) % 1000000)::text, 6, '0');
    v_expires_at := now() + interval '10 minutes';

    INSERT INTO public.pos_authorizations (
        cashier_id, cashier_name, gudang_id, gudang_name, device_name,
        action_type, action_metadata, pin_code, status, expires_at
    ) VALUES (
        v_user_id, v_cashier_name, v_gudang_id, COALESCE(v_gudang_name, 'Toko Utama'),
        p_device_name, v_action_type, COALESCE(p_action_metadata, '{}'::jsonb),
        v_pin, 'pending', v_expires_at
    ) RETURNING id INTO v_new_id;

    v_app_url := public.get_system_config('app_url', 'https://bms.bagusin.sbs');
    v_secret := public.get_system_config('webhook_secret', '');

    BEGIN
        PERFORM net.http_post(
            url := rtrim(v_app_url, '/') || '/api/push/notify-pos-auth',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-webhook-secret', v_secret
            ),
            body := jsonb_build_object(
                'request_id', v_new_id,
                'cashier_name', v_cashier_name,
                'gudang_id', v_gudang_id,
                'gudang_name', COALESCE(v_gudang_name, 'Toko Utama'),
                'action_type', v_action_type,
                'action_metadata', COALESCE(p_action_metadata, '{}'::jsonb)
            )
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_id,
        'expires_at', v_expires_at,
        'message', 'Permintaan otorisasi berhasil dikirim ke atasan'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.request_pos_authorization(text, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_pos_authorization(text, uuid, text, jsonb) TO authenticated, service_role;

-- Pertahankan 4-arg dengan p_request_id DEFAULT NULL agar kompatibel dengan Android POS 3-argumen
CREATE OR REPLACE FUNCTION public.verify_pos_authorization(
    p_pin text,
    p_action_type text DEFAULT 'access_settings'::text,
    p_gudang_id uuid DEFAULT NULL::uuid,
    p_request_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID;
    v_roles TEXT[];
    v_user_gudang UUID;
    v_clean_pin TEXT;
    v_action_type TEXT;
    v_req RECORD;
    v_new_attempts INTEGER;
    v_max_attempts INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT roles, default_gudang_id INTO v_roles, v_user_gudang
    FROM public.profiles WHERE id = v_user_id;

    IF v_roles IS NULL OR NOT (v_roles && ARRAY['admin', 'kasir', 'kepala_cabang', 'kepala_gudang', 'staff_gudang']::TEXT[]) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Peran Anda tidak diizinkan memverifikasi otorisasi POS');
    END IF;

    IF NOT ('admin' = ANY(v_roles)) THEN
        IF v_user_gudang IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Akun kasir belum memiliki penugasan cabang');
        END IF;
        IF p_gudang_id IS NOT NULL AND p_gudang_id <> v_user_gudang THEN
            RETURN jsonb_build_object('success', false, 'message', 'Tidak dapat memverifikasi otorisasi cabang lain');
        END IF;
    END IF;

    v_clean_pin := trim(COALESCE(p_pin, ''));
    IF length(v_clean_pin) <> 6 OR v_clean_pin !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Format PIN harus 6 digit angka');
    END IF;

    v_action_type := COALESCE(NULLIF(trim(p_action_type), ''), 'access_settings');

    UPDATE public.pos_authorizations
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending'
      AND cashier_id = v_user_id
      AND expires_at <= now();

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE status = 'pending'
      AND cashier_id = v_user_id
      AND action_type = v_action_type
      AND (p_request_id IS NULL OR id = p_request_id)
      AND (
          (NOT ('admin' = ANY(v_roles)) AND (gudang_id = v_user_gudang OR gudang_id IS NULL))
          OR ('admin' = ANY(v_roles) AND (p_gudang_id IS NULL OR gudang_id = p_gudang_id OR gudang_id IS NULL))
      )
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Tidak ada permohonan otorisasi yang aktif atau permohonan telah kedaluwarsa'
        );
    END IF;

    IF v_req.pin_code = v_clean_pin THEN
        UPDATE public.pos_authorizations
        SET status = 'used',
            used_at = now(),
            updated_at = now()
        WHERE id = v_req.id;

        RETURN jsonb_build_object(
            'success', true,
            'request_id', v_req.id,
            'message', 'Otorisasi berhasil diberikan'
        );
    ELSE
        v_new_attempts := COALESCE(v_req.attempt_count, 0) + 1;
        v_max_attempts := LEAST(GREATEST(COALESCE(v_req.max_attempts, 5), 1), 5);

        IF v_new_attempts >= v_max_attempts THEN
            UPDATE public.pos_authorizations
            SET attempt_count = v_new_attempts,
                status = 'rejected',
                updated_at = now()
            WHERE id = v_req.id;

            RETURN jsonb_build_object(
                'success', false,
                'request_id', v_req.id,
                'attempts_remaining', 0,
                'is_blocked', true,
                'message', 'PIN salah melebihi batas. Permohonan dibatalkan, silakan minta otorisasi baru.'
            );
        ELSE
            UPDATE public.pos_authorizations
            SET attempt_count = v_new_attempts,
                updated_at = now()
            WHERE id = v_req.id;

            RETURN jsonb_build_object(
                'success', false,
                'request_id', v_req.id,
                'attempts_remaining', v_max_attempts - v_new_attempts,
                'is_blocked', false,
                'message', format('PIN salah. Sisa kesempatan: %s kali', v_max_attempts - v_new_attempts)
            );
        END IF;
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_pos_authorization(text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_pos_authorization(text, text, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_pos_authorization(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID;
    v_req RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pengguna tidak terautentikasi');
    END IF;

    SELECT * INTO v_req
    FROM public.pos_authorizations
    WHERE id = p_id
    FOR UPDATE;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permohonan tidak ditemukan');
    END IF;

    IF NOT (v_req.claimed_by_id = v_user_id OR public.is_admin()) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Hanya pengklaim atau admin yang bisa melepas tugas.');
    END IF;

    UPDATE public.pos_authorizations
    SET claimed_by_id = NULL,
        claimed_by_name = NULL,
        claimed_at = NULL,
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tugas berhasil dikembalikan ke antrean umum'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.release_pos_authorization(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_pos_authorization(uuid) TO authenticated, service_role;
