-- ====================================================================
-- Migration: Fix Pembelian Harga Jual Sync
-- ====================================================================

-- 1. PERBAIKI RPC: public.tambah_pembelian_batch
CREATE OR REPLACE FUNCTION public.tambah_pembelian_batch(
  p_items jsonb,
  p_supplier_id uuid,
  p_tanggal date,
  p_user uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid,
  p_nomor_nota text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_pembelian_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_subtotal NUMERIC;
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

  INSERT INTO pembelian (
    supplier_id,
    tanggal,
    created_by,
    supplier_nama,
    idempotency_key,
    nomor_nota
  )
  SELECT 
    p_supplier_id,
    p_tanggal,
    p_user,
    COALESCE((SELECT nama FROM supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
    p_idempotency_key,
    p_nomor_nota
  RETURNING id INTO v_pembelian_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_id := (
      SELECT id FROM inventory 
      WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang')
      LIMIT 1
    );

    IF v_inventory_id IS NOT NULL THEN
      IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
        RAISE EXCEPTION 'harga tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;
      IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
        RAISE EXCEPTION 'qty harus > 0 untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;

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
      IF v_item->>'nama_barang' IS NULL OR TRIM(v_item->>'nama_barang') = '' THEN
        RAISE EXCEPTION 'nama_barang tidak boleh kosong';
      END IF;
      IF (v_item->>'harga') IS NULL OR (v_item->>'harga')::NUMERIC IS NULL OR (v_item->>'harga')::NUMERIC < 0 THEN
        RAISE EXCEPTION 'harga tidak valid untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;
      IF (v_item->>'qty') IS NULL OR (v_item->>'qty')::INTEGER IS NULL OR (v_item->>'qty')::INTEGER <= 0 THEN
        RAISE EXCEPTION 'qty harus > 0 untuk item: %', COALESCE(v_item->>'nama_barang', 'unknown');
      END IF;

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
    v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);
    v_harga_final := v_harga_beli - v_diskon;
    v_subtotal := v_harga_final * v_qty;

    INSERT INTO pembelian_items (
      pembelian_id,
      inventory_id,
      nama_barang,
      qty,
      harga_beli,
      diskon,
      harga_final
    )
    VALUES (
      v_pembelian_id,
      v_inventory_id,
      v_item->>'nama_barang',
      v_qty,
      v_harga_beli,
      v_diskon,
      v_harga_final
    );

    UPDATE inventory 
    SET 
      harga_beli_terakhir = v_harga_beli,
      harga_jual = COALESCE((v_item->>'harga_jual')::NUMERIC, harga_jual),
      updated_by = p_user,
      updated_at = NOW()
    WHERE id = v_inventory_id;

    INSERT INTO stock_movements (inventory_id, tipe, qty, referensi)
    VALUES (v_inventory_id, 'IN', v_qty, v_pembelian_id::TEXT);

    v_total_sistem := v_total_sistem + v_subtotal;
  END LOOP;

  UPDATE pembelian SET total_sistem = v_total_sistem WHERE id = v_pembelian_id;

  RETURN v_pembelian_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.tambah_pembelian_batch TO service_role;


-- 2. PERBAIKI RPC: public.update_pembelian_batch
CREATE OR REPLACE FUNCTION public.update_pembelian_batch(
  p_pembelian_id uuid,
  p_items jsonb,
  p_supplier_id uuid,
  p_tanggal date,
  p_user uuid,
  p_nomor_nota text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_item JSONB;
  v_inventory_id UUID;
  v_total_sistem NUMERIC := 0;
  v_harga_beli NUMERIC;
  v_qty INTEGER;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_subtotal NUMERIC;
  
  v_existing_item RECORD;
  v_found BOOLEAN;
  v_stock_opname_id UUID := NULL;
  v_current_system_stock INTEGER;
  v_qty_diff INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND 'admin' = ANY(roles)) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin yang dapat mengubah transaksi pembelian.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items harus berupa JSON array';
  END IF;

  PERFORM id FROM pembelian WHERE id = p_pembelian_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi pembelian tidak ditemukan.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    FOR v_existing_item IN SELECT inventory_id, qty, nama_barang FROM pembelian_items WHERE pembelian_id = p_pembelian_id
    LOOP
      SELECT stok INTO v_current_system_stock FROM inventory WHERE id = v_existing_item.inventory_id;
      
      IF v_stock_opname_id IS NULL THEN
        SELECT id INTO v_stock_opname_id FROM stock_opname WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = p_user LIMIT 1;
        IF v_stock_opname_id IS NULL THEN
          INSERT INTO stock_opname (opname_date, status, created_by) VALUES (CURRENT_DATE, 'draft', p_user) RETURNING id INTO v_stock_opname_id;
        END IF;
      END IF;

      INSERT INTO stock_opname_items (stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note)
      VALUES (v_stock_opname_id, v_existing_item.inventory_id, v_current_system_stock, v_current_system_stock - v_existing_item.qty, -v_existing_item.qty, 'lainnya', 'Pembatalan Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')');
    END LOOP;
    
    DELETE FROM pembelian WHERE id = p_pembelian_id;
    RETURN jsonb_build_object('success', true, 'is_deleted', true);
  END IF;

  UPDATE pembelian
  SET supplier_id = p_supplier_id,
      supplier_nama = COALESCE((SELECT nama FROM supplier WHERE id = p_supplier_id), 'Tanpa Supplier'),
      tanggal = p_tanggal,
      nomor_nota = p_nomor_nota
  WHERE id = p_pembelian_id;

  FOR v_existing_item IN SELECT id, inventory_id, qty, nama_barang, harga_beli, diskon, harga_final FROM pembelian_items WHERE pembelian_id = p_pembelian_id
  LOOP
    v_found := false;
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      IF (v_item->>'inventory_id' IS NOT NULL AND (v_item->>'inventory_id')::UUID = v_existing_item.inventory_id) OR 
         (LOWER(v_item->>'nama_barang') = LOWER(v_existing_item.nama_barang)) THEN
        
        v_found := true;
        v_qty := (v_item->>'qty')::INTEGER;
        v_harga_beli := (v_item->>'harga')::NUMERIC;
        v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);
        v_harga_final := v_harga_beli - v_diskon;
        v_qty_diff := v_qty - v_existing_item.qty;
        
        UPDATE pembelian_items
        SET qty = v_qty,
            harga_beli = v_harga_beli,
            diskon = v_diskon,
            harga_final = v_harga_final
        WHERE id = v_existing_item.id;
        
        UPDATE inventory
        SET harga_beli_terakhir = v_harga_beli,
            harga_jual = COALESCE((v_item->>'harga_jual')::NUMERIC, harga_jual),
            updated_by = p_user,
            updated_at = NOW()
        WHERE id = v_existing_item.inventory_id;
        
        IF v_qty_diff <> 0 THEN
          SELECT stok INTO v_current_system_stock FROM inventory WHERE id = v_existing_item.inventory_id;
          
          IF v_stock_opname_id IS NULL THEN
            SELECT id INTO v_stock_opname_id FROM stock_opname WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = p_user LIMIT 1;
            IF v_stock_opname_id IS NULL THEN
              INSERT INTO stock_opname (opname_date, status, created_by) VALUES (CURRENT_DATE, 'draft', p_user) RETURNING id INTO v_stock_opname_id;
            END IF;
          END IF;

          INSERT INTO stock_opname_items (stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note)
          VALUES (v_stock_opname_id, v_existing_item.inventory_id, v_current_system_stock, v_current_system_stock + v_qty_diff, v_qty_diff, 'lainnya', 'Koreksi Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')');
        END IF;
        
        EXIT; 
      END IF;
    END LOOP;

    IF NOT v_found THEN
      SELECT stok INTO v_current_system_stock FROM inventory WHERE id = v_existing_item.inventory_id;
      
      IF v_stock_opname_id IS NULL THEN
        SELECT id INTO v_stock_opname_id FROM stock_opname WHERE opname_date = CURRENT_DATE AND status = 'draft' AND created_by = p_user LIMIT 1;
        IF v_stock_opname_id IS NULL THEN
          INSERT INTO stock_opname (opname_date, status, created_by) VALUES (CURRENT_DATE, 'draft', p_user) RETURNING id INTO v_stock_opname_id;
        END IF;
      END IF;

      INSERT INTO stock_opname_items (stock_opname_id, inventory_id, system_stock, physical_stock, difference, reason, note)
      VALUES (v_stock_opname_id, v_existing_item.inventory_id, v_current_system_stock, v_current_system_stock - v_existing_item.qty, -v_existing_item.qty, 'lainnya', 'Koreksi Hapus Item Transaksi Pembelian (No. Nota: ' || COALESCE(p_nomor_nota, 'Tidak ada') || ')');
      
      DELETE FROM pembelian_items WHERE id = v_existing_item.id;
    END IF;
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_found := false;
    
    FOR v_existing_item IN SELECT inventory_id, nama_barang FROM pembelian_items WHERE pembelian_id = p_pembelian_id
    LOOP
      IF (v_item->>'inventory_id' IS NOT NULL AND (v_item->>'inventory_id')::UUID = v_existing_item.inventory_id) OR 
         (LOWER(v_item->>'nama_barang') = LOWER(v_existing_item.nama_barang)) THEN
        v_found := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF NOT v_found THEN
      IF v_item->>'inventory_id' IS NOT NULL THEN
        v_inventory_id := (v_item->>'inventory_id')::UUID;
      ELSE
        v_inventory_id := (SELECT id FROM inventory WHERE LOWER(nama_barang) = LOWER(v_item->>'nama_barang') LIMIT 1);
      END IF;
      
      IF v_inventory_id IS NOT NULL THEN
        UPDATE inventory 
        SET is_discontinued = false, discontinued_at = NULL, discontinued_by = NULL, updated_at = NOW(), updated_by = p_user
        WHERE id = v_inventory_id AND is_discontinued = true;
      ELSE
        INSERT INTO inventory (nama_barang, slug, harga_beli_terakhir, harga_jual, created_by, stok)
        VALUES (
          v_item->>'nama_barang',
          LOWER(REPLACE(REPLACE(v_item->>'nama_barang', ' ', '-'), '_', '-')) || '-' || EXTRACT(EPOCH FROM NOW())::TEXT,
          (v_item->>'harga')::NUMERIC,
          ((v_item->>'harga')::NUMERIC * 1.2),
          p_user,
          0
        ) RETURNING id INTO v_inventory_id;
      END IF;
      
      v_harga_beli := (v_item->>'harga')::NUMERIC;
      v_qty := (v_item->>'qty')::INTEGER;
      v_diskon := COALESCE((v_item->>'diskon')::NUMERIC, 0);
      v_harga_final := v_harga_beli - v_diskon;
      
      INSERT INTO pembelian_items (pembelian_id, inventory_id, nama_barang, qty, harga_beli, diskon, harga_final)
      VALUES (p_pembelian_id, v_inventory_id, v_item->>'nama_barang', v_qty, v_harga_beli, v_diskon, v_harga_final);
      
      UPDATE inventory 
      SET stok = COALESCE(stok, 0) + v_qty,
          harga_beli_terakhir = v_harga_beli,
          harga_jual = COALESCE((v_item->>'harga_jual')::NUMERIC, harga_jual),
          updated_by = p_user,
          updated_at = NOW()
      WHERE id = v_inventory_id;

      INSERT INTO stock_movements (inventory_id, tipe, qty, referensi)
      VALUES (v_inventory_id, 'IN', v_qty, p_pembelian_id::TEXT);
      
    END IF;
  END LOOP;
  
  SELECT COALESCE(SUM(harga_final * qty), 0) INTO v_total_sistem FROM pembelian_items WHERE pembelian_id = p_pembelian_id;
  
  UPDATE pembelian SET total_sistem = v_total_sistem WHERE id = p_pembelian_id;

  RETURN jsonb_build_object('success', true, 'pembelian_id', p_pembelian_id, 'is_deleted', false);
END;
$function$;
