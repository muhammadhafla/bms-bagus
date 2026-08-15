-- Migration to fix function_search_path_mutable by adding SET search_path = public

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION public.void_pembelian_return_item(
  p_pembelian_return_item_id uuid,
  p_note text default null,
  p_created_by uuid default auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_now timestamptz := now();
BEGIN
  -- Lock baris untuk update
  SELECT * INTO v_item
  FROM public.pembelian_return_items
  WHERE id = p_pembelian_return_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item pembelian return tidak ditemukan';
  END IF;

  -- Idempotent: jika sudah void, return tanpa error
  IF v_item.voided_at IS NOT NULL THEN
    RETURN v_item.id;
  END IF;

  -- Update status void
  UPDATE public.pembelian_return_items
  SET 
    voided_at = v_now,
    updated_by = p_created_by
  WHERE id = p_pembelian_return_item_id;

  -- Koreksi stok: kembalikan qty ke inventory
  UPDATE public.inventory
  SET 
    stok = stok + v_item.qty,
    updated_at = v_now,
    updated_by = p_created_by
  WHERE id = v_item.inventory_id;

  -- Catat pergerakan stok
  INSERT INTO public.stock_movements (
    inventory_id,
    tipe,
    qty,
    referensi,
    note,
    created_at,
    created_by
  ) VALUES (
    v_item.inventory_id,
    'IN',
    v_item.qty,
    'VOID_RETURN_ITEM:' || v_item.id::text,
    p_note,
    v_now,
    p_created_by
  );

  RETURN v_item.id;
END;
$$;

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION rpc.create_penjualan(
  p_user UUID,
  p_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  v_id := COALESCE(p_id, gen_random_uuid());

  INSERT INTO public.penjualan (
    id,
    status,
    tanggal,
    total,
    created_by
  )
  VALUES (
    v_id,
    'draft',
    CURRENT_DATE,
    0,
    p_user
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION rpc.add_penjualan_items(
  p_penjualan_id UUID,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_inventory_id UUID;
  v_nama_barang TEXT;
  v_qty INT;
  v_harga_jual NUMERIC;
  v_diskon NUMERIC;
  v_harga_final NUMERIC;
  v_cost_at_sale NUMERIC;
  v_current_stok INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Penjualan not found or not in draft status';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_inventory_id := (v_item->>'inventory_id')::UUID;
    v_nama_barang  := v_item->>'nama_barang';
    v_qty          := (v_item->>'qty')::INT;
    v_harga_jual   := (v_item->>'harga_jual')::NUMERIC;
    v_diskon       := COALESCE((v_item->>'diskon')::NUMERIC, 0);
    v_harga_final  := (v_item->>'harga_final')::NUMERIC;
    v_cost_at_sale := COALESCE((v_item->>'cost_at_sale')::NUMERIC, 0);

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'qty harus > 0. inventory_id=%', v_inventory_id;
    END IF;

    IF v_harga_final IS NULL OR v_harga_final < 0 THEN
      RAISE EXCEPTION 'harga_final tidak valid. inventory_id=%', v_inventory_id;
    END IF;

    SELECT stok INTO v_current_stok
    FROM public.inventory
    WHERE id = v_inventory_id;

    IF v_current_stok IS NULL THEN
      RAISE EXCEPTION 'Inventory not found: %', v_inventory_id;
    END IF;

    IF v_current_stok < v_qty THEN
      RAISE EXCEPTION 'Stok tidak cukup. Tersedia: %', v_current_stok;
    END IF;

    INSERT INTO public.penjualan_items (
      id,
      penjualan_id,
      inventory_id,
      nama_barang,
      qty,
      harga_jual,
      diskon,
      harga_final,
      cost_at_sale
    )
    VALUES (
      gen_random_uuid(),
      p_penjualan_id,
      v_inventory_id,
      v_nama_barang,
      v_qty,
      v_harga_jual,
      v_diskon,
      v_harga_final,
      v_cost_at_sale
    );
  END LOOP;

  UPDATE public.penjualan p
  SET total = COALESCE((
    SELECT SUM(qty * harga_final)
    FROM public.penjualan_items
    WHERE penjualan_id = p_penjualan_id
  ), 0)
  WHERE p.id = p_penjualan_id;

END;
$$;

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION rpc.finalize_penjualan(
  p_penjualan_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_total NUMERIC;
BEGIN
  -- validate draft
  IF NOT EXISTS (
    SELECT 1 FROM public.penjualan
    WHERE id = p_penjualan_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'Penjualan tidak ditemukan / bukan draft';
  END IF;

  -- compute total from items (lebih aman)
  SELECT COALESCE(SUM(qty * harga_final), 0)
  INTO v_total
  FROM public.penjualan_items
  WHERE penjualan_id = p_penjualan_id;

  -- validate stock
  FOR v_item IN
    SELECT pi.inventory_id, pi.qty, i.stok
    FROM public.penjualan_items pi
    JOIN public.inventory i ON i.id = pi.inventory_id
    WHERE pi.penjualan_id = p_penjualan_id
  LOOP
    IF v_item.stok < v_item.qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk inventory_id=%. Tersedia: %', v_item.inventory_id, v_item.stok;
    END IF;
  END LOOP;

  -- reduce stock + stock movements
  FOR v_item IN
    SELECT inventory_id, qty
    FROM public.penjualan_items
    WHERE penjualan_id = p_penjualan_id
  LOOP
    UPDATE public.inventory
    SET stok = stok - v_item.qty,
        updated_at = NOW()
    WHERE id = v_item.inventory_id;

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
      v_item.inventory_id,
      'OUT',
      v_item.qty,
      p_penjualan_id::text,
      NOW()
    );
  END LOOP;

  -- update header
  UPDATE public.penjualan
  SET status = 'paid',
      total = v_total,
      paid_at = NOW()
  WHERE id = p_penjualan_id;

  -- kas_log (tipe 'JUAL' pakai v_total)
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_at)
  VALUES (
    gen_random_uuid(),
    'JUAL',
    v_total,
    'CASH', -- Default to CASH since this is legacy
    p_penjualan_id,
    NULL,
    NOW()
  );

  RETURN p_penjualan_id;
END;
$$;

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION rpc.add_kas_log(
    p_tipe TEXT,
    p_jumlah NUMERIC,
    p_catatan TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF p_tipe NOT IN ('SETOR', 'TARIK', 'BUKA_LACI') THEN
        RAISE EXCEPTION 'Invalid tipe: %', p_tipe;
    END IF;
    
    INSERT INTO kas_log (id, tipe, jumlah, catatan, created_by)
    VALUES (gen_random_uuid(), p_tipe, p_jumlah, p_catatan, p_created_by)
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION rpc.pay_penjualan(
  p_penjualan_id uuid,
  p_payment_method text,
  p_cash_amount numeric,
  p_qris_amount numeric,
  p_diskon_nominal numeric DEFAULT NULL::numeric,
  p_diskon_persen numeric DEFAULT NULL::numeric,
  p_kembalian numeric DEFAULT NULL::numeric,
  p_catatan text DEFAULT NULL::text,
  p_created_by uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_subtotal NUMERIC := 0;
  v_diskon_nominal NUMERIC := 0;
  v_diskon_persen NUMERIC := 0;
  v_total NUMERIC := 0;
  v_pay_total NUMERIC := 0;
  v_calc_kembalian NUMERIC := 0;
  v_net_cash NUMERIC := 0;
  v_item RECORD;
BEGIN
  -- validate penjualan exists
  SELECT status INTO v_status
  FROM public.penjualan
  WHERE id = p_penjualan_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Penjualan tidak ditemukan: %', p_penjualan_id;
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Penjualan harus status draft. Saat ini: %', v_status;
  END IF;

  -- compute subtotal from items (harga_final sudah memperhitungkan diskon per item)
  SELECT COALESCE(SUM(qty * harga_final), 0)
  INTO v_subtotal
  FROM public.penjualan_items
  WHERE penjualan_id = p_penjualan_id;

  -- normalize diskon inputs
  v_diskon_nominal := COALESCE(p_diskon_nominal, 0);
  v_diskon_persen := COALESCE(p_diskon_persen, 0);

  IF v_diskon_nominal < 0 THEN
    RAISE EXCEPTION 'diskon_nominal tidak valid (<0)';
  END IF;

  IF v_diskon_persen < 0 THEN
    RAISE EXCEPTION 'diskon_persen tidak valid (<0)';
  END IF;

  -- If both provided and >0, prefer nominal but validate consistency when persen >0
  IF v_diskon_persen > 0 THEN
    -- compute nominal from persen
    IF v_subtotal = 0 THEN
      RAISE EXCEPTION 'subtotal = 0, tidak bisa menerapkan diskon_persen';
    END IF;

    IF p_diskon_nominal IS NULL OR p_diskon_nominal = 0 THEN
      v_diskon_nominal := ROUND(v_subtotal * v_diskon_persen / 100.0, 2);
    ELSE
      -- validate they are approximately consistent (2 decimals)
      IF ROUND(v_subtotal * v_diskon_persen / 100.0, 2) <> ROUND(v_diskon_nominal, 2) THEN
        RAISE EXCEPTION 'diskon_nominal dan diskon_persen tidak konsisten. expected_nominal=%, got=%',
          ROUND(v_subtotal * v_diskon_persen / 100.0, 2), v_diskon_nominal;
      END IF;
    END IF;
  END IF;

  IF v_diskon_nominal > v_subtotal THEN
    RAISE EXCEPTION 'diskon_nominal melebihi subtotal';
  END IF;

  v_total := v_subtotal - v_diskon_nominal;

  -- payments validation
  IF COALESCE(p_cash_amount, 0) < 0 OR COALESCE(p_qris_amount, 0) < 0 THEN
    RAISE EXCEPTION 'cash/qris tidak boleh negatif';
  END IF;

  v_pay_total := COALESCE(p_cash_amount, 0) + COALESCE(p_qris_amount, 0);

  v_calc_kembalian := COALESCE(p_cash_amount, 0) - v_total;

  -- If kembalian is provided, validate; otherwise set it.
  IF p_kembalian IS NULL THEN
    v_calc_kembalian := GREATEST(v_calc_kembalian, 0);
  ELSE
    IF p_kembalian < 0 THEN
      RAISE EXCEPTION 'kembalian tidak boleh negatif';
    END IF;
    IF GREATEST(v_calc_kembalian, 0) <> p_kembalian THEN
      RAISE EXCEPTION 'kembalian tidak konsisten. expected=%, got=%', GREATEST(v_calc_kembalian, 0), p_kembalian;
    END IF;
    v_calc_kembalian := p_kembalian;
  END IF;

  -- Ensure payment covers total
  IF v_pay_total < v_total THEN
    RAISE EXCEPTION 'Pembayaran kurang dari total. pay_total=%, total=%', v_pay_total, v_total;
  END IF;

  -- For non-mixed methods, enforce zeros
  IF upper(p_payment_method) IN ('CASH') THEN
    IF COALESCE(p_qris_amount,0) <> 0 THEN
      RAISE EXCEPTION 'payment_method CASH tapi qris_amount <> 0';
    END IF;
  ELSIF upper(p_payment_method) IN ('QRIS') THEN
    IF COALESCE(p_cash_amount,0) <> 0 THEN
      RAISE EXCEPTION 'payment_method QRIS tapi cash_amount <> 0';
    END IF;
  END IF;

  -- 1) update header fields (diskon global + payment)
  UPDATE public.penjualan
  SET
    payment_method = p_payment_method,
    diskon_nominal = v_diskon_nominal,
    diskon_persen = v_diskon_persen,
    subtotal_sebelum_diskon = v_subtotal,
    cash_amount = COALESCE(p_cash_amount,0),
    qris_amount = COALESCE(p_qris_amount,0),
    kembalian = v_calc_kembalian,
    paid_at = NOW(),
    status = 'paid'
  WHERE id = p_penjualan_id;

  -- 2) validate stock & decrease + movements
  FOR v_item IN
    SELECT pi.inventory_id, pi.qty, i.stok
    FROM public.penjualan_items pi
    JOIN public.inventory i ON i.id = pi.inventory_id
    WHERE pi.penjualan_id = p_penjualan_id
  LOOP
    IF v_item.stok < v_item.qty THEN
      RAISE EXCEPTION 'Stok tidak cukup untuk inventory_id=%. Tersedia: %', v_item.inventory_id, v_item.stok;
    END IF;
  END LOOP;

  FOR v_item IN
    SELECT inventory_id, qty
    FROM public.penjualan_items
    WHERE penjualan_id = p_penjualan_id
  LOOP
    UPDATE public.inventory
    SET stok = stok - v_item.qty,
        updated_at = NOW()
    WHERE id = v_item.inventory_id;

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
      v_item.inventory_id,
      'OUT',
      v_item.qty,
      p_penjualan_id::text,
      NOW()
    );
  END LOOP;

  -- Calculate net cash to drawer for kas_log
  IF upper(p_payment_method) = 'QRIS' THEN
      v_net_cash := 0;
  ELSIF upper(p_payment_method) = 'CASH' THEN
      v_net_cash := v_total;
  ELSIF upper(p_payment_method) = 'CASH_QRIS' THEN
      v_net_cash := v_total - COALESCE(p_qris_amount, 0);
  ELSE
      v_net_cash := v_total;
  END IF;

  -- 3) kas_log
  INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at)
  VALUES (
    gen_random_uuid(),
    'JUAL',
    v_net_cash,
    p_payment_method,
    p_penjualan_id,
    p_catatan,
    COALESCE(p_created_by, NULL),
    NOW()
  );

  RETURN p_penjualan_id;
END;
$$;

-- Source: 20260801134000_add_tier_points.sql
CREATE OR REPLACE FUNCTION public.pay_transaction(
    p_idempotency_key UUID,
    p_items JSONB,
    p_payment_method TEXT,
    p_cash_amount NUMERIC,
    p_qris_amount NUMERIC,
    p_diskon_nominal NUMERIC,
    p_diskon_persen NUMERIC,
    p_catatan TEXT,
    p_created_by UUID,
    p_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_member_id UUID DEFAULT NULL,
    p_points_earned NUMERIC DEFAULT 0,
    p_points_redeemed NUMERIC DEFAULT 0,
    p_discount_member_amount NUMERIC DEFAULT 0,
    p_receipt_sent_via_wa BOOLEAN DEFAULT FALSE
) RETURNS UUID SET search_path = public
AS $$
DECLARE
    v_penjualan_id UUID;
    v_subtotal NUMERIC := 0;
    v_total NUMERIC := 0;
    v_kembalian NUMERIC := 0;
    v_net_cash NUMERIC := 0;
    v_item JSONB;
    v_inventory RECORD;
    v_existing UUID;
BEGIN
    IF p_created_by = '00000000-0000-0000-0000-000000000000'::UUID THEN
        p_created_by := NULL;
    END IF;

    IF p_created_at IS NULL THEN
        p_created_at := NOW();
    END IF;

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
        points_redeemed, discount_member_amount, receipt_sent_via_wa
    )
    VALUES (
        v_penjualan_id, 0, 'paid', p_created_at, p_created_at::DATE, p_payment_method,
        p_diskon_nominal, p_diskon_persen, 0,
        p_cash_amount, p_qris_amount, 0, p_created_by, 
        p_idempotency_key, p_created_at, p_member_id, COALESCE(p_points_earned,0),
        COALESCE(p_points_redeemed,0), COALESCE(p_discount_member_amount,0), COALESCE(p_receipt_sent_via_wa, false)
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_inventory FROM public.inventory 
        WHERE id = (v_item->>'inventory_id')::UUID FOR UPDATE;
        
        IF v_inventory IS NULL THEN
            RAISE EXCEPTION 'Barang tidak ditemukan: %', (v_item->>'inventory_id')::UUID;
        END IF;

        IF v_inventory.stok < (v_item->>'qty')::INT THEN
            RAISE EXCEPTION 'Stok tidak cukup untuk % (Stok: %, Diminta: %)', 
                v_inventory.nama_barang, v_inventory.stok, (v_item->>'qty')::INT;
        END IF;
        
        UPDATE public.inventory 
        SET stok = stok - (v_item->>'qty')::INT,
            updated_at = NOW() 
        WHERE id = v_inventory.id;
        
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
        
        INSERT INTO public.stock_movements (id, inventory_id, tipe, qty, referensi, created_at)
        VALUES (gen_random_uuid(), v_inventory.id, 'OUT', (v_item->>'qty')::INT, v_penjualan_id::TEXT, p_created_at);
        
        v_subtotal := v_subtotal + ((v_item->>'harga_final')::NUMERIC * (v_item->>'qty')::INT);
    END LOOP;
    
    v_total := v_subtotal - p_diskon_nominal - COALESCE(p_discount_member_amount, 0);
    IF p_diskon_persen > 0 THEN
        v_total := v_total * (1 - p_diskon_persen / 100);
    END IF;
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
    
    INSERT INTO public.kas_log (id, tipe, jumlah, payment_method, referensi_id, catatan, created_by, created_at)
    VALUES (v_penjualan_id, 'JUAL', v_net_cash, p_payment_method, v_penjualan_id, p_catatan, p_created_by, p_created_at);
    
    -- Removed manual UPDATE public.members from here to avoid double-counting

    RETURN v_penjualan_id;
END;
$$ LANGUAGE plpgsql;

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION public.create_penjualan_return(
  p_penjualan_id UUID,
  p_tanggal DATE,
  p_note TEXT,
  p_created_by UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
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
BEGIN
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
    gen_random_uuid(),
    p_penjualan_id,
    p_tanggal,
    p_note,
    p_created_by
  )
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_penjualan_item_id := (v_item->>'penjualan_item_id')::UUID;
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

    -- ambil inventory_id dan qty dari penjualan_items
    SELECT inventory_id, qty INTO v_inventory_id, v_original_qty
    FROM public.penjualan_items
    WHERE id = v_penjualan_item_id;

    SELECT COALESCE(SUM(pri.qty), 0) INTO v_return_qty
    FROM public.penjualan_return pr
    JOIN public.penjualan_return_items pri
      ON pri.penjualan_return_id = pr.id
    WHERE pr.penjualan_id = p_penjualan_id
      AND pri.penjualan_item_id = v_penjualan_item_id;

    IF v_original_qty IS NULL THEN
      RAISE EXCEPTION 'Item tidak ada di transaksi original';
    END IF;

    IF v_qty > (v_original_qty - v_return_qty) THEN
      RAISE EXCEPTION 'Qty return melebihi yang bisa dikembalikan. Maks: %', v_original_qty - v_return_qty;
    END IF;

    -- Insert return item (ambil data nama_barang & inventory_id dari penjualan_items agar konsisten)
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

    -- stock movement IN (pakai qty & referensi)
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
  END LOOP;

  -- kas log
  INSERT INTO public.kas_log (id, tipe, jumlah, referensi_id, catatan, created_at)
  VALUES (
    gen_random_uuid(),
    'RETURN',
    (SELECT COALESCE(SUM(qty * harga_final), 0)
     FROM public.penjualan_return_items
     WHERE penjualan_return_id = v_return_id),
    v_return_id,
    p_note,
    NOW()
  );

  RETURN v_return_id;
END;
$$;

-- Source: 20260101000002_core_functions.sql
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
SET search_path = public
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

-- Source: 20260101000002_core_functions.sql
CREATE OR REPLACE FUNCTION public.sync_last_sign_in_at()
RETURNS TRIGGER SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Source: 20260101000003_core_realtime_and_seed.sql
CREATE OR REPLACE FUNCTION resolve_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE username = p_username LIMIT 1;
  RETURN v_email;
END;
$$;

-- Source: 20260801134000_add_tier_points.sql
CREATE OR REPLACE FUNCTION update_member_points()
RETURNS TRIGGER SET search_path = public
AS $$
BEGIN
    IF NEW.member_id IS NOT NULL THEN
        UPDATE public.members
        SET 
            points = points + COALESCE(NEW.points_earned, 0) - COALESCE(NEW.points_redeemed, 0),
            tier_points = tier_points + COALESCE(NEW.points_earned, 0),
            updated_at = NOW()
        WHERE id = NEW.member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Source: 20260801134000_add_tier_points.sql
CREATE OR REPLACE FUNCTION reverse_member_points_on_return()
RETURNS TRIGGER SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_earned NUMERIC;
    v_redeemed NUMERIC;
BEGIN
    SELECT member_id, points_earned, points_redeemed
    INTO v_member_id, v_earned, v_redeemed
    FROM public.penjualan
    WHERE id = NEW.penjualan_id;

    IF v_member_id IS NOT NULL THEN
        UPDATE public.members
        SET 
            points = points - COALESCE(v_earned, 0) + COALESCE(v_redeemed, 0),
            tier_points = tier_points - COALESCE(v_earned, 0),
            updated_at = NOW()
        WHERE id = v_member_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Source: 20260731182500_fix_dashboard_and_kas.sql
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_inventory_value NUMERIC,
    total_items BIGINT,
    low_stock_items BIGINT
) LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(stok * harga_beli_terakhir), 0) AS total_inventory_value,
        COUNT(id) AS total_items,
        COUNT(id) FILTER (WHERE stok <= minimum_stock) AS low_stock_items
    FROM public.inventory;
