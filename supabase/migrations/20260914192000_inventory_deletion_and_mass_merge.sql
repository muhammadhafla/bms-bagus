-- Migration: inventory_deletion_and_mass_merge
-- Description: Adds RLS delete policy for stock_movements, check_inventory_batch_can_delete, 
-- delete_inventory_batch, and atomic merge_duplicate_inventory supporting Single & Mass Merge.

-- 1. Ensure stock_movements has a DELETE policy for admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stock_movements' AND policyname = 'stock_movements_delete_admin'
  ) THEN
    CREATE POLICY stock_movements_delete_admin 
    ON public.stock_movements 
    FOR DELETE 
    TO authenticated 
    USING (is_admin());
  END IF;
END $$;

-- 2. Function to inspect deletion eligibility for a single item
CREATE OR REPLACE FUNCTION public.check_inventory_can_delete(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res JSONB;
BEGIN
  SELECT check_inventory_batch_can_delete(ARRAY[p_id])->0 INTO v_res;
  RETURN COALESCE(v_res, jsonb_build_object('can_delete', false, 'error', 'Barang tidak ditemukan'));
END;
$$;

-- 3. Function to inspect deletion eligibility for multiple items in batch
CREATE OR REPLACE FUNCTION public.check_inventory_batch_can_delete(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'nama_barang', i.nama_barang,
      'kode_barcode', i.kode_barcode,
      'stok', i.stok,
      'can_delete', (
        COALESCE(pj.cnt, 0) + COALESCE(pb.cnt, 0) + COALESCE(pr.cnt, 0) + 
        COALESCE(so.cnt, 0) + COALESCE(sa.cnt, 0) + COALESCE(ts.cnt, 0) + COALESCE(pg.cnt, 0)
      ) = 0,
      'total_transactions', (
        COALESCE(pj.cnt, 0) + COALESCE(pb.cnt, 0) + COALESCE(pr.cnt, 0) + 
        COALESCE(so.cnt, 0) + COALESCE(sa.cnt, 0) + COALESCE(ts.cnt, 0) + COALESCE(pg.cnt, 0)
      ),
      'breakdown', jsonb_build_object(
        'penjualan', COALESCE(pj.cnt, 0),
        'pembelian', COALESCE(pb.cnt, 0),
        'retur', COALESCE(pr.cnt, 0),
        'opname', COALESCE(so.cnt, 0),
        'adjustment', COALESCE(sa.cnt, 0),
        'transfer', COALESCE(ts.cnt, 0),
        'pengeluaran_gudang', COALESCE(pg.cnt, 0)
      )
    )
  )
  INTO v_res
  FROM unnest(p_ids) AS pid
  JOIN inventory i ON i.id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM penjualan_items WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) pj ON pj.inventory_id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM pembelian_items WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) pb ON pb.inventory_id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM penjualan_return_items WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) pr ON pr.inventory_id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM stock_opname_items WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) so ON so.inventory_id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM stock_adjustments WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) sa ON sa.inventory_id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM transfer_stok_items WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) ts ON ts.inventory_id = pid
  LEFT JOIN (SELECT inventory_id, COUNT(*) cnt FROM pengeluaran_gudang_items WHERE inventory_id = ANY(p_ids) GROUP BY inventory_id) pg ON pg.inventory_id = pid;

  RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 4. Function to delete batch of items (only if clean of transactions)
