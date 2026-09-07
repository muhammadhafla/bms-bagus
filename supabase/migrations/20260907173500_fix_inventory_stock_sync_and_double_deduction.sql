-- ====================================================================
-- Migration: 20260907173500_fix_inventory_stock_sync_and_double_deduction.sql
-- Description: 
--   1. Perbaiki public.pay_transaction: Hapus manual UPDATE inventory (cegah double deduction).
--   2. Perbaiki public.tambah_pembelian_batch: Hapus manual UPDATE inventory.stok (cegah double addition).
--   3. Perbaiki public.create_penjualan_return: Hapus manual UPDATE inventory.stok saat gudang_id ada.
--   4. Perbaiki public.fn_apply_penjualan_stock: Sinkronkan ke inventory_stocks saat status draft -> paid.
--   5. Rekonsiliasi data: Selaraskan inventory.stok = SUM(inventory_stocks.stok) untuk semua item.
-- ====================================================================

-- 1. PERBAIKI RPC: public.pay_transaction
CREATE OR REPLACE FUNCTION public.pay_transaction(
  p_idempotency_key uuid,
  p_items jsonb,
  p_payment_method text,
  p_cash_amount numeric,
  p_qris_amount numeric,
  p_diskon_nominal numeric,
  p_diskon_persen numeric,
  p_catatan text,
  p_created_by uuid,
  p_created_at timestamp with time zone DEFAULT now(),
  p_member_id uuid DEFAULT NULL::uuid,
  p_points_earned numeric DEFAULT 0,
  p_points_redeemed numeric DEFAULT 0,
  p_discount_member_amount numeric DEFAULT 0,
  p_receipt_sent_via_wa boolean DEFAULT false,
  p_gudang_id uuid DEFAULT NULL::uuid,
  p_shift_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_penjualan_id UUID;
    v_subtotal NUMERIC := 0;
    v_total NUMERIC := 0;
    v_kembalian NUMERIC := 0;
    v_net_cash NUMERIC := 0;
    v_item JSONB;
    v_inventory RECORD;
    v_existing UUID;
    v_gudang_id UUID;
    v_shift_id UUID;
    v_stock_exists BOOLEAN;
    v_current_stock INT;
BEGIN
    IF p_created_by = '00000000-0000-0000-0000-000000000000'::UUID THEN
        p_created_by := NULL;
    END IF;

    IF p_created_at IS NULL THEN
        p_created_at := NOW();
    END IF;

    -- Resolve gudang_id fallback if null
    v_gudang_id := p_gudang_id;
    IF v_gudang_id IS NULL THEN
        SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
        IF v_gudang_id IS NULL THEN
            SELECT id INTO v_gudang_id FROM public.gudang ORDER BY created_at ASC LIMIT 1;
        END IF;
    END IF;

    -- Resolve shift_id safely to avoid foreign key violation (code 23503)
    v_shift_id := p_shift_id;
    IF v_shift_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
            IF p_created_by IS NOT NULL THEN
                INSERT INTO public.shift_sessions (
                    id, kasir_id, kasir_name, gudang_id, start_time, opening_cash, status, created_at
                ) VALUES (
                    v_shift_id,
                    p_created_by,
                    COALESCE((SELECT nama FROM public.profiles WHERE id = p_created_by), 'Kasir'),
                    v_gudang_id,
                    p_created_at,
                    0,
                    'OPEN',
                    p_created_at
                ) ON CONFLICT (id) DO NOTHING;
            ELSE
                v_shift_id := NULL;
            END IF;
        END IF;

        -- Fallback guard: if shift session still does not exist, fallback to NULL
        IF v_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shift_sessions WHERE id = v_shift_id) THEN
            v_shift_id := NULL;
        END IF;
    END IF;

    -- Idempotency check
    SELECT id INTO v_existing FROM public.penjualan 
    WHERE idempotency_key = p_idempotency_key AND status = 'paid';
    IF v_existing IS NOT NULL THEN
        RETURN v_existing; 
    END IF;

    v_penjualan_id := p_idempotency_key;
    
    INSERT INTO public.penjualan (
        id, total, status, paid_at, tanggal, payment_method,
        diskon_nominal, diskon_persen, subtotal_sebelum_diskon,
        cash_amount, qris_amount, kembalian, created_by, 
        idempotency_key, created_at, member_id, points_earned,
        points_redeemed, discount_member_amount, receipt_sent_via_wa,
        gudang_id, shift_id
    )
    VALUES (
        v_penjualan_id, 0, 'paid', p_created_at, p_created_at::DATE, p_payment_method,
        p_diskon_nominal, p_diskon_persen, 0,
        p_cash_amount, p_qris_amount, 0, p_created_by, 
        p_idempotency_key, p_created_at, p_member_id, COALESCE(p_points_earned,0),
        COALESCE(p_points_redeemed,0), COALESCE(p_discount_member_amount,0), COALESCE(p_receipt_sent_via_wa, false),
        v_gudang_id, v_shift_id
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_inventory FROM public.inventory 
        WHERE id = (v_item->>'inventory_id')::UUID FOR UPDATE;
        
        IF v_inventory IS NULL THEN
            RAISE EXCEPTION 'Barang tidak ditemukan: %', (v_item->>'inventory_id')::UUID;
        END IF;

        -- Check warehouse stock if inventory_stocks table exists and has row
        IF v_gudang_id IS NOT NULL THEN
            SELECT EXISTS(SELECT 1 FROM public.inventory_stocks WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id) INTO v_stock_exists;
            IF v_stock_exists THEN
                SELECT stok INTO v_current_stock FROM public.inventory_stocks WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id FOR UPDATE;
                IF v_current_stock < (v_item->>'qty')::INT THEN
                    RAISE EXCEPTION 'Stok di gudang tidak cukup untuk % (Stok Gudang: %, Diminta: %)', 
                        v_inventory.nama_barang, v_current_stock, (v_item->>'qty')::INT;
                END IF;
                -- Update stok gudang (trigger trg_sync_inventory_global_stock akan otomatis mengupdate public.inventory.stok)
                UPDATE public.inventory_stocks
                SET stok = stok - (v_item->>'qty')::INT,
                    updated_at = NOW()
                WHERE inventory_id = v_inventory.id AND gudang_id = v_gudang_id;
            ELSE
                -- Create record in inventory_stocks with initial remaining
                INSERT INTO public.inventory_stocks (id, inventory_id, gudang_id, stok, created_at, updated_at)
                VALUES (gen_random_uuid(), v_inventory.id, v_gudang_id, GREATEST(v_inventory.stok - (v_item->>'qty')::INT, 0), NOW(), NOW());
            END IF;
        ELSE
            -- Fallback jika gudang_id tidak dispesifikasikan sama sekali
            UPDATE public.inventory 
            SET stok = GREATEST(stok - (v_item->>'qty')::INT, 0),
                updated_at = NOW() 
            WHERE id = v_inventory.id;
        END IF;
        
        INSERT INTO public.penjualan_items (
            id, penjualan_id, inventory_id, nama_barang, qty, 
            harga_jual, diskon, harga_final, cost_at_sale
        )
        VALUES (
            gen_random_uuid(), v_penjualan_id, v_inventory.id, v_inventory.nama_barang,
            (v_item->>'qty')::INT, (v_item->>'harga_jual')::NUMERIC,
            COALESCE((v_item->>'diskon')::NUMERIC, 0),
            (v_item->>'harga_final')::NUMERIC,
            COALESCE(v_inventory.harga_beli_terakhir, 0)
        );
        
        INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, gudang_id, created_at)
        VALUES (gen_random_uuid(), v_inventory.id, 'OUT', (v_item->>'qty')::INT, v_penjualan_id::TEXT, v_gudang_id, p_created_at);
        
        v_subtotal := v_subtotal + ((v_item->>'harga_final')::NUMERIC * (v_item->>'qty')::INT);
    END LOOP;
    
    v_total := v_subtotal - COALESCE(p_diskon_nominal, 0) - (v_subtotal * COALESCE(p_diskon_persen, 0) / 100) - COALESCE(p_discount_member_amount, 0) - COALESCE(p_points_redeemed, 0);
    v_total := GREATEST(v_total, 0);
    
    v_kembalian := (p_cash_amount + p_qris_amount) - v_total;
    
    IF (p_cash_amount + p_qris_amount) < v_total THEN
        RAISE EXCEPTION 'Pembayaran kurang: total=%, dibayar=%', 
            v_total, p_cash_amount + p_qris_amount;
    END IF;
    
    UPDATE public.penjualan
    SET 
        total = v_total,
        subtotal_sebelum_diskon = v_subtotal,
        kembalian = v_kembalian
    WHERE id = v_penjualan_id;
    
    IF upper(p_payment_method) = 'QRIS' THEN
        v_net_cash := 0;
    ELSIF upper(p_payment_method) = 'CASH' THEN
        v_net_cash := v_total;
    ELSIF upper(p_payment_method) = 'CASH_QRIS' THEN
        v_net_cash := v_total - p_qris_amount;
    ELSE
        v_net_cash := v_total;
    END IF;
    
    -- Menambahkan v_gudang_id secara eksplisit ke kas_log
    INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id)
    VALUES (v_penjualan_id, 'JUAL', v_net_cash, p_payment_method, v_penjualan_id, p_catatan, p_created_by, p_created_at, v_gudang_id);
    
    RETURN v_penjualan_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.pay_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_transaction TO service_role;


