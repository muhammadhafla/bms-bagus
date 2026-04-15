CREATE OR REPLACE FUNCTION public.proses_return_batch(
  p_supplier_id uuid,
  p_supplier_nama text,
  p_items jsonb,               -- JSON array
  p_tanggal date DEFAULT CURRENT_DATE,
  p_note text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS TABLE(return_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
  v_sisa_qty int;
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
      RETURN QUERY SELECT v_return_id;
      RETURN;
    END IF;
  END IF;

  -- Lock related rows
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

  PERFORM 1
  FROM public.inventory i
  JOIN LATERAL (
    SELECT (elem->>'inventory_id')::uuid AS inventory_id
    FROM jsonb_array_elements(p_items) AS elem
  ) inp ON inp.inventory_id = i.id
  FOR UPDATE;

  -- Insert header
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

  -- Process each item
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) AS t(value)
  LOOP
    v_pembelian_item_id := (v_item->>'pembelian_item_id')::uuid;
    v_inventory_id := (v_item->>'inventory_id')::uuid;
    v_qty := (v_item->>'qty')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0 (pembelian_item_id=%)', v_pembelian_item_id;
    END IF;

    -- Ambil data asli dari pembelian_items
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

    -- Sisa qty
    SELECT (pi.qty - COALESCE(SUM(pri.qty), 0))::int
    INTO v_sisa_qty
    FROM public.pembelian_items pi
    LEFT JOIN public.pembelian_return_items pri
      ON pri.pembelian_item_id = pi.id
    WHERE pi.id = v_pembelian_item_id
    GROUP BY pi.qty;

    IF v_qty > v_sisa_qty THEN
      RAISE EXCEPTION 'Qty retur melebihi sisa (item=%) qty=% sisa=%',
        v_pembelian_item_id, v_qty, v_sisa_qty;
    END IF;

    v_harga_final := (v_harga_beli - v_diskon) * v_qty;
    IF v_harga_final < 0 THEN
      RAISE EXCEPTION 'harga_final menjadi negatif (item=%)', v_pembelian_item_id;
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
    SET stok = stok - v_qty,
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