CREATE OR REPLACE FUNCTION public.delete_inventory_batch(p_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invalid_names TEXT;
  v_deleted_count INT;
BEGIN
  -- 1. Authorization check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Hanya admin yang memiliki hak akses menghapus barang.';
  END IF;

  -- 2. Verify all items are free of transactions
  SELECT string_agg(i.nama_barang, ', ')
  INTO v_invalid_names
  FROM inventory i
  WHERE i.id = ANY(p_ids)
    AND (
      EXISTS (SELECT 1 FROM penjualan_items WHERE inventory_id = i.id)
      OR EXISTS (SELECT 1 FROM pembelian_items WHERE inventory_id = i.id)
      OR EXISTS (SELECT 1 FROM penjualan_return_items WHERE inventory_id = i.id)
      OR EXISTS (SELECT 1 FROM stock_opname_items WHERE inventory_id = i.id)
      OR EXISTS (SELECT 1 FROM stock_adjustments WHERE inventory_id = i.id)
      OR EXISTS (SELECT 1 FROM transfer_stok_items WHERE inventory_id = i.id)
      OR EXISTS (SELECT 1 FROM pengeluaran_gudang_items WHERE inventory_id = i.id)
    );

  IF v_invalid_names IS NOT NULL THEN
    RAISE EXCEPTION 'Tidak dapat menghapus: Barang berikut memiliki riwayat transaksi (pembelian/penjualan/opname): %. Gunakan fitur Gabung (Merge) untuk barang duplikat.', v_invalid_names;
  END IF;

  -- 3. Perform atomic delete (cascades to inventory_stocks, barcodes, movements, promo)
  DELETE FROM inventory WHERE id = ANY(p_ids);
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
END;
$$;

-- 5. Function to delete a single item
CREATE OR REPLACE FUNCTION public.delete_inventory_item(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN delete_inventory_batch(ARRAY[p_id]);
END;
$$;

-- 6. Function to merge duplicate items into a target item (supports 1 or N sources)
CREATE OR REPLACE FUNCTION public.merge_duplicate_inventory(p_source_ids UUID[], p_target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target inventory%ROWTYPE;
  v_source_names TEXT;
  v_source_count INT;
  v_source_total_stok INT := 0;
  v_latest_source_date DATE;
  v_latest_source_price NUMERIC;
  v_latest_target_date DATE;
  v_stock_rec RECORD;
  v_primary_gudang UUID;
BEGIN
  -- 1. Authorization check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Hanya admin yang memiliki hak akses menggabungkan barang.';
  END IF;

  -- 2. Validate inputs
  IF p_source_ids IS NULL OR array_length(p_source_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Daftar barang duplikat tidak boleh kosong.';
  END IF;

  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'Barang tujuan penggabungan harus ditentukan.';
  END IF;

  IF p_target_id = ANY(p_source_ids) THEN
    RAISE EXCEPTION 'Barang tujuan tidak boleh termasuk dalam daftar barang yang akan digabungkan.';
  END IF;

  -- 3. Verify target item exists
  SELECT * INTO v_target FROM inventory WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang tujuan tidak ditemukan di database.';
  END IF;

  -- 4. Gather metadata of source items
  SELECT 
    string_agg(nama_barang, ', '), 
    COUNT(*), 
    COALESCE(SUM(stok), 0)
  INTO 
    v_source_names, 
    v_source_count, 
    v_source_total_stok
  FROM inventory
  WHERE id = ANY(p_source_ids);

  IF v_source_count = 0 THEN
    RAISE EXCEPTION 'Tidak ada barang duplikat yang valid ditemukan.';
  END IF;

  -- 5. Determine if last purchase price (HPP) of target should be updated
  -- Find latest purchase among source items
  SELECT p.tanggal, pi.harga_beli
  INTO v_latest_source_date, v_latest_source_price
  FROM pembelian_items pi
  JOIN pembelian p ON p.id = pi.pembelian_id
  WHERE pi.inventory_id = ANY(p_source_ids)
  ORDER BY p.tanggal DESC, pi.id DESC
  LIMIT 1;

  -- Find latest purchase of target item
  SELECT p.tanggal
  INTO v_latest_target_date
  FROM pembelian_items pi
  JOIN pembelian p ON p.id = pi.pembelian_id
  WHERE pi.inventory_id = p_target_id
  ORDER BY p.tanggal DESC, pi.id DESC
  LIMIT 1;

  -- Update target HPP if source has a more recent purchase
  IF v_latest_source_date IS NOT NULL AND (v_latest_target_date IS NULL OR v_latest_source_date > v_latest_target_date) THEN
    UPDATE inventory 
    SET harga_beli_terakhir = v_latest_source_price,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_target_id;
  END IF;

  -- 6. Reassign all transaction tables from sources to target
  UPDATE pembelian_items SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE penjualan_items SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE penjualan_return_items SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE stock_opname_items SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE stock_adjustments SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE transfer_stok_items SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE pengeluaran_gudang_items SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);
  UPDATE stock_movements SET inventory_id = p_target_id WHERE inventory_id = ANY(p_source_ids);

  -- 7. Consolidate warehouse stocks (inventory_stocks)
  FOR v_stock_rec IN 
    SELECT gudang_id, COALESCE(SUM(stok), 0) AS total_stok
    FROM inventory_stocks
    WHERE inventory_id = ANY(p_source_ids)
    GROUP BY gudang_id
  LOOP
    IF EXISTS (SELECT 1 FROM inventory_stocks WHERE inventory_id = p_target_id AND gudang_id = v_stock_rec.gudang_id) THEN
      UPDATE inventory_stocks
      SET stok = stok + v_stock_rec.total_stok,
          updated_at = NOW()
      WHERE inventory_id = p_target_id AND gudang_id = v_stock_rec.gudang_id;
    ELSE
      INSERT INTO inventory_stocks (inventory_id, gudang_id, stok, min_stok, max_stok, created_at, updated_at)
      VALUES (p_target_id, v_stock_rec.gudang_id, v_stock_rec.total_stok, 0, NULL, NOW(), NOW());
    END IF;
  END LOOP;

  -- Delete source warehouse stocks
  DELETE FROM inventory_stocks WHERE inventory_id = ANY(p_source_ids);

  -- 8. Audit entry in stock_movements if stock was shifted
  IF v_source_total_stok != 0 THEN
    SELECT gudang_id INTO v_primary_gudang
    FROM inventory_stocks
    WHERE inventory_id = p_target_id
    ORDER BY stok DESC
    LIMIT 1;

    IF v_primary_gudang IS NULL THEN
      SELECT id INTO v_primary_gudang FROM gudang WHERE is_default = true LIMIT 1;
    END IF;

    IF v_primary_gudang IS NULL THEN
      SELECT id INTO v_primary_gudang FROM gudang LIMIT 1;
    END IF;

    INSERT INTO stock_movements (inventory_id, tipe, qty, referensi, gudang_id, created_at)
    VALUES (
      p_target_id,
      'IN',
      GREATEST(1, ABS(v_source_total_stok)),
      'Penggabungan (Masuk) dari barang duplikat: ' || substring(v_source_names from 1 for 180),
      v_primary_gudang,
      NOW()
    );
  END IF;

  -- 9. Discard duplicate barcodes (per user instruction)
  DELETE FROM inventory_barcodes WHERE inventory_id = ANY(p_source_ids);

  -- 10. Delete duplicate items from inventory
  DELETE FROM inventory WHERE id = ANY(p_source_ids);

  -- 11. Recalculate total aggregated stock for the target item
  UPDATE inventory
  SET stok = (SELECT COALESCE(SUM(stok), 0) FROM inventory_stocks WHERE inventory_id = p_target_id),
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = p_target_id;

  -- 12. Return result
  RETURN jsonb_build_object(
    'success', true,
    'merged_count', v_source_count,
    'target_id', p_target_id,
    'target_nama', v_target.nama_barang,
    'source_names', v_source_names,
    'transferred_stock', v_source_total_stok
  );
END;
$$;
