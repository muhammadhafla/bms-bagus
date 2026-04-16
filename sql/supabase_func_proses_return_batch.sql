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
      -- Validasi jumlah item sudah lengkap sebelum return
      IF (SELECT COUNT(*) FROM public.pembelian_return_items pri WHERE pri.pembelian_return_id = v_return_id AND pri.voided_at IS NULL)
         <>
         (SELECT COUNT(DISTINCT (elem->>'pembelian_item_id')::uuid) FROM jsonb_array_elements(p_items) elem)
      THEN
      -- Jika item tidak lengkap, hapus item terlebih dahulu lalu header (hindari FK error)
      DELETE FROM public.pembelian_return_items WHERE pembelian_return_id = v_return_id;
      DELETE FROM public.pembelian_return WHERE id = v_return_id;
      ELSE
        RETURN QUERY SELECT v_return_id;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Validasi tidak ada duplikasi pembelian_item_id
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

  -- Validasi SEMUA input item milik supplier ini sebelum lanjut
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

    -- Sisa qty (hanya hitung item yang belum di-void)
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

    -- Ambil nilai stok dari row dan lock per item
    SELECT stok INTO v_current_stock
    FROM public.inventory
    WHERE id = v_inventory_id
    FOR UPDATE;

    -- Cek stok cukup
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