END;
$$;

-- Source: 20260731182500_fix_dashboard_and_kas.sql
CREATE OR REPLACE FUNCTION get_low_stock_items(p_search TEXT DEFAULT NULL)
RETURNS SETOF public.inventory LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.inventory
    WHERE stok <= minimum_stock
    AND (p_search IS NULL OR nama_barang ILIKE '%' || p_search || '%');
END;
$$;

-- Source: 20260801140500_shopee_tier_eval.sql
CREATE OR REPLACE FUNCTION check_and_update_member_tier()
RETURNS TRIGGER SET search_path = public
AS $$
DECLARE
    v_current_min_points NUMERIC;
    new_tier_id UUID;
    v_new_min_points NUMERIC;
BEGIN
    -- Only run this if tier_points have actually changed
    IF TG_OP = 'UPDATE' AND NEW.tier_points = OLD.tier_points THEN
        RETURN NEW;
    END IF;

    -- Get the min_points required for their current tier (if they have one)
    IF OLD.tier_id IS NOT NULL THEN
        SELECT min_points_required INTO v_current_min_points
        FROM public.member_tiers WHERE id = OLD.tier_id;
    END IF;

    -- Find the highest tier they qualify for based on their new tier_points
    SELECT id, min_points_required INTO new_tier_id, v_new_min_points
    FROM public.member_tiers
    WHERE min_points_required <= NEW.tier_points
    ORDER BY min_points_required DESC
    LIMIT 1;

    -- ONLY update if it's an UPGRADE (i.e. new tier requires MORE points than current tier)
    -- Or if they didn't have a tier before
    IF new_tier_id IS NOT NULL AND NEW.tier_id IS DISTINCT FROM new_tier_id THEN
        IF v_current_min_points IS NULL OR v_new_min_points > v_current_min_points THEN
            NEW.tier_id := new_tier_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Source: 20260801140500_shopee_tier_eval.sql
