-- Migration: Fix create_penjualan_return to include shift_id in kas_log RETURN entry
-- Date: 2026-09-25
-- Problem: kas_log RETURN yang dibuat oleh create_penjualan_return di Supabase tidak memiliki shift_id,
--          sehingga saat di-pull ke lokal / dihitung pada rekap shift, entri retur tidak terhitung
--          dan tidak muncul pada riwayat kas shift berjalan kasir.
-- Fix: Tambahkan p_shift_id ke parameter RPC create_penjualan_return dan simpan ke public.kas_log.

CREATE OR REPLACE FUNCTION public.create_penjualan_return(
  p_penjualan_id uuid,
  p_tanggal date,
  p_note text,
  p_created_by uuid,
  p_items jsonb,
  p_idempotency_key uuid DEFAULT NULL::uuid,
  p_gudang_id uuid DEFAULT NULL::uuid,
  p_shift_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_gudang_id UUID;
  v_shift_id UUID;
  v_stock_exists BOOLEAN;
  v_has_remaining_items BOOLEAN;
BEGIN
  -- original penjualan must be paid
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status IN ('paid', 'LUNAS')
  ) THEN
    RAISE EXCEPTION 'Penjualan not found or not paid';
  END IF;

  -- Resolve gudang_id from parameter or from original penjualan or fallback default
  v_gudang_id := p_gudang_id;
  IF v_gudang_id IS NULL THEN
    SELECT gudang_id INTO v_gudang_id FROM public.penjualan WHERE id = p_penjualan_id;
  END IF;
  IF v_gudang_id IS NULL THEN
    SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
    END IF;
  END IF;

  -- Safe shift_id resolution to avoid FK violation
  v_shift_id := p_shift_id;
  IF v_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
    v_shift_id := NULL;
  END IF;

  v_return_id := COALESCE(p_idempotency_key, gen_random_uuid());

  -- Idempotency check: if p_idempotency_key is provided and already exists, return existing ID
  IF p_idempotency_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.penjualan_return WHERE id = p_idempotency_key) THEN
    RETURN p_idempotency_key;
  END IF;

  INSERT INTO public.penjualan_return (
    id,
    penjualan_id,
    tanggal,
    note,
    created_by,
    gudang_id
  )
  VALUES (
    v_return_id,
    p_penjualan_id,
    p_tanggal,
    p_note,
    p_created_by,
    v_gudang_id
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

    -- 2. Fallback: match by (penjualan_id, inventory_id)
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
      AND (pri.penjualan_item_id = v_penjualan_item_id OR (pri.penjualan_item_id IS NULL AND pri.inventory_id = v_inventory_id));

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

    -- Restore stock in inventory_stocks for that gudang
    IF v_gudang_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.inventory_stocks WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id) INTO v_stock_exists;
      IF v_stock_exists THEN
        UPDATE public.inventory_stocks
        SET stok = stok + v_qty,
            updated_at = NOW()
        WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id;
      ELSE
        INSERT INTO public.inventory_stocks (id, inventory_id, gudang_id, stok, created_at, updated_at)
        VALUES (gen_random_uuid(), v_inventory_id, v_gudang_id, v_qty, NOW(), NOW());
      END IF;
    ELSE
      UPDATE public.inventory
      SET stok = stok + v_qty,
          updated_at = NOW()
      WHERE id = v_inventory_id;
    END IF;

    -- Stock movement IN with gudang_id
    INSERT INTO public.stock_movements (
      id,
      inventory_id,
      tipe,
      qty,
      referensi,
      gudang_id,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      v_inventory_id,
      'IN',
      v_qty,
      v_return_id::text,
      v_gudang_id,
      NOW()
    );

    v_total_refund := v_total_refund + (v_harga_final * v_qty);
  END LOOP;

  -- Kas log for return with explicit gudang_id, shift_id, and deterministic ID matching v_return_id
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id, shift_id)
  VALUES (v_return_id, 'RETURN', v_total_refund, 'CASH', v_return_id, COALESCE(p_note, 'Retur Penjualan'), p_created_by, NOW(), v_gudang_id, v_shift_id)
  ON CONFLICT (id) DO UPDATE
  SET jumlah = EXCLUDED.jumlah,
      catatan = EXCLUDED.catatan,
      shift_id = COALESCE(EXCLUDED.shift_id, public.kas_log.shift_id);

  -- Check if all items for this penjualan are now fully returned
  SELECT EXISTS (
    SELECT 1
    FROM public.penjualan_items pi
    WHERE pi.penjualan_id = p_penjualan_id
      AND pi.qty > (
        SELECT COALESCE(SUM(pri.qty), 0)
        FROM public.penjualan_return pr
        JOIN public.penjualan_return_items pri ON pri.penjualan_return_id = pr.id
        WHERE pr.penjualan_id = p_penjualan_id
          AND (pri.penjualan_item_id = pi.id OR (pri.penjualan_item_id IS NULL AND pri.inventory_id = pi.inventory_id))
      )
  ) INTO v_has_remaining_items;

  IF NOT v_has_remaining_items THEN
    UPDATE public.penjualan
    SET status = 'refunded',
        refunded_at = NOW()
    WHERE id = p_penjualan_id;
  END IF;

  RETURN v_return_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_penjualan_return(uuid, date, text, uuid, jsonb, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_penjualan_return(uuid, date, text, uuid, jsonb, uuid, uuid, uuid) TO service_role;

-- Backfill data retur hari ini yang sempat tersimpan dengan shift_id NULL
UPDATE public.kas_log 
SET shift_id = '87d358ec-24fd-4ad3-9231-616dc0a20782' 
WHERE id = 'ae50d1c9-5f9c-4d2d-99ea-0862b0425acb' 
  AND shift_id IS NULL;
