-- Combined Migration File for Inventory Management System
-- Created: 2026-04-16
-- Includes: Schema additions (FKs, indexes) + Functions

-- ============================================================
-- MIGRATION 001: Add discontinued columns to inventory
-- Date: 2026-04-14
-- ============================================================
-- Note: Kolom ini sudah ada di schema yang provided
-- Jika sudah ada, abaikan error ini
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discontinued_at TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS discontinued_by UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_inventory_is_discontinued ON inventory(is_discontinued);

-- ============================================================
-- MIGRATION 002: Add voided_at to pembelian_return_items
-- Date: 2026-04-16
-- ============================================================
-- Note: Kolom ini sudah ada di schema yang provided
-- Jika sudah ada, abaikan error ini
ALTER TABLE public.pembelian_return_items
ADD COLUMN IF NOT EXISTS voided_at timestamptz;

CREATE INDEX IF NOT EXISTS pembelian_return_items_voided_at_idx
ON public.pembelian_return_items(voided_at);

-- ============================================================
-- RLS POLICIES (additional)
-- ============================================================
CREATE POLICY "pembelian_return_items_void_update_all_auth" 
ON public.pembelian_return_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- FUNCTION: get_available_return_items
-- Returns items from purchases that can be returned
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_return_items(p_supplier_id UUID)
RETURNS TABLE (
  pembelian_item_id UUID,
  pembelian_id UUID,
  inventory_id UUID,
  nama_barang TEXT,
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
    pi.harga_beli,
    COALESCE(pi.diskon, 0) AS diskon,
    pi.qty AS qty_original,
    COALESCE(SUM(pri.qty)::INTEGER, 0) AS qty_returned,
    (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) AS qty_remaining,
    p.tanggal AS tanggal_pembelian,
    p.nomor_nota AS nomor_nota
  FROM pembelian_items pi
  JOIN pembelian p ON p.id = pi.pembelian_id
  LEFT JOIN pembelian_return_items pri 
    ON pri.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  GROUP BY pi.id, pi.pembelian_id, pi.inventory_id, pi.nama_barang, pi.harga_beli, pi.diskon, pi.qty, p.tanggal, p.nomor_nota
  HAVING (pi.qty - COALESCE(SUM(pri.qty)::INTEGER, 0)) > 0
  ORDER BY p.tanggal DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_return_items(UUID) TO authenticated;

-- ============================================================
-- FUNCTION: void_pembelian_return_item
-- Voids a return item and restores stock
-- ============================================================
CREATE OR REPLACE FUNCTION public.void_pembelian_return_item(
  p_pembelian_return_item_id uuid,
  p_note text default null,
  p_created_by uuid default auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_item record;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_item
  FROM public.pembelian_return_items
  WHERE id = p_pembelian_return_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item pembelian return tidak ditemukan';
  END IF;

  IF v_item.voided_at IS NOT NULL THEN
    RETURN v_item.id;
  END IF;

  UPDATE public.pembelian_return_items
  SET 
    voided_at = v_now,
    updated_by = p_created_by
  WHERE id = p_pembelian_return_item_id;

  UPDATE public.inventory
  SET 
    stok = stok + v_item.qty,
    updated_at = v_now,
    updated_by = p_created_by
  WHERE id = v_item.inventory_id;

  INSERT INTO public.stock_movements (
    inventory_id,
    tipe,
    qty,
    referensi,
    note,
    created_at,
    created_by
  ) VALUES (
    v_item.inventory_id,
    'IN',
    v_item.qty,
    'VOID_RETURN_ITEM:' || v_item.id::text,
    p_note,
    v_now,
    p_created_by
  );

  RETURN v_item.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.void_pembelian_return_item(uuid, text, uuid) TO authenticated;

-- ============================================================
-- FUNCTION: proses_return_batch
-- Processes batch returns to suppliers
-- ============================================================
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
LANGUAGE plpgsql
SECURITY INVOKER
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

  IF p_idempotency_key IS NOT NULL THEN
    SELECT pr.id INTO v_return_id
    FROM public.pembelian_return pr
    WHERE pr.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_return_id IS NOT NULL THEN
      IF (SELECT COUNT(*) FROM public.pembelian_return_items pri WHERE pri.pembelian_return_id = v_return_id AND pri.voided_at IS NULL)
         <>
         (SELECT COUNT(DISTINCT (elem->>'pembelian_item_id')::uuid) FROM jsonb_array_elements(p_items) elem)
      THEN
        DELETE FROM public.pembelian_return_items WHERE pembelian_return_id = v_return_id;
        DELETE FROM public.pembelian_return WHERE id = v_return_id;
      ELSE
        RETURN QUERY SELECT v_return_id;
        RETURN;
      END IF;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT (elem->>'pembelian_item_id')::uuid AS id, COUNT(*) c
      FROM jsonb_array_elements(p_items) elem
      GROUP BY 1
    ) x
    WHERE x.c > 1
  ) THEN
    RAISE EXCEPTION 'p_items tidak boleh mengandung pembelian_item_id yang duplikat';
  END IF;

  PERFORM 1
  FROM public.pembelian_items pi
  JOIN public.pembelian p ON p.id = pi.pembelian_id
  JOIN LATERAL (
    SELECT
      (elem->>'pembelian_item_id')::uuid AS pembelian_item_id,
      (elem->>'inventory_id')::uuid AS inventory_id
    FROM jsonb_array_elements(p_items) AS elem
  ) inp ON inp.pembelian_item_id = pi.id
  WHERE p.supplier_id = p_supplier_id
  FOR UPDATE;

  IF (
    SELECT COUNT(DISTINCT (elem->>'pembelian_item_id')::uuid)
    FROM jsonb_array_elements(p_items) AS elem
  )
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
    idempotency_key
  ) VALUES (
    NULL,
    p_supplier_id,
    p_supplier_nama,
    p_tanggal,
    p_note,
    p_created_by,
    p_idempotency_key
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

    IF (v_item->>'inventory_id')::uuid IS DISTINCT FROM v_inventory_id THEN
      RAISE EXCEPTION 'inventory_id input tidak sesuai untuk pembelian_item_id %', v_pembelian_item_id;
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
      RAISE EXCEPTION 'Qty retur melebihi sisa (item=%) qty=% sisa=%',
        v_pembelian_item_id, v_qty, v_sisa_return_qty;
    END IF;

    v_harga_final := (v_harga_beli - v_diskon) * v_qty;
    IF v_harga_final < 0 THEN
      RAISE EXCEPTION 'harga_final menjadi negatif (item=%)', v_pembelian_item_id;
    END IF;

    SELECT stok INTO v_current_stock
    FROM public.inventory
    WHERE id = v_inventory_id
    FOR UPDATE;

    IF COALESCE(v_current_stock, 0) < v_qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk inventory_id %: stok=%, butuh=%', v_inventory_id, COALESCE(v_current_stock, 0), v_qty;
    END IF;

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

    UPDATE public.inventory
    SET stok = COALESCE(v_current_stock, 0) - v_qty,
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
      'OUT',
      v_qty,
      'RETURN:' || v_return_id::text,
      v_now
    );
  END LOOP;

  RETURN QUERY SELECT v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.proses_return_batch(uuid, text, jsonb, date, text, uuid, uuid) TO authenticated;