CREATE OR REPLACE FUNCTION public.reset_member_tier_points()
RETURNS void SET search_path = public
AS $$
BEGIN
    -- Evaluasi tier baru berdasarkan tier_points yang terkumpul sebelum reset
    UPDATE public.members m
    SET 
        tier_id = COALESCE(
            (SELECT id FROM public.member_tiers 
             WHERE min_points_required <= m.tier_points 
             ORDER BY min_points_required DESC 
             LIMIT 1),
            m.tier_id
        ),
        tier_points = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Source: 20260801134500_cron_resets.sql
CREATE OR REPLACE FUNCTION public.reset_member_points()
RETURNS void SET search_path = public
AS $$
BEGIN
    -- Reset points to 0 for all members
    UPDATE public.members
    SET points = 0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Source: 20260808103000_toggle_discontinued.sql
CREATE OR REPLACE FUNCTION toggle_discontinued(p_id uuid, p_user uuid)
RETURNS SETOF inventory SET search_path = public
AS $$
  UPDATE inventory
  SET is_discontinued = NOT is_discontinued,
      discontinued_at = CASE WHEN NOT is_discontinued THEN NOW() ELSE NULL END,
      discontinued_by = CASE WHEN NOT is_discontinued THEN p_user ELSE NULL END,
      updated_by = p_user,
      updated_at = NOW()
  WHERE id = p_id
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

