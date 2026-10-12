-- ====================================================================
-- Migration: 20261012153000_complete_warehouse_integration.sql
-- Description: Integrasi Menyeluruh Multi-Gudang (gudang_id)
--   1. Tambah kolom gudang_id pada pembelian_return
--   2. Perbarui RPC tambah_pembelian_batch dengan gudang_id
--   3. Perbarui RPC proses_return_batch dengan pemotongan inventory_stocks
--   4. Perbarui RPC get_sales_report & get_profit_report dengan filter p_gudang_id
-- ====================================================================

-- 1. TABEL PEMBELIAN_RETURN: TAMBAH GUDANG_ID
ALTER TABLE public.pembelian_return 
  ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_pembelian_return_gudang_id ON public.pembelian_return(gudang_id);

DO $$
DECLARE
  v_default_gudang_id UUID;
BEGIN
  SELECT id INTO v_default_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
  IF v_default_gudang_id IS NULL THEN
    SELECT id INTO v_default_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
  END IF;

  IF v_default_gudang_id IS NOT NULL THEN
    UPDATE public.pembelian_return SET gudang_id = v_default_gudang_id WHERE gudang_id IS NULL;
  END IF;
END $$;


-- 2. PERBARUI RPC: public.tambah_pembelian_batch
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
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
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
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
  END IF;

  v_gudang_id := p_gudang_id;
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
  END IF;

  IF p_idempotency_key IS NULL THEN
    p_idempotency_key := gen_random_uuid();
  END IF;

  INSERT INTO public.pembelian (
    supplier_id,
    tanggal,
    created_by,
    supplier_nama,
    idempotency_key,
    nomor_nota,
    gudang_id
  )
  SELECT 
    p_supplier_id,
    p_tanggal,
    p_user,
    COALESCE((SELECT nama FROM public.supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
    p_idempotency_key,
    p_nomor_nota,
    v_gudang_id
  RETURNING id INTO v_pembelian_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_id := (
      SELECT id FROM public.inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    IF v_inventory_id IS NOT NULL THEN
      IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
        RAISE EXCEPTION 'harga tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;
      IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
        RAISE EXCEPTION 'qty harus > 0 untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;

      UPDATE public.inventory 
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

      INSERT INTO public.inventory (
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
    v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);
    v_harga_final := v_harga_beli - v_diskon;
    v_subtotal := v_harga_final * v_qty;

    INSERT INTO public.pembelian_items (
      pembelian_id,
      inventory_id,
      nama_barang,
      qty,
      harga_beli,
      diskon,
      harga_final
    )
    VALUES (
      v_pembelian_id,
      v_inventory_id,
      v_item->>'nama_barang',
      v_qty,
      v_harga_beli,
      v_diskon,
      v_harga_final
    );

    UPDATE public.inventory 
    SET 
      harga_beli_terakhir = v_harga_beli,
      harga_jual = COALESCE((v_item->>'harga_jual')::NUMERIC, harga_jual),
      updated_by = p_user,
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

-- Overloaded wrapper for 6-arg version
CREATE OR REPLACE FUNCTION public.tambah_pembelian_batch(
  p_items jsonb,
  p_supplier_id uuid,
  p_tanggal date,
  p_user uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid,
  p_nomor_nota text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT public.tambah_pembelian_batch(p_items, p_supplier_id, p_tanggal, p_user, p_idempotency_key, p_nomor_nota, NULL::uuid);
$$;

GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid, text) TO service_role;


-- 3. PERBARUI RPC: public.proses_return_batch (DENGAN PEMOTONGAN INVENTORY_STOCKS)
CREATE OR REPLACE FUNCTION public.proses_return_batch(
  p_supplier_id uuid,
  p_supplier_nama text,
  p_items jsonb,
  p_tanggal date DEFAULT CURRENT_DATE,
  p_note text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid(),
  p_gudang_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(return_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
BEGIN
  IF p_items IS NULL THEN
    RAISE EXCEPTION 'p_items tidak boleh NULL';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items tidak boleh kosong';
  END IF;

  v_gudang_id := p_gudang_id;
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
    pembelian_id,
    supplier_id,
    supplier_nama,
    tanggal,
    note,
    created_by,
    idempotency_key,
    gudang_id
  ) VALUES (
    NULL,
    p_supplier_id,
    p_supplier_nama,
    p_tanggal,
    p_note,
    p_created_by,
    p_idempotency_key,
    v_gudang_id
  )
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_pembelian_item_id := (v_item->>'pembelian_item_id')::uuid;
    v_inventory_id := (v_item->>'inventory_id')::uuid;
    v_qty := (v_item->>'qty')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0 (pembelian_item_id=%)', v_pembelian_item_id;
    END IF;

    SELECT
      pi.inventory_id,
      pi.nama_barang,
      pi.harga_beli,
      COALESCE(pi.diskon, 0)
    INTO
      v_inventory_id,
      v_nama_barang,
      v_harga_beli,
      v_diskon
    FROM public.pembelian_items pi
    JOIN public.pembelian p ON p.id = pi.pembelian_id
    WHERE pi.id = v_pembelian_item_id
      AND p.supplier_id = p_supplier_id
    FOR UPDATE;

    IF v_inventory_id IS NULL THEN
      RAISE EXCEPTION 'pembelian_item_id % tidak ditemukan atau tidak milik supplier %',
        v_pembelian_item_id, p_supplier_id;
    END IF;

    SELECT (pi.qty - COALESCE(SUM(pri.qty), 0))::int
    INTO v_sisa_return_qty
    FROM public.pembelian_items pi
    LEFT JOIN public.pembelian_return_items pri
      ON pri.pembelian_item_id = pi.id
      AND pri.voided_at IS NULL
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
      pembelian_return_id,
      pembelian_item_id,
      inventory_id,
      nama_barang,
      qty,
      harga_beli,
      diskon,
      harga_final
    ) VALUES (
      v_return_id,
      v_pembelian_item_id,
      v_inventory_id,
      v_nama_barang,
      v_qty,
      v_harga_beli,
      v_diskon,
      v_harga_final
    );

    INSERT INTO public.stock_movements (
      inventory_id,
      tipe,
      qty,
      referensi,
      gudang_id,
      created_at
    ) VALUES (
      v_inventory_id,
      'OUT',
      v_qty,
      'Retur Pembelian: ' || v_return_id::text,
      v_gudang_id,
      v_now
    );
  END LOOP;

  RETURN QUERY SELECT v_return_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.proses_return_batch(
  p_supplier_id uuid,
  p_supplier_nama text,
  p_items jsonb,
  p_tanggal date DEFAULT CURRENT_DATE,
  p_note text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS TABLE(return_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.proses_return_batch(p_supplier_id, p_supplier_nama, p_items, p_tanggal, p_note, p_idempotency_key, p_created_by, NULL::uuid);
$$;

GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid) TO service_role;


-- 4. PERBARUI RPC: public.get_sales_report (DENGAN FILTER GUDANG)
CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20,
  p_gudang_id   UUID    DEFAULT NULL
)
RETURNS TABLE(
  report_date         DATE,
  total_sales         NUMERIC,
  total_cash          NUMERIC,
  total_qris          NUMERIC,
  total_items         BIGINT,
  transaction_count   BIGINT,
  total_count         BIGINT,
  grand_total_sales   NUMERIC,
  grand_total_cash    NUMERIC,
  grand_total_qris    NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
  v_limit  INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT
      p.tanggal,
      pi.penjualan_id,
      SUM(pi.harga_final * pi.qty) AS item_total,
      SUM(pi.qty) AS qty,
      MAX(COALESCE(p.cash_amount, 0) - COALESCE(p.kembalian, 0)) AS cash_amount,
      MAX(p.qris_amount) AS qris_amount
    FROM public.penjualan_items pi
    JOIN public.penjualan p ON p.id = pi.penjualan_id
    JOIN public.inventory i ON i.id = pi.inventory_id
    WHERE
      (p_start_date  IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
      AND (p_gudang_id IS NULL OR p.gudang_id = p_gudang_id)
    GROUP BY p.tanggal, pi.penjualan_id
  ),
  daily_agg AS (
    SELECT
      fi.tanggal,
      SUM(fi.item_total)                            AS total_sales,
      SUM(COALESCE(fi.cash_amount, 0))              AS total_cash,
      SUM(COALESCE(fi.qris_amount, 0))              AS total_qris,
      SUM(fi.qty)                                   AS total_items,
      COUNT(fi.penjualan_id)                        AS transaction_count
    FROM filtered_items fi
    GROUP BY fi.tanggal
  )
  SELECT
    da.tanggal                                     AS report_date,
    da.total_sales,
    da.total_cash,
    da.total_qris,
    da.total_items::BIGINT,
    da.transaction_count::BIGINT,
    COUNT(*) OVER()::BIGINT                        AS total_count,
    SUM(da.total_sales) OVER()::NUMERIC            AS grand_total_sales,
    SUM(da.total_cash) OVER()::NUMERIC             AS grand_total_cash,
    SUM(da.total_qris) OVER()::NUMERIC             AS grand_total_qris
  FROM daily_agg da
  ORDER BY da.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

-- Overloaded 5-arg wrapper
CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date         DATE,
  total_sales         NUMERIC,
  total_cash          NUMERIC,
  total_qris          NUMERIC,
  total_items         BIGINT,
  transaction_count   BIGINT,
  total_count         BIGINT,
  grand_total_sales   NUMERIC,
  grand_total_cash    NUMERIC,
  grand_total_qris    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.get_sales_report(p_start_date, p_end_date, p_category_id, p_page, p_limit, NULL::uuid);
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_report(DATE, DATE, UUID, INTEGER, INTEGER) TO service_role;


-- 5. PERBARUI RPC: public.get_profit_report (DENGAN FILTER GUDANG)
CREATE OR REPLACE FUNCTION public.get_profit_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20,
  p_gudang_id   UUID    DEFAULT NULL
)
RETURNS TABLE(
  report_date            DATE,
  total_modal            NUMERIC,
  total_penjualan        NUMERIC,
  total_profit           NUMERIC,
  margin_percentage      NUMERIC,
  total_count            BIGINT,
  grand_total_modal      NUMERIC,
  grand_total_penjualan  NUMERIC,
  grand_total_profit     NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (GREATEST(1, p_page) - 1) * LEAST(100, GREATEST(1, p_limit));
  v_limit  INTEGER := LEAST(100, GREATEST(1, p_limit));
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT
      p.tanggal,
      pi.cost_at_sale * pi.qty AS item_cogs,
      pi.harga_final  * pi.qty AS item_revenue
    FROM public.penjualan_items pi
    JOIN public.penjualan p ON p.id = pi.penjualan_id
    JOIN public.inventory i ON i.id = pi.inventory_id
    WHERE
      (p_start_date  IS NULL OR p.tanggal >= p_start_date)
      AND (p_end_date  IS NULL OR p.tanggal <= p_end_date)
      AND (p_category_id IS NULL OR i.id_kategori = p_category_id)
      AND (p_gudang_id IS NULL OR p.gudang_id = p_gudang_id)
  ),
  daily_profit AS (
    SELECT
      fi.tanggal,
      SUM(fi.item_cogs)                                                       AS total_modal,
      SUM(fi.item_revenue)                                                    AS total_penjualan,
      SUM(fi.item_revenue) - SUM(fi.item_cogs)                               AS total_profit,
      CASE
        WHEN SUM(fi.item_revenue) > 0
        THEN ROUND(((SUM(fi.item_revenue) - SUM(fi.item_cogs)) / SUM(fi.item_revenue)) * 100, 2)
        ELSE 0
      END                                                                     AS margin_percentage
    FROM filtered_items fi
    GROUP BY fi.tanggal
  )
  SELECT
    dp.tanggal                                           AS report_date,
    dp.total_modal,
    dp.total_penjualan,
    dp.total_profit,
    dp.margin_percentage,
    COUNT(*) OVER()::BIGINT                              AS total_count,
    SUM(dp.total_modal) OVER()::NUMERIC                  AS grand_total_modal,
    SUM(dp.total_penjualan) OVER()::NUMERIC              AS grand_total_penjualan,
    SUM(dp.total_profit) OVER()::NUMERIC                 AS grand_total_profit
  FROM daily_profit dp
  ORDER BY dp.tanggal DESC
  LIMIT v_limit OFFSET v_offset;
END;
$$;

-- Overloaded 5-arg wrapper
CREATE OR REPLACE FUNCTION public.get_profit_report(
  p_start_date  DATE    DEFAULT NULL,
  p_end_date    DATE    DEFAULT NULL,
  p_category_id UUID    DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_limit       INTEGER DEFAULT 20
)
RETURNS TABLE(
  report_date            DATE,
  total_modal            NUMERIC,
  total_penjualan        NUMERIC,
  total_profit           NUMERIC,
  margin_percentage      NUMERIC,
  total_count            BIGINT,
  grand_total_modal      NUMERIC,
  grand_total_penjualan  NUMERIC,
  grand_total_profit     NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT * FROM public.get_profit_report(p_start_date, p_end_date, p_category_id, p_page, p_limit, NULL::uuid);
$$;

GRANT EXECUTE ON FUNCTION public.get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profit_report(DATE, DATE, UUID, INTEGER, INTEGER) TO service_role;