-- 2. PERBAIKI RPC: public.tambah_pembelian_batch
-- Hapus manual UPDATE inventory SET stok = stok + v_qty karena trigger sync_pembelian_item_to_gudang
-- telah mengupdate inventory_stocks dan trigger trg_sync_inventory_global_stock telah mengupdate inventory.stok
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

    -- Insert ke pembelian_items akan memicu trigger sync_pembelian_item_to_gudang
    -- yang meng-UPSERT inventory_stocks, dan otomatis memicu trg_sync_inventory_global_stock
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

    -- Hanya update harga beli terakhir & metadata audit, JANGAN tambah stok lagi (cegah double addition)
    UPDATE inventory 
    SET 
      harga_beli_terakhir = v_harga_beli,
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


-- 3. PERBAIKI RPC: public.create_penjualan_return
CREATE OR REPLACE FUNCTION public.create_penjualan_return(
  p_penjualan_id UUID,
  p_tanggal DATE,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB,
  p_idempotency_key UUID DEFAULT NULL::UUID,
  p_gudang_id UUID DEFAULT NULL::UUID
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
  v_gudang_id UUID;
  v_stock_exists BOOLEAN;
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

  v_return_id := COALESCE(p_idempotency_key, gen_random_uuid());

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

    -- Restore stock in inventory_stocks for that gudang
    -- (Trigger trg_sync_inventory_global_stock akan otomatis menyinkronkan public.inventory.stok)
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

  -- Kas log for return with explicit gudang_id
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at, gudang_id)
  VALUES (gen_random_uuid(), 'RETURN', v_total_refund, 'CASH', v_return_id, COALESCE(p_note, 'Retur Penjualan'), p_created_by, NOW(), v_gudang_id);

  RETURN v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_penjualan_return TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_penjualan_return TO service_role;


