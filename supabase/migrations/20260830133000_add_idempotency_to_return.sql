-- Migration: Add idempotency support to create_penjualan_return
-- Description: Allows client to pass p_idempotency_key so penjualan_return and kas_log IDs match client-generated IDs.

-- Drop previous overloaded signatures if any
DROP FUNCTION IF EXISTS public.create_penjualan_return(UUID, DATE, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.create_penjualan_return(UUID, DATE, TEXT, UUID, JSONB, UUID);

CREATE OR REPLACE FUNCTION public.create_penjualan_return(
  p_penjualan_id UUID,
  p_tanggal DATE,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return_id UUID;
  v_item JSONB;
  v_penjualan_item_id UUID;
  v_inventory_id UUID;
  v_qty INT;
  v_harga_jual NUMERIC;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_cost_at_sale NUMERIC;
  v_original_qty INT;
  v_return_qty INT;
  v_total_refund NUMERIC := 0;
BEGIN
  -- Idempotency check: if p_idempotency_key is provided and already exists, return existing ID
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.penjualan_return WHERE id = p_idempotency_key) THEN
      RETURN p_idempotency_key;
    END IF;
    v_return_id := p_idempotency_key;
  ELSE
    v_return_id := gen_random_uuid();
  END IF;

  -- original penjualan must be paid
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'paid'
  ) THEN
    RAISE EXCEPTION 'Penjualan not found or not paid';
  END IF;

  INSERT INTO public.penjualan_return (
    id,
    penjualan_id,
    tanggal,
    note,
    created_by
  )
  VALUES (
    v_return_id,
    p_penjualan_id,
    p_tanggal,
    p_note,
    p_created_by
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_penjualan_item_id := NULLIF(v_item->>'penjualan_item_id', '')::UUID;
    v_inventory_id := NULLIF(v_item->>'inventory_id', '')::UUID;
    v_qty := (v_item->>'qty')::INT;
    v_harga_jual := (v_item->>'harga_jual')::NUMERIC;
    v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty return harus > 0. penjualan_item_id=%', v_penjualan_item_id;
    END IF;

    v_harga_final := NULLIF((v_item->>'harga_final')::TEXT, '')::NUMERIC;
    IF v_harga_final IS NULL THEN
      RAISE EXCEPTION 'harga_final wajib dikirim untuk penjualan_item_id=%', v_penjualan_item_id;
    END IF;

    v_cost_at_sale := COALESCE((v_item->>'cost_at_sale')::NUMERIC, 0);

    -- 1. Try matching by penjualan_item_id
    v_original_qty := NULL;
    IF v_penjualan_item_id IS NOT NULL THEN
      SELECT inventory_id, qty INTO v_inventory_id, v_original_qty
      FROM public.penjualan_items
      WHERE id = v_penjualan_item_id AND penjualan_id = p_penjualan_id;
    END IF;

    -- 2. Fallback: match by (penjualan_id, inventory_id) if penjualan_item_id was not matched (offline client)
    IF v_original_qty IS NULL AND v_inventory_id IS NOT NULL THEN
      SELECT id, qty INTO v_penjualan_item_id, v_original_qty
      FROM public.penjualan_items
      WHERE penjualan_id = p_penjualan_id AND inventory_id = v_inventory_id
      LIMIT 1;
    END IF;

    IF v_original_qty IS NULL THEN
      RAISE EXCEPTION 'Item tidak ada di transaksi original';
    END IF;

    SELECT COALESCE(SUM(pri.qty), 0) INTO v_return_qty
    FROM public.penjualan_return pr
    JOIN public.penjualan_return_items pri
      ON pri.penjualan_return_id = pr.id
    WHERE pr.penjualan_id = p_penjualan_id
      AND pri.penjualan_item_id = v_penjualan_item_id;

    IF v_qty > (v_original_qty - v_return_qty) THEN
      RAISE EXCEPTION 'Qty return melebihi yang bisa dikembalikan. Maks: %', v_original_qty - v_return_qty;
    END IF;

    -- Insert return item
    INSERT INTO public.penjualan_return_items (
      id,
      penjualan_return_id,
      penjualan_item_id,
      inventory_id,
      nama_barang,
      qty,
      harga_jual,
      diskon,
      harga_final,
      cost_at_sale
    )
    SELECT
      gen_random_uuid(),
      v_return_id,
      v_penjualan_item_id,
      pi.inventory_id,
      pi.nama_barang,
      v_qty,
      v_harga_jual,
      v_diskon,
      v_harga_final,
      v_cost_at_sale
    FROM public.penjualan_items pi
    WHERE pi.id = v_penjualan_item_id;

    -- restore stock
    UPDATE public.inventory
    SET stok = stok + v_qty,
        updated_at = NOW()
    WHERE id = v_inventory_id;

    -- stock movement IN
    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_inventory_id,
      'IN',
      v_qty,
      v_return_id::text,
      NOW()
    );

    v_total_refund := v_total_refund + (v_harga_final * v_qty);
  END LOOP;

  -- Kas log for return
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at)
  VALUES (gen_random_uuid(), 'RETURN', v_total_refund, 'CASH', v_return_id, COALESCE(p_note, 'Retur Penjualan'), p_created_by, NOW());

  RETURN v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_penjualan_return(UUID, DATE, TEXT, UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_penjualan_return(UUID, DATE, TEXT, UUID, JSONB, UUID) TO service_role;
