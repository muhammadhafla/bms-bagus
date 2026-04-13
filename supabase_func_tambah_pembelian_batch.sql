-- Function to batch add purchases
CREATE OR REPLACE FUNCTION tambah_pembelian_batch(
  p_items JSONB,
  p_supplier_id UUID,
  p_tanggal DATE,
  p_user UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
BEGIN
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
    gen_random_uuid()
  RETURNING id INTO v_pembelian_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Find or create inventory item
    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    IF v_inventory_id IS NULL THEN
      -- Create new inventory item
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
        ((v_item->>'harga')::NUMERIC * 1.2), -- Default 20% markup
        p_user,
        0
      )
      RETURNING id INTO v_inventory_id;
    END IF;

    -- Calculate prices
    DECLARE
      v_harga_beli NUMERIC := (v_item->>'harga')::NUMERIC;
      v_qty INTEGER := (v_item->>'qty')::INTEGER;
      v_harga_final NUMERIC := v_harga_beli * v_qty;
    BEGIN
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
    END;
  END LOOP;

  -- Update the purchase total
  UPDATE pembelian 
  SET total_sistem = v_total_sistem 
  WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$$;
