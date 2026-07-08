-- SQL Function: process_opname_adjustments
-- Mengganti logika TypeScript yang tidak atomic dengan satu database transaction
-- Semua operasi (insert adjustments, insert movements, update stok, update opname) berjalan atomic
-- Jika salah satu gagal, seluruh operasi di-rollback otomatis oleh PostgreSQL

CREATE OR REPLACE FUNCTION process_opname_adjustments(
  p_opname_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_adjustment_type TEXT;
  v_adjustment_qty INTEGER;
  v_processed_count INTEGER := 0;
  v_opname_status TEXT;
BEGIN
  -- 1. Validasi status opname harus 'approved'
  SELECT status INTO v_opname_status
  FROM stock_opname
  WHERE id = p_opname_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opname dengan id % tidak ditemukan', p_opname_id;
  END IF;

  IF v_opname_status != 'approved' THEN
    RAISE EXCEPTION 'Stock opname harus berstatus approved sebelum diproses. Status saat ini: %', v_opname_status;
  END IF;

  -- 2. Proses setiap item yang belum di-adjust dan punya selisih
  FOR v_item IN
    SELECT *
    FROM stock_opname_items
    WHERE stock_opname_id = p_opname_id
      AND adjusted = false
      AND difference != 0
  LOOP
    v_adjustment_type := CASE WHEN v_item.difference > 0 THEN 'increase' ELSE 'decrease' END;
    v_adjustment_qty  := ABS(v_item.difference);

    -- 2a. Insert stock adjustment record
    INSERT INTO stock_adjustments (
      stock_opname_item_id,
      inventory_id,
      adjustment_qty,
      adjustment_type,
      reason,
      note,
      created_by
    ) VALUES (
      v_item.id,
      v_item.inventory_id,
      v_adjustment_qty,
      v_adjustment_type,
      COALESCE(v_item.reason, 'lainnya'),
      v_item.note,
      p_user_id
    );

    -- 2b. Insert stock movement record
    INSERT INTO stock_movements (
      inventory_id,
      tipe,
      qty,
      referensi
    ) VALUES (
      v_item.inventory_id,
      'ADJUSTMENT',
      v_adjustment_qty,
      p_opname_id::TEXT
    );

    -- 2c. Update stok inventory ke nilai physical_stock
    UPDATE inventory
    SET
      stok = v_item.physical_stock,
      updated_at = NOW()
    WHERE id = v_item.inventory_id;

    v_processed_count := v_processed_count + 1;
  END LOOP;

  -- 3. Mark semua items sebagai adjusted
  UPDATE stock_opname_items
  SET adjusted = true
  WHERE stock_opname_id = p_opname_id
    AND difference != 0;

  -- 4. Update status opname menjadi completed
  UPDATE stock_opname
  SET
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_opname_id;

  RETURN jsonb_build_object(
    'success', true,
    'processed_items', v_processed_count,
    'opname_id', p_opname_id
  );
END;
$$;

-- Grant eksekusi ke authenticated users (RLS di tabel sudah handle akses)
GRANT EXECUTE ON FUNCTION process_opname_adjustments(UUID, UUID) TO authenticated;
