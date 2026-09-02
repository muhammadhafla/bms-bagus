-- Migration: Add gudang_id to stock_opname and update process_opname_adjustments
-- Description: Enables warehouse-specific stock opname sessions and syncs adjustments to inventory_stocks.

ALTER TABLE public.stock_opname
ADD COLUMN IF NOT EXISTS gudang_id UUID REFERENCES public.gudang(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_opname_gudang_id ON public.stock_opname(gudang_id);

-- Backfill existing opnames with default warehouse
UPDATE public.stock_opname
SET gudang_id = (SELECT id FROM public.gudang WHERE is_default = true LIMIT 1)
WHERE gudang_id IS NULL;

-- Updated process_opname_adjustments stored procedure
CREATE OR REPLACE FUNCTION public.process_opname_adjustments(
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
  v_gudang_id UUID;
BEGIN
  -- 1. Validasi status opname harus 'approved' dan ambil gudang_id
  SELECT status, gudang_id INTO v_opname_status, v_gudang_id
  FROM stock_opname
  WHERE id = p_opname_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opname dengan id % tidak ditemukan', p_opname_id;
  END IF;

  IF v_opname_status != 'approved' THEN
    RAISE EXCEPTION 'Stock opname harus berstatus approved sebelum diproses. Status saat ini: %', v_opname_status;
  END IF;

  -- Fallback jika gudang_id masih null
  IF v_gudang_id IS NULL THEN
    SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    IF v_gudang_id IS NULL THEN
      SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
    END IF;
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

    -- 2b. Insert stock movement record dengan gudang_id yang sesuai
    INSERT INTO stock_movements (
      inventory_id,
      gudang_id,
      tipe,
      qty,
      referensi
    ) VALUES (
      v_item.inventory_id,
      v_gudang_id,
      'ADJUSTMENT',
      v_adjustment_qty,
      p_opname_id::TEXT
    );

    -- 2c. Update atau Insert stok di inventory_stocks untuk gudang tersebut
    IF v_gudang_id IS NOT NULL THEN
      INSERT INTO public.inventory_stocks (inventory_id, gudang_id, stok, updated_at)
      VALUES (v_item.inventory_id, v_gudang_id, v_item.physical_stock, NOW())
      ON CONFLICT (inventory_id, gudang_id)
      DO UPDATE SET
        stok = EXCLUDED.stok,
        updated_at = NOW();
    END IF;

    -- 2d. Update master stok inventory (didukung juga oleh trigger sync)
    UPDATE inventory
    SET
      stok = (SELECT COALESCE(SUM(stok), 0) FROM public.inventory_stocks WHERE inventory_id = v_item.inventory_id),
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
    'opname_id', p_opname_id,
    'gudang_id', v_gudang_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_opname_adjustments(UUID, UUID) TO authenticated;
