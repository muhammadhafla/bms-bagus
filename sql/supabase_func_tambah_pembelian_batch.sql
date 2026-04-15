-- Function to batch add purchases
CREATE OR REPLACE FUNCTION tambah_pembelian_batch(
  p_items JSONB,
  p_supplier_id UUID,
  p_tanggal DATE,
  p_user UUID,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_harga_final NUMERIC;
BEGIN
  -- Validate input
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array non-kosong';
  END IF;

  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_pembelian_id
    FROM pembelian
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_pembelian_id IS NOT NULL THEN
      RETURN v_pembelian_id;
    END IF;
  END IF;

  -- Generate idempotency key if not provided
  IF p_idempotency_key IS NULL THEN
    p_idempotency_key := gen_random_uuid();
  END IF;

  -- Create the purchase record
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
    p_idempotency_key
  RETURNING id INTO v_pembelian_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validate required fields
    IF v_item->>'nama_barang' IS NULL OR TRIM(v_item->>'nama_barang') = '' THEN
      RAISE EXCEPTION 'nama_barang tidak boleh kosong';
    END IF;
    IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
      RAISE EXCEPTION 'harga tidak valid untuk item: %', v_item->>'nama_barang';
    END IF;
    IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0 untuk item: %', v_item->>'nama_barang';
    END IF;

    -- Find or create inventory item
    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    -- Reactivate discontinued items
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

    -- Create new inventory item if not found
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

    -- Calculate prices
    v_harga_beli := (v_item->>'harga')::NUMERIC;
    v_qty := (v_item->>'qty')::INTEGER;
    v_harga_final := v_harga_beli * v_qty;

    -- Add purchase item
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

    -- Update inventory stock and last purchase price
    UPDATE inventory 
    SET 
      stok = COALESCE(stok, 0) + v_qty,
      harga_beli_terakhir = v_harga_beli,
      updated_by = p_user,
      updated_at = NOW()
    WHERE id = v_inventory_id;

    -- Record stock movement
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

  -- Update the purchase total
  UPDATE pembelian 
  SET total_sistem = v_total_sistem 
  WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$$;

GRANT EXECUTE ON FUNCTION tambah_pembelian_batch(jsonb, uuid, date, uuid, uuid) TO authenticated;