-- 4. PERBAIKI public.fn_apply_penjualan_stock (PENGAMAN JIKA DRAFT -> PAID DIUPDATE LANGSUNG)
CREATE OR REPLACE FUNCTION public.fn_apply_penjualan_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status text;
  v_new_status text;
  v_qty integer;
  v_inventory_id uuid;
  v_gudang_id uuid;
BEGIN
  v_old_status := COALESCE(OLD.status,'draft');
  v_new_status := COALESCE(NEW.status,'draft');

  -- Paid -> apply OUT to stock for each item jika status baru saja berubah menjadi 'paid'
  IF v_old_status IS DISTINCT FROM v_new_status AND v_new_status = 'paid' THEN
    v_gudang_id := NEW.gudang_id;
    IF v_gudang_id IS NULL THEN
      SELECT id INTO v_gudang_id FROM public.gudang WHERE is_default = true LIMIT 1;
    END IF;

    FOR v_inventory_id, v_qty IN
      SELECT pi.inventory_id, pi.qty
      FROM public.penjualan_items pi
      WHERE pi.penjualan_id = NEW.id
    LOOP
      IF v_gudang_id IS NOT NULL THEN
        UPDATE public.inventory_stocks
        SET stok = GREATEST(stok - v_qty, 0),
            updated_at = NOW()
        WHERE inventory_id = v_inventory_id AND gudang_id = v_gudang_id;
      ELSE
        UPDATE public.inventory
        SET stok = GREATEST(COALESCE(stok,0) - v_qty, 0),
            updated_at = NOW()
        WHERE id = v_inventory_id;
      END IF;

      -- log movement
      INSERT INTO public.stock_movements (inventory_id, tipe, qty, referensi, gudang_id, created_at)
      VALUES (v_inventory_id, 'OUT', v_qty, 'penjualan:' || NEW.id, v_gudang_id, NOW());
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;


-- 5. REKONSILIASI DATA STOK GLOBAL (ONE-TIME REPAIR)
-- Menyelaraskan seluruh master stok (public.inventory.stok) agar sama persis
-- dengan jumlah agregat seluruh stok fisik gudang (SUM(inventory_stocks.stok))
UPDATE public.inventory i
SET stok = COALESCE(sub.total_stok, 0),
    updated_at = NOW()
FROM (
  SELECT inventory_id, SUM(stok) as total_stok
  FROM public.inventory_stocks
  GROUP BY inventory_id
) sub
WHERE i.id = sub.inventory_id AND i.stok != sub.total_stok;