-- ============================================================
-- FUNCTION: tambah_pembelian_batch
-- Batch add purchases
-- ============================================================
CREATE OR REPLACE FUNCTION tambah_pembelian_batch(
  p_items JSONB,
  p_supplier_id UUID,
  p_tanggal DATE,
  p_user UUID,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_harga_final NUMERIC;
  v_idempotency_key UUID;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
  END IF;

  v_idempotency_key := COALESCE(p_idempotency_key, gen_random_uuid());

  WITH ins AS (
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
      v_idempotency_key
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  )
  SELECT id INTO v_pembelian_id
  FROM ins;

  IF v_pembelian_id IS NULL THEN
    SELECT id INTO v_pembelian_id
    FROM pembelian
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item->>'nama_barang' IS NULL OR TRIM(v_item->>'nama_barang') = '' THEN
      RAISE EXCEPTION 'nama_barang tidak boleh kosong';
    END IF;
    IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'harga tidak valid untuk item: %', v_item->>'nama_barang';
    END IF;
    IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0 untuk item: %', v_item->>'nama_barang';
    END IF;

    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    IF v_inventory_id IS NOT NULL THEN
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

    INSERT INTO stock_movements (
      inventory_id,
      tipe,
      qty,
      referensi
    )
    VALUES (
      v_inventory_id,
      'IN',
      v_qty,
      v_pembelian_id::TEXT
    );

    v_total_sistem := v_total_sistem + v_harga_final;
  END LOOP;

  UPDATE pembelian 
  SET total_sistem = v_total_sistem 
  WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$$;

GRANT EXECUTE ON FUNCTION tambah_pembelian_batch(jsonb, uuid, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid) TO authenticated;