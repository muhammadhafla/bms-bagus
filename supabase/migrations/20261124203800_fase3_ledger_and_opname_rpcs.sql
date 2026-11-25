-- ==============================================================================
-- MIGRATION: 20261124203800_fase3_ledger_and_opname_rpcs.sql
-- FASE 3C-1:
--   1. public.get_ledger_paginated(...) RETURNS jsonb (server-side pagination + summary)
--   2. public.bulk_update_opname_items(...) RETURNS jsonb (set-based opname save)
--   3. public.get_loyalty_dashboard_metrics() RETURNS jsonb (server-side loyalty aggregates)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_ledger_paginated(
    p_start_date date DEFAULT NULL::date,
    p_end_date date DEFAULT NULL::date,
    p_tipe text DEFAULT NULL::text,
    p_sumber text DEFAULT NULL::text,
    p_search text DEFAULT NULL::text,
    p_gudang_id uuid DEFAULT NULL::uuid,
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_opening_balance NUMERIC := 0;
    v_page INTEGER := GREATEST(1, COALESCE(p_page, 1));
    v_limit INTEGER := LEAST(1000, GREATEST(1, COALESCE(p_limit, 50)));
    v_offset INTEGER := (GREATEST(1, COALESCE(p_page, 1)) - 1) * LEAST(1000, GREATEST(1, COALESCE(p_limit, 50)));
    v_escaped_search TEXT;
    v_result JSONB;
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_finance_or_admin() THEN
        RAISE EXCEPTION 'Akses ditolak: Buku besar hanya untuk Admin atau Finance';
    END IF;

    IF p_start_date IS NOT NULL THEN
        SELECT COALESCE(SUM(CASE WHEN b.tipe_transaksi = 'PEMASUKAN' THEN b.nominal ELSE -b.nominal END), 0)
        INTO v_opening_balance
        FROM public.buku_besar b
        WHERE b.tanggal < p_start_date
          AND (p_gudang_id IS NULL OR b.gudang_id = p_gudang_id);
    END IF;

    v_escaped_search := CASE
        WHEN p_search IS NULL OR btrim(p_search) = '' THEN NULL
        ELSE replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_')
    END;

    WITH filtered_ledger AS (
        SELECT
            b.id,
            b.tanggal,
            b.tipe_transaksi::text AS tipe_transaksi,
            b.sumber::text AS sumber,
            b.referensi_id,
            b.keterangan,
            b.nominal,
            b.created_by,
            b.created_at,
            b.gudang_id,
            jsonb_build_object('nama', p.nama) AS profiles,
            jsonb_build_object('id', g.id, 'nama', g.nama, 'kode_gudang', g.kode_gudang) AS gudang
        FROM public.buku_besar b
        LEFT JOIN public.profiles p ON p.id = b.created_by
        LEFT JOIN public.gudang g ON g.id = b.gudang_id
        WHERE
            (p_start_date IS NULL OR b.tanggal >= p_start_date)
            AND (p_end_date IS NULL OR b.tanggal <= p_end_date)
            AND (p_tipe IS NULL OR b.tipe_transaksi::text = p_tipe)
            AND (p_sumber IS NULL OR b.sumber::text = p_sumber)
            AND (p_gudang_id IS NULL OR b.gudang_id = p_gudang_id)
            AND (v_escaped_search IS NULL OR b.keterangan ILIKE '%' || v_escaped_search || '%' ESCAPE '\')
    ),
    ledger_with_balance AS (
        SELECT
            fl.*,
            v_opening_balance + SUM(CASE WHEN fl.tipe_transaksi = 'PEMASUKAN' THEN fl.nominal ELSE -fl.nominal END)
                OVER (ORDER BY fl.tanggal ASC, fl.created_at ASC, fl.id ASC) AS saldo_berjalan
        FROM filtered_ledger fl
    ),
    summary AS (
        SELECT
            COUNT(*)::integer AS total_count,
            COALESCE(SUM(CASE WHEN tipe_transaksi = 'PEMASUKAN' THEN nominal ELSE 0 END), 0) AS total_pemasukan,
            COALESCE(SUM(CASE WHEN tipe_transaksi = 'PENGELUARAN' THEN nominal ELSE 0 END), 0) AS total_pengeluaran
        FROM ledger_with_balance
    ),
    latest_row AS (
        SELECT saldo_berjalan
        FROM ledger_with_balance
        ORDER BY tanggal DESC, created_at DESC, id DESC
        LIMIT 1
    ),
    paged_rows AS (
        SELECT
            id, tanggal, tipe_transaksi, sumber, referensi_id,
            keterangan, nominal, created_by, created_at, gudang_id,
            profiles, gudang, saldo_berjalan
        FROM ledger_with_balance
        ORDER BY tanggal DESC, created_at DESC, id DESC
        LIMIT v_limit
        OFFSET v_offset
    )
    SELECT jsonb_build_object(
        'items', COALESCE(
            (SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.tanggal DESC, pr.created_at DESC, pr.id DESC) FROM paged_rows pr),
            '[]'::jsonb
        ),
        'total_count', s.total_count,
        'total_pemasukan', s.total_pemasukan,
        'total_pengeluaran', s.total_pengeluaran,
        'opening_balance', v_opening_balance,
        'net_balance', s.total_pemasukan - s.total_pengeluaran,
        'closing_balance', COALESCE((SELECT lr.saldo_berjalan FROM latest_row lr), v_opening_balance),
        'page', v_page,
        'limit', v_limit
    )
    INTO v_result
    FROM summary s;

    RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_ledger_paginated(date, date, text, text, text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ledger_paginated(date, date, text, text, text, uuid, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bulk_update_opname_items(
    p_opname_id uuid,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_opname public.stock_opname%ROWTYPE;
    v_user_gudang UUID;
    v_updated_count INTEGER := 0;
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin') THEN
        IF v_uid IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: sesi pengguna tidak valid';
        END IF;
        IF NOT public.is_admin()
           AND NOT public.has_any_role(ARRAY['kepala_cabang', 'kepala_gudang', 'staff_gudang']) THEN
            RAISE EXCEPTION 'Forbidden: Anda tidak memiliki izin untuk memperbarui stock opname';
        END IF;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'Payload p_items harus berupa JSON array';
    END IF;

    SELECT * INTO v_opname
    FROM public.stock_opname
    WHERE id = p_opname_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stock opname dengan id % tidak ditemukan', p_opname_id;
    END IF;

    IF v_opname.status NOT IN ('draft', 'pending') THEN
        RAISE EXCEPTION 'Stock opname berstatus % tidak dapat diubah lagi', v_opname.status;
    END IF;

    IF v_uid IS NOT NULL AND NOT public.is_admin() THEN
        v_user_gudang := public.get_auth_user_default_gudang();
        IF v_user_gudang IS NULL OR v_opname.gudang_id IS NULL OR v_opname.gudang_id <> v_user_gudang THEN
            RAISE EXCEPTION 'Forbidden: Anda hanya dapat mengubah stock opname untuk cabang tugas Anda.';
        END IF;
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', true, 'updated_count', 0);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_items) AS x(id uuid, physical_stock integer, reason text, note text)
        WHERE COALESCE(x.physical_stock, 0) < 0
    ) THEN
        RAISE EXCEPTION 'Stok fisik (physical_stock) tidak boleh bernilai negatif.';
    END IF;

    UPDATE public.stock_opname_items AS soi
    SET physical_stock = COALESCE(x.physical_stock, 0),
        difference = COALESCE(x.physical_stock, 0) - soi.system_stock,
        reason = x.reason,
        note = x.note,
        updated_at = NOW()
    FROM jsonb_to_recordset(p_items) AS x(
        id uuid,
        physical_stock integer,
        reason text,
        note text
    )
    WHERE soi.id = x.id
      AND soi.stock_opname_id = p_opname_id
      AND COALESCE(soi.adjusted, false) = false;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.bulk_update_opname_items(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_opname_items(uuid, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_loyalty_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_start_of_month TIMESTAMPTZ;
    v_committed_budget NUMERIC := 0;
    v_realized_budget NUMERIC := 0;
    v_active_vouchers_count INTEGER := 0;
    v_used_vouchers_count INTEGER := 0;
    v_total_members_count INTEGER := 0;
    v_total_points NUMERIC := 0;
    v_active_fcm_count INTEGER := 0;
BEGIN
    IF current_setting('role', true) <> 'service_role'
       AND current_user NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Metrik loyalitas hanya untuk Admin';
    END IF;

    v_start_of_month := date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';

    SELECT
        COALESCE(SUM(
            CASE
                WHEN created_at >= v_start_of_month
                     AND ((status = 'active' AND expires_at >= NOW()) OR status = 'used')
                THEN COALESCE(discount_nominal, 0)
                ELSE 0
            END
        ), 0),
        COALESCE(SUM(
            CASE
                WHEN created_at >= v_start_of_month AND status = 'used'
                THEN COALESCE(discount_nominal, 0)
                ELSE 0
            END
        ), 0),
        COUNT(*) FILTER (WHERE status = 'active' AND expires_at >= NOW())::integer,
        COUNT(*) FILTER (WHERE status = 'used')::integer
    INTO
        v_committed_budget,
        v_realized_budget,
        v_active_vouchers_count,
        v_used_vouchers_count
    FROM public.member_vouchers;

    SELECT
        COUNT(*)::integer,
        COALESCE(SUM(COALESCE(points, 0)), 0)
    INTO
        v_total_members_count,
        v_total_points
    FROM public.members;

    SELECT COUNT(*)::integer
    INTO v_active_fcm_count
    FROM public.member_fcm_tokens;

    RETURN jsonb_build_object(
        'committed_budget', v_committed_budget,
        'realized_budget', v_realized_budget,
        'active_vouchers_count', v_active_vouchers_count,
        'used_vouchers_count', v_used_vouchers_count,
        'total_members_count', v_total_members_count,
        'total_points_in_circulation', v_total_points,
        'active_fcm_devices_count', v_active_fcm_count
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_loyalty_dashboard_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_loyalty_dashboard_metrics() TO authenticated, service_role;
